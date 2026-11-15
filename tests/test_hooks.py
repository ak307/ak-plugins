"""Checks on the plugins' hooks: rules size, generated files in sync, hooks.json wiring."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
PLUGINS = ROOT / "plugins"
CORE_HOOKS = PLUGINS / "arkar-dev-standards" / "hooks"
UI_HOOKS = PLUGINS / "arkar-ui" / "hooks"
RULES_FILES = sorted(PLUGINS.glob("*/hooks/*rules.md"))
sys.path.insert(0, str(ROOT / "scripts"))

import build_generated  # noqa: E402


def wiring(hooks_dir: Path) -> dict:
    return json.loads((hooks_dir / "hooks.json").read_text())["hooks"]


def commands(entries: list) -> str:
    return " ".join(hook["command"] for entry in entries for hook in entry["hooks"])


@pytest.mark.parametrize("rules", RULES_FILES, ids=lambda path: path.parts[-3])
def test_rules_fit_in_the_hook_output_limit(rules):
    # Claude Code replaces hook output over 10,000 characters with a 2,000-character preview,
    # which would cut off most of Rule 0. Keep a margin.
    assert len(rules.read_text()) <= 9500


def test_generated_files_are_up_to_date():
    # Each plugin's rules for subagents, and its copy of the code the gates share.
    stale = [str(path.relative_to(ROOT)) for path, content in build_generated.generated().items()
             if not path.exists() or path.read_text() != content]
    assert not stale, f"run: python3 scripts/build_generated.py — out of date: {stale}"


def test_core_hooks_wire_rules_guard_code_gate_and_subagents():
    hooks = wiring(CORE_HOOKS)
    assert "coding-rules.md" in commands(hooks["SessionStart"])
    assert "production_guard.sh" in hooks["PreToolUse"][0]["hooks"][0]["command"]
    assert "subagent-context.json" in commands(hooks["SubagentStart"])
    assert "code_gate.sh" in commands(hooks["Stop"])


def test_ui_hooks_wire_rules_gate_and_subagents():
    hooks = wiring(UI_HOOKS)
    assert "ui-rules.md" in commands(hooks["SessionStart"])
    assert "ui_quality_gate.sh" in commands(hooks["PreToolUse"]) and "ui_quality_gate.sh" in commands(hooks["Stop"])
    assert "subagent-context.json" in commands(hooks["SubagentStart"])


def test_every_hook_command_points_at_a_file_in_its_own_plugin():
    # An installed plugin can only read its own folder: a command that reaches into another plugin does nothing there.
    for hooks_file in sorted(PLUGINS.glob("*/hooks/hooks.json")):
        for entries in json.loads(hooks_file.read_text())["hooks"].values():
            for hook in (hook for entry in entries for hook in entry["hooks"]):
                target = hook["command"].split("${CLAUDE_PLUGIN_ROOT}/")[1].rstrip('"')
                assert (hooks_file.parents[1] / target).is_file(), f"{hooks_file.parts[-3]}: {target}"


def test_guard_runs_on_grep_too():
    # The Grep tool can print a .env file just like Read can.
    assert "Grep" in wiring(CORE_HOOKS)["PreToolUse"][0]["matcher"].split("|")


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
    shipped = [str(path) for folder in (PLUGINS, ROOT / "shared") for path in folder.rglob("*.py") if "evals" not in path.parts]
    code = "import sys\nfor name in sys.argv[1:]:\n    compile(open(name).read(), name, 'exec')"
    result = subprocess.run([python, "-c", code, *shipped], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
