"""Tests for the arkar security gate (Stop hook): code changes must go through arkar-security."""
from __future__ import annotations

import json
import shutil
import subprocess
import uuid
from pathlib import Path

import pytest

LAUNCHER = Path(__file__).resolve().parents[1] / "plugins" / "arkar-dev-standards" / "hooks" / "security_gate.sh"
BASH = shutil.which("bash")
pytestmark = pytest.mark.skipif(BASH is None, reason="bash not available")


def tool_use(name: str, **tool_input) -> dict:
    return {"type": "assistant", "message": {"content": [{"type": "tool_use", "name": name, "input": tool_input}]}}


def run_gate(tmp_path: Path, events: list, session: str = "", stop_hook_active: bool = False) -> str:
    transcript = tmp_path / "session.jsonl"
    transcript.write_text("\n".join(json.dumps(event) for event in events))
    hook_event = {"hook_event_name": "Stop", "transcript_path": str(transcript), "cwd": str(tmp_path),
                  "session_id": session, "stop_hook_active": stop_hook_active}
    result = subprocess.run([BASH, str(LAUNCHER)], input=json.dumps(hook_event), capture_output=True,
                            text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def test_code_change_without_the_skill_is_sent_back(tmp_path):
    reason = json.loads(run_gate(tmp_path, [tool_use("Edit", file_path=str(tmp_path / "app" / "Http" / "Kernel.php"))]))
    assert "arkar-security" in reason["reason"] and "🟢" in reason["reason"]


def test_loading_the_skill_or_reading_its_file_passes(tmp_path):
    edit = tool_use("Write", file_path=str(tmp_path / "app" / "services" / "orders.py"))
    assert run_gate(tmp_path, [tool_use("Skill", skill="arkar-dev-standards:arkar-security"), edit]) == ""
    read = tool_use("Read", file_path="/x/plugins/arkar-dev-standards/skills/arkar-security/SKILL.md")
    assert run_gate(tmp_path, [read, edit]) == ""


def test_styles_docs_tests_and_files_outside_the_project_dont_count(tmp_path):
    events = [tool_use("Edit", file_path=str(tmp_path / "css" / "app.css")),
              tool_use("Edit", file_path=str(tmp_path / "README.md")),
              tool_use("Edit", file_path=str(tmp_path / "tests" / "test_orders.py")),
              tool_use("Write", file_path="/tmp/scratch/try.py")]
    assert run_gate(tmp_path, events) == ""


def test_dependency_manifest_counts(tmp_path):
    assert run_gate(tmp_path, [tool_use("Edit", file_path=str(tmp_path / "package.json"))]) != ""


def test_insists_at_most_twice_per_session_across_turns(tmp_path):
    session = f"test-{uuid.uuid4()}"
    events = [tool_use("Edit", file_path=str(tmp_path / "routes" / "web.php"))]
    decisions = [bool(run_gate(tmp_path, events, session=session)) for _ in range(4)]
    assert decisions == [True, True, False, False]
