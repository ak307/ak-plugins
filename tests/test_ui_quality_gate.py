"""Tests for the arkar UI quality gate (Stop hook).

Run from the repo root:  python3 -m pytest tests -q
They feed Stop events with small session transcripts to the real script
(through the bash launcher) and check whether it lets Claude stop.
"""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

HOOKS = Path(__file__).resolve().parents[1] / "plugins" / "arkar-dev-standards" / "hooks"
LAUNCHER = HOOKS / "ui_quality_gate.sh"
BASH = shutil.which("bash")

COMPLETE_DESIGN = "# Design\n## Direction\nData-centric\n## Compositions\n- Obvious: ...\n- Chosen: ...\n"
COMPLETE_RECORD = ("# Premium pass\n- Motion (filmstrips: load, open card): eased, quick\n"
                   "## Independent critique\n1. generic header → recomposed\n"
                   "## Experience test\nRound 1: feedback 7, errors 6 → retry kept input; round 2: all ≥ 7\n")


def tool_use(name: str, **tool_input) -> dict:
    return {"type": "assistant", "message": {"content": [{"type": "tool_use", "name": name, "input": tool_input}]}}


def run_gate(tmp_path: Path, events: list, stop_hook_active: bool = False) -> str:
    transcript = tmp_path / "session.jsonl"
    transcript.write_text("\n".join(json.dumps(event) for event in events))
    hook_event = {"hook_event_name": "Stop", "transcript_path": str(transcript), "cwd": str(tmp_path),
                  "stop_hook_active": stop_hook_active}
    result = subprocess.run([BASH, str(LAUNCHER)], input=json.dumps(hook_event), capture_output=True,
                            text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


ALL_NINE = ("arkar-ui-intelligence", "arkar-ui-discovery", "arkar-ui-art-direction", "arkar-ui-ux-engineering",
            "arkar-ui-design-system", "arkar-ui-motion-design", "arkar-ui-responsive-design",
            "arkar-ui-accessibility", "arkar-ui-implementation", "arkar-ui-visual-qa")


def skills(*names: str) -> list:
    return [tool_use("Skill", skill=f"arkar-dev-standards:{name}") for name in names]


def write_project(tmp_path: Path, design: str | None, record: str | None) -> list:
    """Files on disk plus the transcript events that wrote them."""
    events = [tool_use("Write", file_path=str(tmp_path / "app" / "index.html"))]
    (tmp_path / "app").mkdir(exist_ok=True)
    (tmp_path / "app" / "index.html").write_text("<h1>x</h1>")
    if design is not None:
        (tmp_path / "app" / "DESIGN.md").write_text(design)
        events.append(tool_use("Write", file_path=str(tmp_path / "app" / "DESIGN.md")))
    if record is not None:
        (tmp_path / "app" / "qa-screenshots").mkdir(exist_ok=True)
        (tmp_path / "app" / "qa-screenshots" / "premium-pass.md").write_text(record)
    return events


pytestmark = pytest.mark.skipif(BASH is None, reason="bash not available")


def test_no_ui_edits_lets_claude_stop(tmp_path):
    events = [tool_use("Write", file_path=str(tmp_path / "app" / "main.py"))]
    assert run_gate(tmp_path, events) == ""


def test_ui_edit_without_orchestrator_is_blocked(tmp_path):
    events = [tool_use("Edit", file_path=str(tmp_path / "resources" / "views" / "claims.blade.php"))]
    output = json.loads(run_gate(tmp_path, events))
    assert output["decision"] == "block"
    assert "arkar-ui-intelligence" in output["reason"]
    assert "arkar-ui-visual-qa" in output["reason"]


def test_small_change_with_both_skills_passes(tmp_path):
    events = skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + [
        tool_use("Edit", file_path=str(tmp_path / "src" / "Button.tsx"))]
    assert run_gate(tmp_path, events) == ""


def test_redesign_missing_evidence_is_blocked(tmp_path):
    events = skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + write_project(
        tmp_path, "# Design\n## Direction\n", None)
    reason = json.loads(run_gate(tmp_path, events))["reason"]
    assert "Compositions" in reason
    assert "premium-pass.md" in reason


def test_redesign_missing_critique_and_motion_is_blocked(tmp_path):
    events = skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + write_project(
        tmp_path, COMPLETE_DESIGN, "# Premium pass\n- Round 1: ...\n")
    reason = json.loads(run_gate(tmp_path, events))["reason"]
    assert "Independent critique" in reason
    assert "film" in reason
    assert "Experience test" in reason


def test_complete_redesign_passes(tmp_path):
    events = skills(*ALL_NINE) + write_project(
        tmp_path, COMPLETE_DESIGN, COMPLETE_RECORD)
    assert run_gate(tmp_path, events) == ""


def test_never_blocks_twice_in_a_row_without_a_session_id(tmp_path):
    events = [tool_use("Edit", file_path=str(tmp_path / "index.html"))]
    assert run_gate(tmp_path, events, stop_hook_active=True) == ""


def test_insists_up_to_three_times_then_lets_go(tmp_path):
    import uuid
    transcript = tmp_path / "session.jsonl"
    transcript.write_text(json.dumps(tool_use("Edit", file_path=str(tmp_path / "index.html"))))
    session = f"test-{uuid.uuid4()}"
    decisions = []
    for attempt in range(5):
        hook_event = {"transcript_path": str(transcript), "cwd": str(tmp_path), "session_id": session,
                      "stop_hook_active": attempt > 0}
        result = subprocess.run([BASH, str(LAUNCHER)], input=json.dumps(hook_event), capture_output=True,
                                text=True, timeout=30)
        decisions.append(bool(result.stdout.strip()))
    assert decisions == [True, True, True, False, False]


def test_bad_input_never_traps_the_session(tmp_path):
    result = subprocess.run([BASH, str(LAUNCHER)], input="not json", capture_output=True, text=True, timeout=30)
    assert result.returncode == 0 and result.stdout.strip() == ""
    hook_event = {"transcript_path": str(tmp_path / "missing.jsonl"), "cwd": str(tmp_path)}
    result = subprocess.run([BASH, str(LAUNCHER)], input=json.dumps(hook_event), capture_output=True,
                            text=True, timeout=30)
    assert result.returncode == 0 and result.stdout.strip() == ""


def test_dependency_and_test_files_are_ignored(tmp_path):
    events = [tool_use("Write", file_path=str(tmp_path / "node_modules" / "x" / "a.css")),
              tool_use("Write", file_path=str(tmp_path / "tests" / "page.html"))]
    assert run_gate(tmp_path, events) == ""


def test_project_inside_a_test_folder_is_still_checked(tmp_path):
    project = tmp_path / "test" / "shop"
    project.mkdir(parents=True)
    events = [tool_use("Write", file_path=str(project / "index.html"))]
    transcript = tmp_path / "session.jsonl"
    transcript.write_text("\n".join(json.dumps(event) for event in events))
    hook_event = {"transcript_path": str(transcript), "cwd": str(project)}
    result = subprocess.run([BASH, str(LAUNCHER)], input=json.dumps(hook_event), capture_output=True,
                            text=True, timeout=30)
    assert json.loads(result.stdout)["decision"] == "block"


def test_redesign_without_all_specialists_is_blocked(tmp_path):
    events = skills("arkar-ui-intelligence", "arkar-ui-art-direction", "arkar-ui-visual-qa") + write_project(
        tmp_path, COMPLETE_DESIGN, COMPLETE_RECORD)
    reason = json.loads(run_gate(tmp_path, events))["reason"]
    assert "arkar-ui-motion-design" in reason and "arkar-ui-discovery" in reason
    assert "arkar-ui-art-direction" not in reason.split("not loaded:")[1]


def test_small_edit_to_existing_design_doc_needs_no_redesign_evidence(tmp_path):
    (tmp_path / "DESIGN.md").write_text("# Design\n")
    events = skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + [
        tool_use("Edit", file_path=str(tmp_path / "styles.css")),
        tool_use("Edit", file_path=str(tmp_path / "DESIGN.md"))]
    assert run_gate(tmp_path, events) == ""


def test_html_built_in_python_counts_as_ui(tmp_path):
    events = [{"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Edit", "input": {
        "file_path": str(tmp_path / "app.py"), "old_string": "x",
        "new_string": 'html += f"<label for=phone>Phone</label><input id=phone name=phone>"'}}]}}]
    assert json.loads(run_gate(tmp_path, events))["decision"] == "block"


def test_python_without_markup_is_not_ui(tmp_path):
    events = [tool_use("Edit", file_path=str(tmp_path / "app.py"), old_string="a", new_string="total = a + b")]
    assert run_gate(tmp_path, events) == ""


def test_files_written_through_the_shell_count(tmp_path):
    (tmp_path / "kopi").mkdir()
    (tmp_path / "kopi" / "DESIGN.md").write_text("# Design\n## Direction\n")
    events = skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + [
        tool_use("Bash", command="cd kopi && cat > DESIGN.md <<'EOF'\n# Design\nEOF"),
        tool_use("Bash", command="cd kopi && cat > index.html <<'EOF'\n<main></main>\nEOF")]
    reason = json.loads(run_gate(tmp_path, events))["reason"]
    assert "Compositions" in reason and "arkar-ui-motion-design" in reason


def test_shell_logs_and_appends_are_not_rewrites(tmp_path):
    events = skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + [
        tool_use("Bash", command="node probe.cjs http://127.0.0.1:8000/ > probe.log 2>&1"),
        tool_use("Bash", command="echo '.x{}' | tee -a styles.css")]
    assert run_gate(tmp_path, events) == ""
