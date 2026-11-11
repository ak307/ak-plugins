"""Decision probes: quick, repeatable checks of what the UI skills decide.

    uv run -q --no-project --with pyyaml python evals/probe.py                 # every probe, 3 runs each
    uv run -q --no-project --with pyyaml python evals/probe.py --only detail-surface --runs 3
    uv run -q --no-project --with pyyaml python evals/probe.py --area motion --runs 2
    uv run -q --no-project --with pyyaml python evals/probe.py --list

Each run is a real Claude Code session with this repo's plugin that writes the
build sheet in its reply and stops before any code (a few minutes, a small
part of a full build). A grader session then marks each rubric line pass or
fail with evidence. Repeating each probe shows whether a decision is reliable,
not a one-off. Full builds (run.py) are kept for releases; surface builds
(surface.py) check that a decision also looks and moves right.
Results: evals/results/probes-<timestamp>/ (summary.md, results.json).
"""
from __future__ import annotations

import argparse
import datetime
import json
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import PLUGIN, empty_plugin_dir, run_claude, workspace_from  # noqa: E402

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results"
PROBE_SUFFIX = (" — Planning step only: work as you normally would (load the skills you need, read the project), "
                "then reply with the complete build sheet for this task (component plan, then every row for each "
                "surface). Don't create or edit any files and don't write UI code; the build happens later.")
GRADER_MODEL = "sonnet"


def load_probes() -> list[dict]:
    return yaml.safe_load((HERE / "probes.yaml").read_text())["probes"]


def make_workspace(probe: dict, root: Path) -> Path:
    workspace = root / "workspace"
    if probe.get("files"):
        workspace.mkdir(parents=True)
        for name, content in probe["files"].items():
            (workspace / name).parent.mkdir(parents=True, exist_ok=True)
            (workspace / name).write_text(content)
        return workspace_from_existing(workspace)
    return workspace_from(probe.get("fixture"), workspace)


def workspace_from_existing(workspace: Path) -> Path:
    for command in (["git", "init", "-q"], ["git", "add", "-A"],
                    ["git", "-c", "user.name=eval", "-c", "user.email=eval@example.com", "commit", "-qm", "baseline"]):
        subprocess.run(command, cwd=workspace, capture_output=True)
    return workspace


def grade(probe: dict, reply: str) -> list[dict]:
    """One grader session (no plugin, no tools) marks each rubric line with evidence."""
    rubric = "\n".join(f"{index + 1}. {line}" for index, line in enumerate(probe["rubric"]))
    prompt = (
        "You grade a UI build sheet strictly against a rubric. A line passes only when the sheet clearly and "
        "specifically does it — vague intentions ('nice animations', 'handle errors') fail. Quote the evidence.\n\n"
        f"Task given to the designer:\n{probe['prompt']}\n\nRubric:\n{rubric}\n\n"
        f"Build sheet:\n<<<\n{reply[:60000]}\n>>>\n\n"
        'Answer with JSON only: [{"line": 1, "pass": true, "evidence": "short quote or why it fails"}, ...]')
    command = ["claude", "-p", prompt, "--model", GRADER_MODEL, "--max-turns", "1", "--tools", "",
               "--plugin-dir", str(empty_plugin_dir())]
    marks: list = []
    for _ in range(2):  # one retry: a grader that answers in prose would count as a fail of the skill
        output = subprocess.run(command, capture_output=True, text=True, timeout=600, stdin=subprocess.DEVNULL).stdout
        match = re.search(r"\[.*\]", output, re.S)
        try:
            marks = json.loads(match.group(0)) if match else []
        except json.JSONDecodeError:
            marks = []
        if marks:
            break
    by_line = {mark.get("line"): mark for mark in marks if isinstance(mark, dict)}
    return [{"criterion": line, "passed": bool(by_line.get(index + 1, {}).get("pass")),
             "evidence": str(by_line.get(index + 1, {}).get("evidence", "grader gave no mark"))[:300]}
            for index, line in enumerate(probe["rubric"])]


