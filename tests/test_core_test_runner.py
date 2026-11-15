"""The eval build runner (evals/core_test.py), with the Claude CLI faked: no real session is started.

The runner copies a brief's fixture into a new folder, starts one headless session there with the plugins, and
files what the session did. The fake `claude` stands in for the session: it writes down how it was called and
prints the two events the runner reads.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "evals" / "core_test.py"
PLUGINS = ROOT / "plugins"
SESSION_EVENTS = [
    {"type": "assistant", "message": {"content": [
        {"type": "tool_use", "name": "Skill", "input": {"skill": "arkar-ui:arkar-ui-intelligence"}}]}},
    {"type": "result", "subtype": "success", "result": "Filter added.", "num_turns": 3, "duration_ms": 120000,
     "total_cost_usd": 0.25, "usage": {"output_tokens": 40, "input_tokens": 60}},
]
FAKE_CLAUDE = """#!/usr/bin/env bash
printf '%s\\n' "$@" > "$FAKE_CLAUDE_CALL"
cat "$FAKE_CLAUDE_EVENTS"
"""
pytestmark = pytest.mark.skipif(shutil.which("bash") is None or os.name == "nt", reason="the fake CLI is a shell script")


def run_build(tmp_path: Path, *arguments: str) -> subprocess.CompletedProcess:
    """One build of the status-filter brief, with `claude` on the PATH replaced by the fake."""
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    (fake_bin / "claude").write_text(FAKE_CLAUDE)
    (fake_bin / "claude").chmod(0o755)
    (tmp_path / "work").mkdir()  # the runner's temporary folders go here, so pytest removes them
    (tmp_path / "events.jsonl").write_text("\n".join(json.dumps(event) for event in SESSION_EVENTS) + "\n")
    environment = {**os.environ, "PATH": f"{fake_bin}{os.pathsep}{os.environ['PATH']}", "TMPDIR": str(tmp_path / "work"),
                   "FAKE_CLAUDE_CALL": str(tmp_path / "call.txt"), "FAKE_CLAUDE_EVENTS": str(tmp_path / "events.jsonl")}
    command = [sys.executable, str(RUNNER), "--brief", "workorders-filter", "--out", str(tmp_path / "out"), *arguments]
    return subprocess.run(command, env=environment, capture_output=True, text=True, timeout=120)


def test_a_build_files_what_the_session_did(tmp_path):
    result = run_build(tmp_path, "--setup", "current")
    assert result.returncode == 0, result.stderr
    filed = tmp_path / "out" / "workorders-filter-current"
    summary = json.loads((filed / "meta.json").read_text())
    assert summary["skills"] == ["arkar-ui-intelligence"]
    assert (summary["ending"], summary["turns"], summary["minutes"]) == ("success", 3, 2.0)
    assert (filed / "reply.md").read_text() == "Filter added."


def test_the_session_works_in_a_copy_of_the_fixture(tmp_path):
    result = run_build(tmp_path, "--setup", "current")
    assert result.returncode == 0, result.stderr
    summary = json.loads((tmp_path / "out" / "workorders-filter-current" / "meta.json").read_text())
    workspace = Path(summary["workspace"])
    assert (workspace / "index.html").exists()
    assert tmp_path in workspace.parents  # not the fixture in the repo


def test_the_working_copys_plugins_are_loaded(tmp_path):
    run_build(tmp_path, "--setup", "current")
    call = (tmp_path / "call.txt").read_text()
    assert f"--plugin-dir\n{PLUGINS / 'arkar-dev-standards'}\n" in call
    assert f"--plugin-dir\n{PLUGINS / 'arkar-ui'}\n" in call


def test_a_frozen_copy_of_the_plugins_is_made_and_loaded(tmp_path):
    frozen = tmp_path / "frozen"
    result = run_build(tmp_path, "--setup", "patched", "--variant", str(frozen))
    assert result.returncode == 0, result.stderr
    assert (frozen / "arkar-ui" / "hooks" / "ui-rules.md").read_text() == (PLUGINS / "arkar-ui" / "hooks" / "ui-rules.md").read_text()
    call = (tmp_path / "call.txt").read_text()
    assert f"--plugin-dir\n{frozen / 'arkar-ui'}\n" in call
    assert str(PLUGINS) not in call


def test_the_removed_draft_setup_is_refused(tmp_path):
    result = run_build(tmp_path, "--setup", "core")
    assert result.returncode == 2
    assert "invalid choice: 'core'" in result.stderr
    assert not (tmp_path / "call.txt").exists()  # no session was started
