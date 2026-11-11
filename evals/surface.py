"""Surface builds: one surface built on a ready-made app, shot and motion-measured.

    uv run -q --no-project --with pyyaml python evals/surface.py --only approvals-detail
    uv run -q --no-project --with pyyaml python evals/surface.py --list

Each run is a real Claude Code session with this repo's plugin, on a copy of
the fixture. Afterwards the surface is screenshot at desktop and phone (before
and after, side by side) and measured with motion-metrics.cjs on real
interactions — normal and reduced motion. The process checks (orchestrator
first, build sheet, Verify, independent review, videos) come from the session
itself. The contact sheet is for AK's eye: his verdict decides, the numbers
only point at what to look at.
Results: evals/results/surfaces-<timestamp>/ (summary.md, results.json, shots).
"""
from __future__ import annotations

import argparse
import contextlib
import datetime
import json
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import FIXTURES, PLUGIN, run_claude, workspace_from  # noqa: E402

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results"
MOTION = PLUGIN / "skills/arkar-ui-visual-qa/scripts/motion-metrics.cjs"
SIZES = {"desktop": "1440x900", "phone": "390x844"}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextlib.contextmanager
def serve(folder: Path):
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(folder)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()


def shoot(folder: Path, surface: dict, out: Path, label: str) -> list[str]:
    shots = []
    with serve(folder) as base:
        for name, size in SIZES.items():
            path = out / f"{surface['id']}-{label}-{name}.png"
            subprocess.run(["node", str(HERE / "surface-shot.cjs"), f"{base}/{surface['url']}", str(path), size,
                            *surface["open"]], capture_output=True, timeout=120)
            if path.exists():
                shots.append(path.name)
    return shots


def measure(folder: Path, surface: dict) -> dict:
    report = {}
    with serve(folder) as base:
        for mode in ("normal", "reduced"):
            command = ["node", str(MOTION), f"{base}/{surface['url']}", "--json", *surface["motion"]]
            if mode == "reduced":
                command.insert(3, "--reduced")
            output = subprocess.run(command, capture_output=True, text=True, timeout=300).stdout.strip()
            try:
                steps = json.loads(output.splitlines()[-1])["steps"]
            except (ValueError, IndexError):
                steps = []
            report[mode] = [{"step": step["step"], "response": step.get("response"),
                             "findings": step.get("findings", [step.get("error", "")])} for step in steps]
    return report


def process_checks(run, workspace: Path) -> list[dict]:
    design = "".join(path.read_text(errors="ignore") for path in workspace.rglob("DESIGN.md"))
    record = "".join(path.read_text(errors="ignore") for path in workspace.rglob("premium-pass.md"))
    videos = [path for path in workspace.rglob("*") if path.suffix in (".mp4", ".webm")]
    first_ui = next((index for index, tool in enumerate(run.tools) if tool in ("Write", "Edit", "MultiEdit")), None)
    first_skill = next((index for index, tool in enumerate(run.tools) if tool == "Skill"), None)
    return [
        {"check": "orchestrator loaded", "passed": any(skill.endswith("arkar-ui-intelligence") for skill in run.skills)},
        {"check": "skills loaded before the first edit", "passed": first_skill is not None
         and (first_ui is None or first_skill < first_ui)},
        {"check": "build sheet with the detail's composition", "passed": bool(re.search(r"build sheet", design, re.I))
         and bool(re.search(r"composition", design, re.I))},
        {"check": "Verify recorded", "passed": bool(re.search(r"^##\s*Verify", record, re.M | re.I))},
        {"check": "motion measured (motion-metrics)", "passed": bool(re.search(r"motion.metrics", record, re.I))},
        {"check": "independent review by a subagent", "passed": "Agent" in run.tools
         and bool(re.search(r"independent review", record, re.I))},
        {"check": "experience walk videos", "passed": bool(videos)},
    ]


def run_surface(surface: dict, attempt: int, out: Path) -> dict:
    root = Path(tempfile.mkdtemp(prefix=f"arkar-surface-{surface['id']}-{attempt}-"))
    workspace = workspace_from(surface["fixture"], root / "workspace")
    run = run_claude(surface["prompt"], workspace, PLUGIN, max_turns=surface.get("max_turns", 200))
    shots = shoot(workspace, surface, out, f"after-{attempt}")
    motion = measure(workspace, surface)
    findings = sum(len(step["findings"]) for mode in motion.values() for step in mode)
    return {"surface": surface["id"], "attempt": attempt, "workspace": str(root), "ending": run.ending,
            "checks": process_checks(run, workspace), "shots": shots, "motion": motion, "motion_findings": findings}


def write_summary(surfaces: list[dict], results: list[dict], out: Path) -> str:
    lines = ["# Surface builds", ""]
    for surface in surfaces:
        lines += [f"## {surface['id']}", "", f"> {surface['prompt']}", ""]
        before = [name for name in sorted(path.name for path in out.glob(f"{surface['id']}-before-*.png"))]
        lines.append(f"Before: {', '.join(before) or '—'}")
        for result in sorted((item for item in results if item["surface"] == surface["id"]), key=lambda item: item["attempt"]):
            passed = sum(check["passed"] for check in result["checks"])
            lines += ["", f"### Run {result['attempt']} — {result['ending']} — process {passed}/{len(result['checks'])}, "
                          f"motion findings {result['motion_findings']}", f"After: {', '.join(result['shots']) or '—'}"]
            lines += [f"- ✗ {check['check']}" for check in result["checks"] if not check["passed"]]
            for mode, steps in result["motion"].items():
                for step in steps:
                    for note in step["findings"]:
                        if note:
                            lines.append(f"- motion ({mode}) `{step['step']}`: {note}")
            lines.append(f"- workspace: {result['workspace']}")
        lines.append("")
    text = "\n".join(lines)
    (out / "summary.md").write_text(text)
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", nargs="*")
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--jobs", type=int, default=2)
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()
    surfaces = yaml.safe_load((HERE / "surfaces.yaml").read_text())["surfaces"]
    if args.only:
        surfaces = [surface for surface in surfaces if surface["id"] in args.only]
    if args.list:
        for surface in surfaces:
            print(surface["id"])
        return 0
    if shutil.which("node") is None:
        print("node with playwright is needed for shots and motion metrics")
        return 1
    out = RESULTS / f"surfaces-{datetime.datetime.now():%Y%m%d-%H%M%S}"
    out.mkdir(parents=True)
    for surface in surfaces:
        shoot(FIXTURES / surface["fixture"], surface, out, "before")
    results = []
    with ThreadPoolExecutor(max_workers=min(args.jobs, 4)) as pool:
        futures = [pool.submit(run_surface, surface, attempt, out)
                   for surface in surfaces for attempt in range(1, args.runs + 1)]
        for future in as_completed(futures):
            results.append(future.result())
            (out / "results.json").write_text(json.dumps(results, indent=1))
    print(write_summary(surfaces, results, out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
