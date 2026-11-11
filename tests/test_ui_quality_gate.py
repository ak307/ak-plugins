"""Tests for the arkar UI quality gate (Stop hook, and the before-writing check).

Run from the repo root:  python3 -m pytest tests -q
They feed Stop events with small session transcripts to the real script
(through the bash launcher) and check whether it lets Claude stop.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

HOOKS = Path(__file__).resolve().parents[1] / "plugins" / "arkar-dev-standards" / "hooks"
LAUNCHER = HOOKS / "ui_quality_gate.sh"
BASH = shutil.which("bash")

COMPLETE_DESIGN = ("# Design\n## Direction\nData-centric\n## Build sheet — claims queue\n"
                   "Component plan: reuse Button, Field; extend Badge (overdue); new QueueRow\n"
                   "Job: ...\nStates: loading · empty · error + retry · success\nAcceptance: ...\n")
REVIEWER = {"type": "assistant", "message": {"content": [
    {"type": "tool_use", "name": "Agent", "input": {"description": "Independent review"}}]}}
COMPLETE_RECORD = ("# Premium pass\n## Verify\n- Motion (filmstrips: load, open card): eased, quick\n"
                   "- Interaction probe: no hover 3→0, no focus 1→0\n"
                   "- Experience walk (record.cjs): happy, fail+retry, keyboard, phone → retry kept input\n"
                   "- Security check (security-check.cjs): storage 1→0 · proposals: none\n"
                   "## Independent review\nCritical 0 · major 2 (fixed) · minor 3\n")


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
        (tmp_path / "app" / "qa-screenshots" / "walk-checkin.mp4").write_bytes(b"")
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
    assert "Build sheet" in reason
    assert "premium-pass.md" in reason


def test_redesign_missing_review_motion_and_walk_is_blocked(tmp_path):
    events = skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + write_project(
        tmp_path, COMPLETE_DESIGN, "# Premium pass\n- Screens looked at: ...\n")
    reason = json.loads(run_gate(tmp_path, events))["reason"]
    assert "Independent review" in reason
    assert "film" in reason
    assert "experience walk" in reason


def test_complete_redesign_passes(tmp_path):
    events = skills(*ALL_NINE) + [REVIEWER] + write_project(
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


def test_the_limit_counts_across_turns_not_only_within_one_stop(tmp_path):
    # Seen live: the limit reset on every new message, so one false alarm blocked every later reply.
    import uuid
    transcript = tmp_path / "session.jsonl"
    transcript.write_text(json.dumps(tool_use("Edit", file_path=str(tmp_path / "index.html"))))
    session = f"test-{uuid.uuid4()}"
    decisions = []
    for _ in range(5):  # five separate turns: stop_hook_active is false each time
        hook_event = {"transcript_path": str(transcript), "cwd": str(tmp_path), "session_id": session,
                      "stop_hook_active": False}
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
    assert "Build sheet" in reason and "arkar-ui-motion-design" in reason


def test_shell_logs_and_appends_are_not_rewrites(tmp_path):
    events = skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + [
        tool_use("Bash", command="node probe.cjs http://127.0.0.1:8000/ > probe.log 2>&1"),
        tool_use("Bash", command="echo '.x{}' | tee -a styles.css")]
    assert run_gate(tmp_path, events) == ""


def test_html_added_to_python_through_the_shell_counts(tmp_path):
    # A form field added to a Python-rendered page by a shell edit is a UI change.
    command = ("python3 - <<'EOF'\np = 'app/main.py'\ns = open(p).read()\n"
               "s = s.replace('</form>', '<label>Phone <input name=\"phone\" type=\"tel\"></label></form>')\n"
               "open(p, 'w').write(s)\nEOF")
    assert "arkar-ui-intelligence" in run_gate(tmp_path, [tool_use("Bash", command=command)])


def test_transcript_lines_with_raw_control_characters_are_read(tmp_path):
    # Real transcripts can carry raw tabs inside strings; those lines must not be skipped.
    transcript = tmp_path / "session.jsonl"
    edit = json.dumps(tool_use("Write", file_path=str(tmp_path / "app" / "index.html"), content="x"))
    transcript.write_text(edit.replace('"content": "x"', '"content": "a\tb"'))
    hook_event = {"hook_event_name": "Stop", "transcript_path": str(transcript), "cwd": str(tmp_path),
                  "stop_hook_active": False}
    result = subprocess.run([BASH, str(LAUNCHER)], input=json.dumps(hook_event), capture_output=True,
                            text=True, timeout=30)
    assert "arkar-ui-intelligence" in result.stdout


def test_scratch_pages_outside_the_project_are_ignored(tmp_path):
    outside = tmp_path.parent / "scratchpad-elsewhere" / "index.html"
    assert run_gate(tmp_path, [tool_use("Write", file_path=str(outside), content="<button>x</button>")]) == ""


def test_editing_a_skills_own_assets_is_not_product_ui(tmp_path):
    asset = tmp_path / "plugins" / "kit" / "skills" / "arkar-ui-design-system" / "assets" / "liquid-glass.css"
    assert run_gate(tmp_path, [tool_use("Write", file_path=str(asset), content=".lg-bar{}")]) == ""


def test_build_sheet_added_to_an_existing_design_doc_needs_verify_and_review(tmp_path):
    # New screens in an existing product: the sheet goes into DESIGN.md by an edit, not a rewrite.
    (tmp_path / "DESIGN.md").write_text("# Design\n## Build sheet — two-factor sign-in\n"
                                        "Component plan: reuse Field, Button\nStates: ...\n")
    events = skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + [
        tool_use("Edit", file_path=str(tmp_path / "DESIGN.md"), old_string="x",
                 new_string="## Build sheet — two-factor sign-in\nStates: ..."),
        tool_use("Write", file_path=str(tmp_path / "resources" / "views" / "auth" / "mfa.blade.php"))]
    reason = json.loads(run_gate(tmp_path, events))["reason"]
    assert "premium-pass.md" in reason
    assert "arkar-ui-discovery" not in reason  # not a redesign: the nine-specialist rule doesn't apply
    (tmp_path / "qa-screenshots").mkdir()
    (tmp_path / "qa-screenshots" / "premium-pass.md").write_text(COMPLETE_RECORD)
    (tmp_path / "qa-screenshots" / "journeys").mkdir()
    (tmp_path / "qa-screenshots" / "journeys" / "mfa.webm").write_bytes(b"")
    assert run_gate(tmp_path, events + [REVIEWER]) == ""


def test_old_record_wording_still_counts_as_a_review(tmp_path):
    # Records written before the restructure (cold read / critique) aren't rejected for their headings.
    record = COMPLETE_RECORD.replace("## Independent review", "## Independent critique")
    events = skills(*ALL_NINE) + [REVIEWER] + write_project(tmp_path, COMPLETE_DESIGN, record)
    assert run_gate(tmp_path, events) == ""


def test_reading_the_skill_file_counts_as_loading_it(tmp_path):
    # The documented fallback when the Skill tool fails.
    events = [tool_use("Read", file_path="/home/ak/.claude/plugins/x/skills/arkar-ui-intelligence/SKILL.md"),
              tool_use("Read", file_path="/home/ak/.claude/plugins/x/skills/arkar-ui-visual-qa/SKILL.md"),
              tool_use("Edit", file_path=str(tmp_path / "src" / "Button.tsx"))]
    assert run_gate(tmp_path, events) == ""


# ---- Before writing (PreToolUse) ------------------------------------------------

def run_before_write(tmp_path: Path, history: list, tool: str, session: str = "", **tool_input) -> dict | None:
    transcript = tmp_path / "session.jsonl"
    transcript.write_text("\n".join(json.dumps(event) for event in history))
    hook_event = {"hook_event_name": "PreToolUse", "tool_name": tool, "tool_input": tool_input,
                  "transcript_path": str(transcript), "cwd": str(tmp_path), "session_id": session}
    result = subprocess.run([BASH, str(LAUNCHER)], input=json.dumps(hook_event), capture_output=True,
                            text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    output = result.stdout.strip()
    return json.loads(output)["hookSpecificOutput"] if output else None


def test_ui_write_before_the_orchestrator_is_held(tmp_path):
    decision = run_before_write(tmp_path, [], "Write", file_path=str(tmp_path / "resources" / "views" / "mfa.blade.php"),
                                content="<form></form>")
    assert decision and decision["permissionDecision"] == "deny"
    assert "arkar-ui-intelligence" in decision["permissionDecisionReason"]
    assert "Build sheet" in decision["permissionDecisionReason"]


def test_ui_write_after_the_orchestrator_goes_ahead(tmp_path):
    history = skills("arkar-ui-intelligence")
    assert run_before_write(tmp_path, history, "Edit", file_path=str(tmp_path / "src" / "Login.tsx"),
                            old_string="a", new_string="b") is None


def test_markup_written_into_code_is_held_too(tmp_path):
    decision = run_before_write(tmp_path, [], "MultiEdit", file_path=str(tmp_path / "app" / "main.py"),
                                edits=[{"old_string": "x", "new_string": "html = '<button>Save</button>'"}])
    assert decision and decision["permissionDecision"] == "deny"


@pytest.mark.parametrize("path", ["app/main.py", "DESIGN.md", "tests/page.html", "node_modules/x/a.css"])
def test_non_ui_writes_are_never_held(tmp_path, path):
    assert run_before_write(tmp_path, [], "Write", file_path=str(tmp_path / path), content="total = 1") is None


def test_scratch_pages_outside_the_project_are_not_held(tmp_path):
    outside = tmp_path.parent / "scratch-elsewhere" / "index.html"
    assert run_before_write(tmp_path, [], "Write", file_path=str(outside), content="<main></main>") is None


def test_hold_is_asked_twice_at_most_then_lets_work_go_on(tmp_path):
    import uuid
    session = f"test-{uuid.uuid4()}"
    decisions = [run_before_write(tmp_path, [], "Write", session=session, file_path=str(tmp_path / "index.html"),
                                  content="<main></main>") for _ in range(4)]
    assert [bool(decision) for decision in decisions] == [True, True, False, False]


def test_before_write_check_is_wired_in_hooks_json():
    hooks = json.loads((HOOKS / "hooks.json").read_text())["hooks"]
    entries = [entry for entry in hooks["PreToolUse"] if "ui_quality_gate.sh" in entry["hooks"][0]["command"]]
    assert entries and set(entries[0]["matcher"].split("|")) >= {"Write", "Edit", "MultiEdit"}


def test_a_held_write_is_not_counted_as_a_ui_change(tmp_path):
    # Found in a real session: the before-writing check held index.html, and the end gate then
    # insisted "UI files were changed" although nothing had been written.
    write = tool_use("Write", file_path=str(tmp_path / "index.html"), content="<button>Save</button>")
    write["message"]["content"][0]["id"] = "toolu_1"
    held = {"type": "user", "message": {"content": [
        {"type": "tool_result", "tool_use_id": "toolu_1", "is_error": True, "content": "arkar UI quality gate: ..."}]}}
    assert run_gate(tmp_path, [write, held]) == ""
    written = {"type": "user", "message": {"content": [
        {"type": "tool_result", "tool_use_id": "toolu_1", "content": "File created successfully"}]}}
    assert "arkar-ui-intelligence" in run_gate(tmp_path, [write, written])


def test_a_self_review_instead_of_the_subagent_is_sent_back(tmp_path):
    # Seen in eval runs: "cold review done in-session (no subagent spawned)" although the Agent tool existed.
    record = COMPLETE_RECORD.replace("Critical 0", "Cold review done in-session (no subagent spawned). Critical 0")
    reason = json.loads(run_gate(tmp_path, skills(*ALL_NINE) + write_project(tmp_path, COMPLETE_DESIGN, record)))["reason"]
    assert "without a subagent" in reason


def test_a_cold_review_counts_when_there_is_no_agent_tool(tmp_path):
    record = COMPLETE_RECORD + "Cold review: no Agent tool in this session.\n"
    assert run_gate(tmp_path, skills(*ALL_NINE) + write_project(tmp_path, COMPLETE_DESIGN, record)) == ""


def test_a_record_without_the_interaction_probe_is_sent_back(tmp_path):
    # Seen in eval runs: the probe was skipped while everything else was recorded.
    record = COMPLETE_RECORD.replace("- Interaction probe: no hover 3→0, no focus 1→0\n", "")
    events = skills(*ALL_NINE) + [REVIEWER] + write_project(tmp_path, COMPLETE_DESIGN, record)
    assert "interaction probe" in json.loads(run_gate(tmp_path, events))["reason"]


def test_a_build_sheet_without_a_component_plan_is_sent_back(tmp_path):
    design = COMPLETE_DESIGN.replace("Component plan: reuse Button, Field; extend Badge (overdue); new QueueRow\n", "")
    events = skills(*ALL_NINE) + [REVIEWER] + write_project(tmp_path, design, COMPLETE_RECORD)
    assert "component plan" in json.loads(run_gate(tmp_path, events))["reason"]


def test_test_fixtures_are_not_product_ui(tmp_path):
    # Building a sample app under evals/fixtures/ for tests is test data, not a product to design.
    fixture = tmp_path / "evals" / "fixtures" / "opsdesk-react"
    events = [tool_use("Write", file_path=str(fixture / "src" / "App.jsx"), content="<main></main>"),
              tool_use("Write", file_path=str(fixture / "DESIGN.md"), content="# Design")]
    assert run_gate(tmp_path, events) == ""
    assert run_before_write(tmp_path, [], "Write", file_path=str(fixture / "index.html"), content="<main/>") is None
    # A real UI edit in the same session doesn't turn the fixture's DESIGN.md into a redesign.
    events += skills("arkar-ui-intelligence", "arkar-ui-visual-qa") + [
        tool_use("Edit", file_path=str(tmp_path / "src" / "Button.tsx"))]
    assert run_gate(tmp_path, events) == ""


def test_an_experience_walk_without_videos_is_sent_back(tmp_path):
    # Seen in eval runs: flows walked with step screenshots only, so timing was never seen.
    events = skills(*ALL_NINE) + [REVIEWER] + write_project(tmp_path, COMPLETE_DESIGN, COMPLETE_RECORD)
    (tmp_path / "app" / "qa-screenshots" / "walk-checkin.mp4").unlink()
    assert "no videos" in json.loads(run_gate(tmp_path, events))["reason"]


def test_a_walk_without_videos_passes_when_the_record_says_why(tmp_path):
    record = COMPLETE_RECORD + "Experience walk: couldn't record video (no browser video support here).\n"
    events = skills(*ALL_NINE) + [REVIEWER] + write_project(tmp_path, COMPLETE_DESIGN, record)
    (tmp_path / "app" / "qa-screenshots" / "walk-checkin.mp4").unlink()
    assert run_gate(tmp_path, events) == ""


def test_a_record_without_the_security_check_is_sent_back(tmp_path):
    record = COMPLETE_RECORD.replace("- Security check (security-check.cjs): storage 1→0 · proposals: none\n", "")
    events = skills(*ALL_NINE) + [REVIEWER] + write_project(tmp_path, COMPLETE_DESIGN, record)
    assert "security check" in json.loads(run_gate(tmp_path, events))["reason"]
