"""Checks on the plugin's hooks: rules size, subagent context in sync, hooks.json wiring."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / "plugins" / "arkar-dev-standards" / "hooks"
sys.path.insert(0, str(ROOT / "scripts"))

import build_subagent_context  # noqa: E402


def test_rules_fit_in_the_hook_output_limit():
    # Claude Code replaces hook output over 10,000 characters with a 2,000-character preview,
    # which would cut off most of Rule 0. Keep a margin.
    assert len((HOOKS / "coding-rules.md").read_text()) <= 9500


def test_subagent_context_matches_the_rules():
    assert (HOOKS / "subagent-context.json").read_text() == build_subagent_context.build(), \
        "run: python3 scripts/build_subagent_context.py"


def test_hooks_json_wires_rules_guard_and_subagents():
    hooks = json.loads((HOOKS / "hooks.json").read_text())["hooks"]
    assert "coding-rules.md" in hooks["SessionStart"][0]["hooks"][0]["command"]
    assert "production_guard.sh" in hooks["PreToolUse"][0]["hooks"][0]["command"]
    assert "subagent-context.json" in hooks["SubagentStart"][0]["hooks"][0]["command"]
