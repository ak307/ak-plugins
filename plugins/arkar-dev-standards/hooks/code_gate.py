"""arkar code gate — makes sure code changes went through arkar-security and arkar-testing.

Security and testing written only as rules get skipped: on "small" changes,
and in sessions that run the tests they find without ever opening the testing
standard. At the end of a session (Stop) this hook checks which of AK's two
standards for code the session loaded (the Skill tool, or the skill's
SKILL.md read as the fallback):

- it changed code with logic — PHP, Python, JS/TS, Dart, dependency
  manifests — so `arkar-security` and `arkar-testing` are both needed;
- it changed only tests, so `arkar-testing` is needed.

Both skills scale the work to the change, so loading them costs little on
trivial edits.

"Changed" means changed by the session in any way: by Write or Edit, or on
disk while one of its shell commands or subagents was running — a script run
in the shell can change code without any tool call naming the file. A file
changed at another moment (AK in his editor) is not the session's work.

If a needed skill wasn't loaded, the stop is blocked with one short reason
that names what is missing — at most twice per session, counted across
turns, then the session may stop. It never applies fixes and never runs
tests itself: in existing code, security fixes stay proposals labelled
🟢 safe or 🟠 risky for AK, and tests run only where the always-on rules
allow. Any error lets the session go on normally.

Input: the hook event as JSON on stdin. Output: a JSON decision, or nothing.
Standard library only, Python 3.8+.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gate_common import NOT_SOURCE, SKIP_PATH, blocks_so_far, inside, loaded, read_session, relative  # noqa: E402

SECURITY_SKILL = "arkar-security"
TESTING_SKILL = "arkar-testing"
MAX_BLOCKS = 2
CODE_EXTENSION = r"\.(php|py|js|mjs|cjs|jsx|ts|tsx|vue|svelte|dart|rb|go|java|kt|cs)$"
CODE_FILE = re.compile(
    CODE_EXTENSION
    + r"|(^|/)(composer\.json|package\.json|pyproject\.toml|requirements[\w.-]*\.txt|pubspec\.yaml|\.env\.example)$",
    re.IGNORECASE,
)
TEST_FILE = re.compile(
    r"((^|/)(tests?|__tests__|spec)/.*"     # anything in a tests folder: tests/Feature/LoanTest.php
    r"|(^|/)test_[^/]*"                      # test_orders.py
    r"|(_test|_spec|\.test|\.spec))"         # orders_test.go, orders_spec.rb, orders.test.ts, orders.spec.ts
    + CODE_EXTENSION,
    re.IGNORECASE,
)
# Tests the shared list of paths to skip doesn't know, and that can only ever be tests: Jest's `__tests__` folders
# and RSpec files. A `spec/` folder or a `test_*.py` file can hold product code (an API spec, a script that opens a
# database), so those still count as code for the security check.
ONLY_EVER_A_TEST = re.compile(r"(^|/)__tests__/|(^|/)spec/.*_spec\.rb$", re.IGNORECASE)
WHAT_EACH_SKILL_ASKS = {
    SECURITY_SKILL: ("`arkar-security` — apply what it requires for this change (it scales: copy or styling needs "
                     "nothing, logic needs its checks, sensitive features need its review) and add the Security line "
                     "to your report. In existing code, security fixes are proposals labelled 🟢 safe or 🟠 risky for "
                     "AK, never applied unasked."),
    TESTING_SKILL: ("`arkar-testing` — check where the tests point before running anything (only a local or test "
                    "target; otherwise don't run, report it), test what this change needs (it scales: styling runs the "
                    "tests it touches, logic gets tests seen failing first) and add the Tests block to your report: "
                    "what ran, what you added, what couldn't run and why. Never skip, weaken or delete a failing test "
                    "to get green."),
}


def without_markup_marker(path: str) -> str:
    """The shared reader marks code that holds HTML with a `#markup` ending; this gate only needs the path."""
    return path[:-7] if path.endswith("#markup") else path


def is_project_code(path: str, cwd: Path) -> bool:
    plain = without_markup_marker(path)
    if not CODE_FILE.search(plain) or not inside(plain, cwd):
        return False
    path_in_project = relative(plain, cwd)
    return not SKIP_PATH.search(path_in_project) and not ONLY_EVER_A_TEST.search(path_in_project)


def is_project_test(path: str, cwd: Path) -> bool:
    plain = without_markup_marker(path)
    if not inside(plain, cwd):
        return False
    path_in_project = relative(plain, cwd)
    # A dependency's own tests (node_modules, vendor, .venv) are not the project's tests.
    folders = Path(path_in_project).parts[:-1]
    if any(folder in NOT_SOURCE or folder.startswith(".") for folder in folders):
        return False
    return bool(TEST_FILE.search(path_in_project))


def missing_skills(skills: set[str], edited: list[str], cwd: Path) -> list[str]:
    """The standards this session's changes need and didn't load, in the order they are named to the session."""
    code_changed = any(is_project_code(path, cwd) for path in edited)
    tests_changed = any(is_project_test(path, cwd) for path in edited)
    missing: list[str] = []
    if code_changed and not loaded(skills, SECURITY_SKILL):
        missing.append(SECURITY_SKILL)
    if (code_changed or tests_changed) and not loaded(skills, TESTING_SKILL):
        missing.append(TESTING_SKILL)
    return missing


def decide(event: dict) -> str | None:
    session_id = str(event.get("session_id") or "")
    if session_id and blocks_so_far(session_id, kind="code") >= MAX_BLOCKS:
        return None
    if event.get("stop_hook_active") and not session_id:
        return None
    transcript_path = event.get("transcript_path")
    if not transcript_path or not Path(transcript_path).exists():
        return None
    cwd = Path(event.get("cwd") or ".")
    skills, edited, _written, _sheet = read_session(transcript_path, cwd)
    missing = missing_skills(skills, edited, cwd)
    if not missing:
        return None
    if session_id:
        blocks_so_far(session_id, add=True, kind="code")
    names = " and ".join(f"`{skill}`" for skill in missing)
    lines = [f"arkar code gate — code or tests were changed without loading {names}. Load with the Skill tool (or "
             "read the SKILL.md), then:"]
    lines += [f"- {WHAT_EACH_SKILL_ASKS[skill]}" for skill in missing]
    # The message after this one is the last thing AK reads: it must not be the additions alone.
    lines.append("Then give your final report again in full, with these lines in it — it replaces the one before.")
    return "\n".join(lines)


def main() -> None:
    try:
        reason = decide(json.loads(sys.stdin.read() or "{}"))
    except Exception:  # The gate must never trap a session.
        return
    if reason:
        print(json.dumps({"decision": "block", "reason": reason}))


if __name__ == "__main__":
    main()