def run_probe(probe: dict, attempt: int, plugin: Path) -> dict:
    root = Path(tempfile.mkdtemp(prefix=f"arkar-probe-{probe['id']}-{attempt}-"))
    workspace = make_workspace(probe, root)
    run = run_claude(probe["prompt"] + PROBE_SUFFIX, workspace, plugin, max_turns=probe.get("max_turns", 40))
    reply = run.final
    checks = [
        {"criterion": "orchestrator loaded (arkar-ui-intelligence)", "passed": any(
            skill.endswith("arkar-ui-intelligence") for skill in run.skills), "evidence": ", ".join(run.skills)[:300]},
        {"criterion": "stopped at the plan (no UI files written)", "passed": not subprocess.run(
            ["git", "status", "--porcelain"], cwd=workspace, capture_output=True, text=True).stdout.strip(),
         "evidence": "workspace unchanged"},
    ]
    for pattern in probe.get("must", []):
        checks.append({"criterion": f"mentions /{pattern}/", "passed": bool(re.search(pattern, reply)), "evidence": ""})
    for pattern in probe.get("must_not", []):
        checks.append({"criterion": f"avoids /{pattern}/", "passed": not re.search(pattern, reply), "evidence": ""})
    rubric = grade(probe, reply) if reply.strip() else [
        {"criterion": line, "passed": False, "evidence": "no reply"} for line in probe["rubric"]]
    (root / "build-sheet.md").write_text(reply)
    return {"probe": probe["id"], "area": probe["area"], "attempt": attempt, "workspace": str(root),
            "ending": run.ending, "skills": run.skills, "checks": checks, "rubric": rubric,
            "score": round(sum(item["passed"] for item in rubric) / len(rubric), 2)}


def write_summary(results: list[dict], out: Path) -> str:
    lines = ["# Decision probes", "", "| Probe | Area | Runs | Rubric (mean) | Process checks | Unreliable lines |",
             "|---|---|---|---|---|---|"]
    by_probe: dict[str, list[dict]] = {}
    for result in results:
        by_probe.setdefault(result["probe"], []).append(result)
    for probe_id, runs in by_probe.items():
        mean = sum(run["score"] for run in runs) / len(runs)
        process = sum(all(check["passed"] for check in run["checks"]) for run in runs)
        # A line that passes in some runs and fails in others is a decision the skill doesn't make reliably.
        unreliable = []
        for index, criterion in enumerate(runs[0]["rubric"]):
            passes = sum(run["rubric"][index]["passed"] for run in runs)
            if passes < len(runs):
                unreliable.append(f"{index + 1} ({passes}/{len(runs)})")
        lines.append(f"| {probe_id} | {runs[0]['area']} | {len(runs)} | {mean:.0%} | {process}/{len(runs)} | "
                     f"{', '.join(unreliable) or '—'} |")
    lines += ["", "## Failed lines", ""]
    for result in sorted(results, key=lambda item: (item["probe"], item["attempt"])):
        failed = [item for item in result["checks"] + result["rubric"] if not item["passed"]]
        if failed:
            lines.append(f"**{result['probe']} run {result['attempt']}** ({result['ending']}) — {result['workspace']}")
            lines += [f"- {item['criterion']} — {item['evidence']}" for item in failed]
            lines.append("")
    text = "\n".join(lines)
    (out / "summary.md").write_text(text)
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", nargs="*", help="probe ids")
    parser.add_argument("--area", help="only probes whose area contains this text")
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--jobs", type=int, default=4)
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()
    probes = load_probes()
    if args.only:
        probes = [probe for probe in probes if probe["id"] in args.only]
    if args.area:
        probes = [probe for probe in probes if args.area.lower() in probe["area"].lower()]
    if args.list:
        for probe in probes:
            print(f"{probe['id']:24} {probe['area']}")
        return 0
    out = RESULTS / f"probes-{datetime.datetime.now():%Y%m%d-%H%M%S}"
    out.mkdir(parents=True)
    results = []
    with ThreadPoolExecutor(max_workers=min(args.jobs, 4)) as pool:
        futures = [pool.submit(run_probe, probe, attempt, PLUGIN) for probe in probes for attempt in range(1, args.runs + 1)]
        for future in as_completed(futures):
            try:
                result = future.result()
            except Exception as error:  # a broken run is reported, never hidden
                print(f"probe failed to run: {error}", flush=True)
                continue
            results.append(result)
            print(f"{result['probe']} run {result['attempt']}: rubric {result['score']:.0%}", flush=True)
            (out / "results.json").write_text(json.dumps(results, indent=1))
    print(write_summary(results, out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
