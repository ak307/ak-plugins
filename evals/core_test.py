"""Core test: the same brief built with the released plugin and with the draft design-intelligence core.

    uv run -q --no-project --with pyyaml python evals/core_test.py --brief assets-table --setup core --out <folder>
    uv run -q --no-project --with pyyaml python evals/core_test.py --variant-only      # build the test plugin copy

"current" is this repo's plugin as it stands. "core" is a copy of it in which the draft
(drafts/ui-core/arkar-ui-design-intelligence) replaces every arkar-ui-* skill, the UI quality
gate only holds UI writes until the core is loaded (its end-of-session checklist is off), and
the always-on UI rule points at the core. Everything else — production guard, security gate,
the other skills — is the same in both.

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

from lib import PLUGIN, REPO, workspace_from  # noqa: E402

HERE = Path(__file__).resolve().parent
DRAFT = REPO / "drafts" / "ui-core" / "arkar-ui-design-intelligence"
CORE = "arkar-ui-design-intelligence"
SESSION_CAP_SECONDS = 6300  # 105 minutes: both setups get the same limit
TOOLS = {
    "scripts": ["arkar-ui-visual-qa/scripts"],
    "assets": ["arkar-ui-design-system/assets", "arkar-ui-motion-design/assets", "arkar-ui-intelligence/assets"],
}
UI_RULE = """## 2b. UI work: designed and checked for real

Whenever you build, change, style, animate or fix anything users see (web
or app) — **load `arkar-ui-design-intelligence` first** (with
`arkar-change-workflow` for existing code) and work the way it describes:
understand, decide one direction, build it as a system, then look at the
real rendered UI on local or test data and fix what matters. Decide freely
within what AK asked; propose anything beyond it. Never claim checks you
didn't run. **Most important: premium, Apple-level quality in look and
behaviour — never accept UI just because it works.**
"""


def build_variant(destination: Path) -> Path:
    """The test copy of the plugin: the draft core in place of the UI skills, the checklist gate off."""
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(PLUGIN, destination)
    skills = destination / "skills"
    core = skills / CORE
    core.mkdir()
    for folder, sources in TOOLS.items():
        (core / folder).mkdir()
        for source in sources:
            for item in (skills / source).iterdir():
                shutil.copy2(item, core / folder / item.name)
    for old in skills.glob("arkar-ui-*"):
        if old.name != CORE:
            shutil.rmtree(old)
    text = (DRAFT / "SKILL.md").read_text(encoding="utf-8")
    (core / "SKILL.md").write_text(text.replace("DRAFT for AK's review — not part of the live plugin. ", ""), encoding="utf-8")

    hooks = destination / "hooks"
    rules = (hooks / "coding-rules.md").read_text(encoding="utf-8")
    start, end = rules.index("## 2b. UI work"), rules.index("## 2c.")
    rules = rules[:start] + UI_RULE + "\n" + rules[end:]
    (hooks / "coding-rules.md").write_text(rules, encoding="utf-8")
    (hooks / "subagent-context.json").write_text(json.dumps({"hookSpecificOutput": {
        "hookEventName": "SubagentStart", "additionalContext": rules}}) + "\n", encoding="utf-8")

    gate = (hooks / "ui_quality_gate.py").read_text(encoding="utf-8")
    gate = gate.replace('ORCHESTRATOR = "arkar-ui-intelligence"', f'ORCHESTRATOR = "{CORE}"')
    gate = re.sub(r"Load it now with the Skill tool and follow its workflow — .*?If the skill can't load",
                  "Load it now with the Skill tool, then make this change. If the skill can't load", gate, flags=re.S)
    (hooks / "ui_quality_gate.py").write_text(gate, encoding="utf-8")
    registered = json.loads((hooks / "hooks.json").read_text(encoding="utf-8"))
    for entry in registered["hooks"]["Stop"]:  # the end-of-session checklist is what the test switches off
        entry["hooks"] = [hook for hook in entry["hooks"] if "ui_quality_gate" not in hook["command"]]
    (hooks / "hooks.json").write_text(json.dumps(registered, indent=2), encoding="utf-8")

    for path in skills.rglob("*.md"):  # other skills point at UI skills that no longer exist in this copy
        if CORE in path.parts:
            continue
        body = path.read_text(encoding="utf-8")
        changed = re.sub(r"arkar-ui-(?!design-intelligence)[a-z-]+", CORE, body)
        if changed != body:
            path.write_text(changed, encoding="utf-8")
    return destination


def session(prompt: str, workspace: Path, plugin: Path) -> tuple[str, bool]:
    """One headless session; returns its event stream and whether the time cap cut it off."""
    command = ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose",
               "--dangerously-skip-permissions", "--max-turns", "500", "--plugin-dir", str(plugin)]
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
    parser.add_argument("--brief")
    parser.add_argument("--setup", choices=["current", "core"])
    parser.add_argument("--out", type=Path)
    parser.add_argument("--variant", type=Path, help="where the test plugin copy lives (built if missing)")
    parser.add_argument("--variant-only", action="store_true")
    args = parser.parse_args()
    variant = args.variant or Path(tempfile.gettempdir()) / "arkar-core-variant" / "arkar-dev-standards"
    if args.variant_only or (args.setup == "core" and not variant.exists()):
        build_variant(variant)
        print(f"test plugin copy: {variant}")
        if args.variant_only:
            return 0
    briefs = {brief["id"]: brief for brief in yaml.safe_load((HERE / "core-briefs.yaml").read_text())["briefs"]}
    brief = briefs[args.brief]
    plugin = variant if args.setup == "core" else PLUGIN
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
    print(json.dumps({key: summary[key] for key in ("brief", "setup", "ending", "wall_minutes", "turns", "skills")}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
