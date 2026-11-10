"""Checks on the plugin's hooks: rules size, subagent context in sync, hooks.json wiring."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

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


def test_guard_runs_on_grep_too():
    # The Grep tool can print a .env file just like Read can.
    hooks = json.loads((HOOKS / "hooks.json").read_text())["hooks"]
    assert "Grep" in hooks["PreToolUse"][0]["matcher"].split("|")


def oldest_python() -> str | None:
    """A Python 3.8 to compile with, if this machine has one (directly or through uv)."""
    found = shutil.which("python3.8")
    if found:
        return found
    if shutil.which("uv"):
        result = subprocess.run(["uv", "python", "find", "3.8"], capture_output=True, text=True)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    return None


def test_shipped_python_still_compiles_on_python_3_8():
    # The hook launchers accept any Python 3.8+. A newer-only syntax (such as a backslash
    # inside an f-string, allowed only from 3.12) makes a hook silently do nothing on
    # laptops with an older Python — the tests here would still pass on a new one.
    python = oldest_python()
    if python is None:
        pytest.skip("no Python 3.8 on this machine")
    shipped = [str(path) for path in (ROOT / "plugins").rglob("*.py") if "evals" not in path.parts]
    code = "import sys\nfor name in sys.argv[1:]:\n    compile(open(name).read(), name, 'exec')"
    result = subprocess.run([python, "-c", code, *shipped], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
