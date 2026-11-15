"""Both gates see files changed by a script in the shell or by a subagent, not only by Write and Edit.

A real session changed `index.html` and `js/app.js` through a Python script run in the shell. Nothing in the
transcript named those files, so the security gate let the session finish without `arkar-security`. The project
itself is the record: files whose modification time falls inside one of the session's shell commands or subagent
runs. Files changed at any other moment (AK in his editor) are not the session's work.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import pytest

HOOKS = Path(__file__).resolve().parents[1] / "plugins"
SECURITY_GATE = HOOKS / "arkar-dev-standards" / "hooks" / "security_gate.sh"
UI_GATE = HOOKS / "arkar-ui" / "hooks" / "ui_quality_gate.sh"
BASH = shutil.which("bash")
GIT = shutil.which("git")
pytestmark = pytest.mark.skipif(BASH is None, reason="bash not available")

START = time.time() - 600  # the session's one shell command ran ten minutes ago, for ten seconds
DURING = START + 5
AFTER = START + 120


def stamp(seconds: float) -> str:
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat().replace("+00:00", "Z")


def ran(name: str, started: float = START, ended: float = START + 10, call: str = "call-1", **tool_input) -> list[dict]:
    """A tool call and its result, with the times a real transcript carries."""
    return [{"type": "assistant", "timestamp": stamp(started),
             "message": {"content": [{"type": "tool_use", "id": call, "name": name, "input": tool_input}]}},
            {"type": "user", "timestamp": stamp(ended),
             "message": {"content": [{"type": "tool_result", "tool_use_id": call, "content": "ok"}]}}]


SCRIPT = ran("Bash", command="python3 tools/apply_fix.py")  # names no file it changes


def put(project: Path, name: str, text: str, modified: float) -> Path:
    path = project / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    os.utime(path, (modified, modified))
    return path


def git(project: Path, *arguments: str) -> None:
    subprocess.run([GIT, "-c", "user.name=test", "-c", "user.email=test@example.com", *arguments], cwd=project,
                   check=True, capture_output=True)


def make_project(tmp_path: Path, with_git: bool) -> Path:
    project = tmp_path / "project"
    project.mkdir()
    if with_git:
        git(project, "init", "-q")
    return project


def run_gate(launcher: Path, tmp_path: Path, project: Path, events: list) -> str:
    transcript = tmp_path / "session.jsonl"  # kept outside the project, as Claude Code does
    transcript.write_text("\n".join(json.dumps(event) for event in events))
    hook_event = {"hook_event_name": "Stop", "transcript_path": str(transcript), "cwd": str(project), "session_id": ""}
    result = subprocess.run([BASH, str(launcher)], input=json.dumps(hook_event), capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


both_kinds = pytest.mark.parametrize("with_git", [pytest.param(True, id="git repository", marks=pytest.mark.skipif(GIT is None, reason="no git")),
                                                  pytest.param(False, id="plain folder")])


# ---- the security gate


@both_kinds
def test_code_changed_by_a_script_in_the_shell_is_sent_back(tmp_path, with_git):
    project = make_project(tmp_path, with_git)
    put(project, "app/claims.py", "def approve(claim): ...\n", DURING)
    reason = json.loads(run_gate(SECURITY_GATE, tmp_path, project, SCRIPT))["reason"]
    assert "arkar-security" in reason
    # The same change with the skill loaded passes.
    loaded = ran("Skill", call="call-0", skill="arkar-dev-standards:arkar-security")
    assert run_gate(SECURITY_GATE, tmp_path, project, loaded + SCRIPT) == ""


@both_kinds
def test_a_file_changed_at_another_moment_is_not_the_sessions_work(tmp_path, with_git):
    # AK edits a file in his editor two minutes after the session's only command finished.
    project = make_project(tmp_path, with_git)
    put(project, "app/claims.py", "def approve(claim): ...\n", AFTER)
    put(project, "app/older.py", "x = 1\n", START - 3600)
    assert run_gate(SECURITY_GATE, tmp_path, project, SCRIPT) == ""


def test_without_a_shell_command_or_subagent_the_disk_is_not_looked_at(tmp_path):
    project = make_project(tmp_path, with_git=False)
    put(project, "app/claims.py", "def approve(claim): ...\n", DURING)
    assert run_gate(SECURITY_GATE, tmp_path, project, ran("Read", file_path=str(project / "README.md"))) == ""


def test_a_command_left_in_the_background_and_a_subagent_count_until_now(tmp_path):
    project = make_project(tmp_path, with_git=False)
    put(project, "app/claims.py", "def approve(claim): ...\n", AFTER)  # after the call returned
    background = ran("Bash", command="npm run fix &", run_in_background=True)
    assert "arkar-security" in run_gate(SECURITY_GATE, tmp_path, project, background)
    assert "arkar-security" in run_gate(SECURITY_GATE, tmp_path, project, ran("Agent", prompt="apply the fix", description="fix"))
    # A command that has not returned yet is still running.
    assert "arkar-security" in run_gate(SECURITY_GATE, tmp_path, project, SCRIPT[:1])


@both_kinds
def test_dependencies_tests_and_build_output_are_not_counted(tmp_path, with_git):
    project = make_project(tmp_path, with_git)
    for name in ("node_modules/lib/index.js", "vendor/pkg/Thing.php", "tests/test_claims.py", "dist/app.js", "notes.md", "css/app.css"):
        put(project, name, "content\n", DURING)
    assert run_gate(SECURITY_GATE, tmp_path, project, SCRIPT) == ""


@pytest.mark.skipif(GIT is None, reason="no git")
def test_a_file_git_ignores_is_not_counted(tmp_path):
    project = make_project(tmp_path, with_git=True)
    put(project, ".gitignore", "generated/\n", START - 3600)
    put(project, "generated/client.py", "x = 1\n", DURING)
    assert run_gate(SECURITY_GATE, tmp_path, project, SCRIPT) == ""


def test_a_transcript_without_times_changes_nothing(tmp_path):
    # Older transcripts, and the ones in the other tests, carry no times: the gate then goes by the tool calls alone.
    project = make_project(tmp_path, with_git=False)
    put(project, "app/claims.py", "def approve(claim): ...\n", DURING)
    untimed = [{key: value for key, value in event.items() if key != "timestamp"} for event in SCRIPT]
    assert run_gate(SECURITY_GATE, tmp_path, project, untimed) == ""


# ---- the UI gate


@both_kinds
def test_a_view_changed_by_a_script_needs_the_ui_skills(tmp_path, with_git):
    project = make_project(tmp_path, with_git)
    put(project, "resources/views/claims/index.blade.php", "<table></table>\n", DURING)
    reason = json.loads(run_gate(UI_GATE, tmp_path, project, SCRIPT))["reason"]
    assert "arkar-ui-intelligence" in reason and "arkar-ui-visual-qa" in reason


@pytest.mark.skipif(GIT is None, reason="no git")
def test_a_new_ui_file_made_by_a_script_is_a_new_screen(tmp_path):
    project = make_project(tmp_path, with_git=True)
    put(project, "index.html", "<main></main>\n", START - 3600)
    git(project, "add", "-A")
    git(project, "commit", "-qm", "start")
    os.utime(project / "index.html", (START - 3600, START - 3600))
    put(project, "pages/permits.html", "<main><table></table></main>\n", DURING)  # not tracked yet: a new file
    reason = json.loads(run_gate(UI_GATE, tmp_path, project, SCRIPT))["reason"]
    assert "a new screen or component was written" in reason and "arkar-ui-motion-design" in reason


@pytest.mark.skipif(GIT is None, reason="no git")
def test_code_counts_as_ui_only_when_the_change_put_markup_into_it(tmp_path):
    project = make_project(tmp_path, with_git=True)
    page = 'def page():\n    return "<form><input name=\\"q\\"></form>"\n\n\ndef total(rows):\n    return sum(rows)\n'
    put(project, "app/report.py", page, START - 3600)
    put(project, "app/export.py", "def export(rows):\n    return rows\n", START - 3600)
    git(project, "add", "-A")
    git(project, "commit", "-qm", "start")
    # A logic line changes in a file that already held markup: code changed, the UI did not.
    put(project, "app/report.py", page.replace("sum(rows)", "sum(rows) or 0"), DURING)
    os.utime(project / "app/export.py", (START - 3600, START - 3600))
    assert run_gate(UI_GATE, tmp_path, project, SCRIPT) == ""
    assert "arkar-security" in run_gate(SECURITY_GATE, tmp_path, project, SCRIPT)
    # The script writes a button into plain code: that is UI.
    put(project, "app/export.py", 'def export(rows):\n    return "<button type=\\"submit\\">Export</button>"\n', DURING)
    assert "arkar-ui-intelligence" in run_gate(UI_GATE, tmp_path, project, SCRIPT)
