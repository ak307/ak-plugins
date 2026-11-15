"""Core test: one brief (core-briefs.yaml) built in one real session with this repo's plugins.

    uv run -q --no-project --with pyyaml python evals/core_test.py --brief assets-table --setup current --out <folder>

"current" is the plugins as they stand in this working copy. "surface" and "patched" are a frozen
copy of them (--variant), so later edits can't change a build that is still running; the two names
are kept because earlier results are filed under them.

One build per call, so each can run as its own background job (at most four at a time).
Each build leaves <out>/<brief>-<setup>/ with meta.json (time, turns, tokens, skills), reply.md
and the workspace path.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import PLUGINS, plugin_dir_args, workspace_from  # noqa: E402

HERE = Path(__file__).resolve().parent
SESSION_CAP_SECONDS = 6300  # 105 minutes: every setup gets the same limit


def session(prompt: str, workspace: Path, plugin: Path) -> tuple[str, bool]:
    """One headless session; returns its event stream and whether the time cap cut it off."""
    command = ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose",
               "--dangerously-skip-permissions", "--max-turns", "500", *plugin_dir_args(plugin)]
    environment = {**os.environ, "IS_SANDBOX": "1"}
    try:
        process = subprocess.run(command, cwd=workspace, env=environment, stdin=subprocess.DEVNULL,
                                 capture_output=True, text=True, timeout=SESSION_CAP_SECONDS)
        return process.stdout, False
    except subprocess.TimeoutExpired as expired:
        output = expired.stdout or ""
        return (output.decode("utf-8", "ignore") if isinstance(output, bytes) else output), True


def summarise(stream: str) -> dict:
    """Time, turns, tokens, skills and tool use from a session's event stream."""
    summary = {"skills": [], "tools": {}, "images_looked_at": 0, "subagents": 0, "final": "", "ending": "no result event",
               "gate_blocks": stream.count("the UI work isn't finished yet"),
               "gate_holds": stream.count("arkar UI quality gate: this writes UI"),
               "guard_hits": stream.count("arkar production guard:")}
    for line in stream.splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "result":
            usage = event.get("usage") or {}
            summary.update({
                "final": event.get("result", "") or "", "ending": event.get("subtype", "?"),
                "turns": event.get("num_turns"), "minutes": round((event.get("duration_ms") or 0) / 60000, 1),
                "cost_usd": event.get("total_cost_usd"), "output_tokens": usage.get("output_tokens"),
                "input_tokens": (usage.get("input_tokens") or 0) + (usage.get("cache_read_input_tokens") or 0)
                + (usage.get("cache_creation_input_tokens") or 0)})
        if event.get("type") != "assistant":
            continue
        for block in event.get("message", {}).get("content", []):
            if block.get("type") != "tool_use":
                continue
            name, tool_input = block["name"], block.get("input", {})
            summary["tools"][name] = summary["tools"].get(name, 0) + 1
            if name == "Skill":
                summary["skills"].append(str(tool_input.get("skill", "")).split(":")[-1])
            if name in ("Agent", "Task"):
                summary["subagents"] += 1
            if name == "Read" and re.search(r"\.(png|jpe?g|webp)$", str(tool_input.get("file_path", "")), re.I):
                summary["images_looked_at"] += 1
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--brief", required=True)
    parser.add_argument("--setup", required=True, choices=["current", "surface", "patched"],
                        help="current: the plugins as they are in this working copy; surface, patched: a frozen "
                             "copy of them (--variant), so later edits can't change a build that is still running")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--variant", type=Path, help="where the frozen copy lives (made from this working copy if missing)")
    args = parser.parse_args()
    variant = args.variant or Path(tempfile.gettempdir()) / "arkar-core-variant" / "plugins"
    if args.setup != "current" and not variant.exists():
        shutil.copytree(PLUGINS, variant)
    briefs = {brief["id"]: brief for brief in yaml.safe_load((HERE / "core-briefs.yaml").read_text())["briefs"]}
    brief = briefs[args.brief]
    plugin = PLUGINS if args.setup == "current" else variant
    root = Path(tempfile.mkdtemp(prefix=f"arkar-core-{brief['id']}-{args.setup}-"))
    workspace = workspace_from(brief.get("fixture"), root / "workspace")
    started = time.time()
    stream, cut_off = session(brief["prompt"], workspace, plugin)
    summary = summarise(stream)
    summary.update({"brief": brief["id"], "setup": args.setup, "workspace": str(workspace), "cut_off_at_cap": cut_off,
                    "wall_minutes": round((time.time() - started) / 60, 1)})
    out = args.out / f"{brief['id']}-{args.setup}"
    out.mkdir(parents=True, exist_ok=True)
    (out / "reply.md").write_text(summary.pop("final"), encoding="utf-8")
    (out / "stream.jsonl").write_text(stream, encoding="utf-8")
    (out / "meta.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    print(json.dumps({key: summary.get(key) for key in ("brief", "setup", "ending", "wall_minutes", "turns", "skills")}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
