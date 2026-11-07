"""Grade eval runs that finished but were never graded (the batch was stopped).

Rebuilds each session from its saved reply and Claude Code's own transcript,
then runs the scenario's checks against the workspace it left behind — no new
session is started.

Usage:
    python3 evals/regrade.py <run-folder> [<run-folder> ...]
"""
from __future__ import annotations

import datetime
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import subprocess  # noqa: E402

import lib  # noqa: E402
import scenarios  # noqa: E402

from run import PLUGIN, RESULTS, SCENARIOS, write_summary  # noqa: E402

TRANSCRIPTS = Path.home() / ".claude" / "projects"


def transcript_of(workspace: Path) -> Path | None:
    """Claude Code stores each session under the working folder, with symbols turned into '-'."""
    folder = TRANSCRIPTS / re.sub(r"[^A-Za-z0-9]", "-", str(workspace))
    files = sorted(folder.glob("*.jsonl"), key=lambda path: path.stat().st_mtime)
    return files[-1] if files else None


def rebuilt_run(run_folder: Path) -> lib.Run:
    run = lib.Run(raw="")
    replies = sorted(run_folder.glob("reply-*.md"), key=lambda path: path.stat().st_mtime)
    if replies:
        run.final = replies[-1].read_text().split("\n\n<!-- session ended")[0]
        run.session_id = replies[-1].stem.removeprefix("reply-")
    transcript = transcript_of(run_folder / "workspace")
    if transcript:
        for line in transcript.read_text().splitlines():
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") != "assistant":
                continue
            for block in event.get("message", {}).get("content", []) or []:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                run.tools.append(block["name"])
                if block["name"] == "Skill":
                    run.skills.append(block.get("input", {}).get("skill", ""))
                if block["name"] == "Bash":
                    run.commands.append(block.get("input", {}).get("command", ""))
    return run


def commit_at(run_folder: Path) -> str:
    """The skills commit the session read: the last commit before it started."""
    started = datetime.datetime.fromtimestamp(run_folder.stat().st_mtime).isoformat()
    transcript = transcript_of(run_folder / "workspace")
    if transcript:
        for line in transcript.read_text().splitlines():
            stamp = json.loads(line).get("timestamp") if line.startswith("{") else None
            if stamp:
                started = stamp
                break
    return subprocess.run(["git", "log", "-1", f"--before={started}", "--format=%h"], capture_output=True,
                          text=True, cwd=Path(__file__).parent).stdout.strip()


def regrade(run_folder: Path) -> dict:
    match = re.match(r"arkar-eval-(.+)-(\d+)-[^-]+$", run_folder.name)
    name, attempt = match.group(1), int(match.group(2))
    area, scenario = SCENARIOS[name]
    run = rebuilt_run(run_folder)
    # Reuse the finished session and its workspace instead of starting new ones.
    scenarios.run_claude = lambda *args, **kwargs: run
    scenarios.workspace_from = lambda fixture, destination: destination
    checks = scenario(run_folder, PLUGIN)
    return {"scenario": name, "area": area, "attempt": attempt, "workspace": str(run_folder), "checks": checks,
            "minutes": None, "skills_commit": commit_at(run_folder), "regraded": True}


def main() -> None:
    out = RESULTS / (datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + "-regraded")
    out.mkdir(parents=True)
    results = [regrade(Path(folder)) for folder in sys.argv[1:]]
    write_summary(results, out, "regraded (sessions finished, grading was lost)")
    print(f"results in {out}")


if __name__ == "__main__":
    main()
