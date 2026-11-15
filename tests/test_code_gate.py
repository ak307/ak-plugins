"""Tests for the arkar code gate (Stop hook): code changes must go through arkar-security and arkar-testing."""
from __future__ import annotations

import json
import shutil
import subprocess
import uuid
from pathlib import Path

import pytest

LAUNCHER = Path(__file__).resolve().parents[1] / "plugins" / "arkar-dev-standards" / "hooks" / "code_gate.sh"
BASH = shutil.which("bash")
pytestmark = pytest.mark.skipif(BASH is None, reason="bash not available")


def tool_use(name: str, **tool_input) -> dict:
    return {"type": "assistant", "message": {"content": [{"type": "tool_use", "name": name, "input": tool_input}]}}


SECURITY_LOADED = tool_use("Skill", skill="arkar-dev-standards:arkar-security")
TESTING_LOADED = tool_use("Skill", skill="arkar-dev-standards:arkar-testing")


def run_gate(tmp_path: Path, events: list, session: str = "", stop_hook_active: bool = False) -> str:
    transcript = tmp_path / "session.jsonl"
    transcript.write_text("\n".join(json.dumps(event) for event in events))
    hook_event = {"hook_event_name": "Stop", "transcript_path": str(transcript), "cwd": str(tmp_path),
                  "session_id": session, "stop_hook_active": stop_hook_active}
    result = subprocess.run([BASH, str(LAUNCHER)], input=json.dumps(hook_event), capture_output=True,
                            text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def reason_given(tmp_path: Path, events: list) -> str:
    return json.loads(run_gate(tmp_path, events))["reason"]


def edit_of(tmp_path: Path, name: str) -> dict:
    return tool_use("Edit", file_path=str(tmp_path / name))


def test_code_change_without_either_skill_is_sent_back_once_for_both(tmp_path):
    reason = reason_given(tmp_path, [edit_of(tmp_path, "app/Http/Kernel.php")])
    assert "`arkar-security`" in reason and "🟢" in reason
    assert "`arkar-testing`" in reason and "Never skip, weaken or delete a failing test" in reason


def test_testing_is_asked_for_when_only_security_was_loaded(tmp_path):
    reason = reason_given(tmp_path, [SECURITY_LOADED, edit_of(tmp_path, "app/services/orders.py")])
    assert "arkar-testing" in reason and "arkar-security" not in reason


def test_security_is_asked_for_when_only_testing_was_loaded(tmp_path):
    reason = reason_given(tmp_path, [TESTING_LOADED, edit_of(tmp_path, "app/services/orders.py")])
    assert "arkar-security" in reason and "arkar-testing" not in reason


def test_the_testing_reason_puts_the_test_target_first(tmp_path):
    # The gate asks a session to test: it must not become a reason to run tests against a live database.
    reason = reason_given(tmp_path, [SECURITY_LOADED, edit_of(tmp_path, "app/services/orders.py")])
    assert "check where the tests point before running anything" in reason
    assert "otherwise don't run" in reason


def test_the_session_is_asked_for_its_whole_report_again(tmp_path):
    # Sent back, a session tends to end on the additions alone, and the last message is the one AK reads.
    reason = reason_given(tmp_path, [edit_of(tmp_path, "app/services/orders.py")])
    assert reason.endswith("give your final report again in full, with these lines in it — it replaces the one before.")


def test_loading_both_skills_passes(tmp_path):
    edit = tool_use("Write", file_path=str(tmp_path / "app" / "services" / "orders.py"))
    assert run_gate(tmp_path, [SECURITY_LOADED, TESTING_LOADED, edit]) == ""


def test_reading_the_skill_files_counts_as_loading_them(tmp_path):
    # When the Skill tool fails, reading the skill's file is the documented fallback.
    read_security = tool_use("Read", file_path="/x/plugins/arkar-dev-standards/skills/arkar-security/SKILL.md")
    read_testing = tool_use("Read", file_path="/x/plugins/arkar-dev-standards/skills/arkar-testing/SKILL.md")
    assert run_gate(tmp_path, [read_security, read_testing, edit_of(tmp_path, "app/services/orders.py")]) == ""


@pytest.mark.parametrize("test_file", [
    "tests/test_orders.py", "tests/Feature/LoanTest.php", "tests/conftest.py", "src/orders.test.ts",
    "e2e/checkout.spec.ts", "lib/orders_test.dart", "pkg/orders_test.go", "src/test/java/OrderTest.java",
])
def test_a_change_to_tests_alone_needs_the_testing_skill_only(tmp_path, test_file):
    reason = reason_given(tmp_path, [edit_of(tmp_path, test_file)])
    assert "arkar-testing" in reason and "arkar-security" not in reason
    assert run_gate(tmp_path, [TESTING_LOADED, edit_of(tmp_path, test_file)]) == ""


@pytest.mark.parametrize("test_file", ["test_orders.py", "src/__tests__/orders.tsx", "spec/models/order_spec.rb"])
def test_tests_the_security_check_takes_for_code_need_both_as_before(tmp_path, test_file):
    # The security check's own list of test paths is shorter and is left as it was: what it asks for is AK's to change.
    reason = reason_given(tmp_path, [edit_of(tmp_path, test_file)])
    assert "arkar-testing" in reason and "arkar-security" in reason


@pytest.mark.parametrize("code_file", ["app/contest_results.py", "app/latest.py", "src/attest/signer.ts", "app/protest.php"])
def test_a_name_that_only_contains_the_word_test_is_code(tmp_path, code_file):
    assert "arkar-security" in reason_given(tmp_path, [TESTING_LOADED, edit_of(tmp_path, code_file)])


@pytest.mark.parametrize("not_project_code", [
    "css/app.css", "README.md", "tests/fixtures/orders.json",
    "node_modules/lib/test/index.test.js", "vendor/pkg/tests/ThingTest.php", ".venv/lib/pkg/tests/test_thing.py",
])
def test_styles_docs_test_data_and_a_dependencys_own_tests_dont_count(tmp_path, not_project_code):
    assert run_gate(tmp_path, [edit_of(tmp_path, not_project_code)]) == ""


def test_files_outside_the_project_dont_count(tmp_path):
    events = [tool_use("Write", file_path="/tmp/scratch/try.py"), tool_use("Write", file_path="/tmp/scratch/tests/test_try.py")]
    assert run_gate(tmp_path, events) == ""


def test_dependency_manifest_counts(tmp_path):
    reason = reason_given(tmp_path, [edit_of(tmp_path, "package.json")])
    assert "arkar-security" in reason and "arkar-testing" in reason


def test_insists_at_most_twice_per_session_across_turns(tmp_path):
    session = f"test-{uuid.uuid4()}"
    events = [edit_of(tmp_path, "routes/web.php")]
    decisions = [bool(run_gate(tmp_path, events, session=session)) for _ in range(4)]
    assert decisions == [True, True, False, False]


def test_the_two_times_are_shared_by_both_skills(tmp_path):
    # Sent back for both, the session loads one: the second time names only the other, and there is no third.
    session = f"test-{uuid.uuid4()}"
    edit = edit_of(tmp_path, "routes/web.php")
    first = json.loads(run_gate(tmp_path, [edit], session=session))["reason"]
    second = json.loads(run_gate(tmp_path, [edit, SECURITY_LOADED], session=session))["reason"]
    assert "arkar-security" in first and "arkar-testing" in first
    assert "arkar-testing" in second and "arkar-security" not in second
    assert run_gate(tmp_path, [edit, SECURITY_LOADED], session=session) == ""
