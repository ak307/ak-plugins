"""Run the behaviour evals: real Claude Code sessions against the plugin in this repo.

    python3 evals/run.py                      # every scenario, once
    python3 evals/run.py --only prod-live-bug bug-hunt
    python3 evals/run.py --area "production safety" --runs 2
    python3 evals/run.py --baseline           # same scenarios without the plugin, for comparison
    python3 evals/run.py --list

Needs: the `claude` CLI signed in, `uv`, and Python 3.11+ with PyYAML
(`uv run --with pyyaml python evals/run.py` works). Each scenario is several
Claude sessions, so a full run takes a while and uses your plan's quota.
The plugin under test is this repo's working copy (loaded with --plugin-dir,
which hides the installed copy for those sessions only). Results go to
evals/results/<timestamp>/ (summary.md and results.json); the exit code is 1
if any check that isn't a known gap failed.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import subprocess
import sys
import tempfile
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import PLUGIN, empty_plugin_dir  # noqa: E402
from scenarios import SCENARIOS  # noqa: E402

RESULTS = Path(__file__).resolve().parent / "results"
# Which version of the skills a run used, so results can be compared across changes.
SKILLS_COMMIT = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True,
                               cwd=Path(__file__).resolve().parent).stdout.strip() or "unknown"


def run_one(name: str, attempt: int, out: Path, plugin: Path) -> dict:
    area, scenario = SCENARIOS[name]
    # Outside the repo, so the sessions under test only see their own project.
    root = Path(tempfile.mkdtemp(prefix=f"arkar-eval-{name}-{attempt}-"))
    started = time.time()
    try:
        checks = scenario(root, plugin)
    except Exception:
        checks = [{"check": "scenario ran", "passed": False, "detail": traceback.format_exc()[-800:], "known_gap": False}]
    return {"scenario": name, "area": area, "attempt": attempt, "workspace": str(root), "checks": checks,
            "minutes": round((time.time() - started) / 60, 1), "skills_commit": SKILLS_COMMIT,
            "model": os.environ.get("EVAL_MODEL", "default"), "plugin": plugin.name,
            "brief_suffix": os.environ.get("EVAL_BRIEF_SUFFIX", "")}


def write_summary(results: list, out: Path, label: str, quiet: bool = False) -> bool:
    lines = [f"# arkar-dev-standards behaviour evals — {label}", ""]
    failed_any = False
    for result in sorted(results, key=lambda r: (r["area"], r["scenario"], r["attempt"])):
        passed = sum(c["passed"] for c in result["checks"])
        lines.append(f"## {result['area']} · {result['scenario']} (run {result['attempt']}) — {passed}/{len(result['checks'])}")
        for item in result["checks"]:
            mark = "PASS" if item["passed"] else ("GAP " if item["known_gap"] else "FAIL")
            if not item["passed"] and not item["known_gap"]:
                failed_any = True
            detail = f" — {item['detail'][:160]}" if item["detail"] and not item["passed"] else ""
            lines.append(f"- {mark} {item['check']}{detail}")
        lines.append("")
    (out / "summary.md").write_text("\n".join(lines))
    (out / "results.json").write_text(json.dumps(results, indent=2))
    if not quiet:
        print("\n".join(lines))
    return failed_any


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the plugin's behaviour evals.")
    parser.add_argument("--only", nargs="*", help="scenario names")
    parser.add_argument("--area", help="run every scenario in one area")
    parser.add_argument("--runs", type=int, default=1, help="repeat each scenario")
    parser.add_argument("--jobs", type=int, default=4, help="scenarios run in parallel")
    parser.add_argument("--baseline", action="store_true", help="run without the plugin")
    parser.add_argument("--brief-suffix", help="extra requirement appended to each scenario's first message")
    parser.add_argument("--model", help="model for the sessions under test (e.g. opus); default: the CLI default")
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()

    if args.list:
        for name, (area, _) in SCENARIOS.items():
            print(f"{area:20} {name}")
        return 0
    names = args.only or [name for name, (area, _) in SCENARIOS.items() if not args.area or area == args.area]
    unknown = [name for name in names if name not in SCENARIOS]
    if unknown:
        print(f"unknown scenarios: {unknown}; see --list")
        return 2

    if args.model:
        os.environ["EVAL_MODEL"] = args.model
    if args.brief_suffix:
        os.environ["EVAL_BRIEF_SUFFIX"] = args.brief_suffix
    plugin = empty_plugin_dir() if args.baseline else PLUGIN
    label = "without the plugin" if args.baseline else f"plugin v{json.loads((PLUGIN / '.claude-plugin' / 'plugin.json').read_text())['version']}"
    if args.model:
        label += f" · model {args.model}"
    if args.brief_suffix:
        label += f" · brief + '{args.brief_suffix}'"
    out = RESULTS / datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    out.mkdir(parents=True)
    jobs = [(name, attempt) for name in names for attempt in range(1, args.runs + 1)]
    print(f"Running {len(jobs)} scenario run(s) {label}; results in {out}")
    results = []
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        # Saved after every finished run, so a killed batch keeps what it completed.
        for future in as_completed([pool.submit(run_one, name, attempt, out, plugin) for name, attempt in jobs]):
            results.append(future.result())
            write_summary(results, out, label, quiet=True)
    failed = write_summary(results, out, label)
    return 1 if failed and not args.baseline else 0


if __name__ == "__main__":
    sys.exit(main())
