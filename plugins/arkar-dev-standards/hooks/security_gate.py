"""arkar security gate — makes sure code changes went through arkar-security.

Security written only as a rule gets skipped on "small" changes, and new
projects never reached the change workflow's checklist. At the end of a
session (Stop) that changed code with logic — PHP, Python, JS/TS, Dart,
dependency manifests — this hook checks that `arkar-security` was loaded
(the Skill tool, or its SKILL.md read as the fallback). The skill itself
scales the work to the change, so loading it costs little on trivial edits.

If it wasn't loaded, the stop is blocked with a short reason — at most twice
per session, counted across turns, then the session may stop. It never
applies fixes: in existing code, security fixes stay proposals labelled
🟢 safe or 🟠 risky for AK. Any error lets the session go on normally.

Input: the hook event as JSON on stdin. Output: a JSON decision, or nothing.
Standard library only, Python 3.8+.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ui_quality_gate import SKIP_PATH, blocks_so_far, inside, loaded, read_session, relative  # noqa: E402

SECURITY_SKILL = "arkar-security"
MAX_BLOCKS = 2
CODE_FILE = re.compile(
    r"\.(php|py|js|mjs|cjs|jsx|ts|tsx|vue|svelte|dart|rb|go|java|kt|cs)$"
    r"|(^|/)(composer\.json|package\.json|pyproject\.toml|requirements[\w.-]*\.txt|pubspec\.yaml|\.env\.example)$",
    re.IGNORECASE,
)


def is_project_code(path: str, cwd: Path) -> bool:
    plain = path[:-7] if path.endswith("#markup") else path
    return bool(CODE_FILE.search(plain)) and inside(plain, cwd) and not SKIP_PATH.search(relative(plain, cwd))


def decide(event: dict) -> str | None:
    session_id = str(event.get("session_id") or "")
    if session_id and blocks_so_far(session_id, kind="security") >= MAX_BLOCKS:
        return None
    if event.get("stop_hook_active") and not session_id:
        return None
    transcript_path = event.get("transcript_path")
    if not transcript_path or not Path(transcript_path).exists():
        return None
    skills, edited, _written, _sheet = read_session(transcript_path)
    cwd = Path(event.get("cwd") or ".")
    changed = [path for path in edited if is_project_code(path, cwd)]
    if not changed or loaded(skills, SECURITY_SKILL):
        return None
    if session_id:
        blocks_so_far(session_id, add=True, kind="security")
    return ("arkar security gate — code was changed but `arkar-security` wasn't loaded. Load it with the Skill tool "
            "(or read its SKILL.md), apply what it requires for this change — it scales: copy or styling needs "
            "nothing, logic needs its checks, sensitive features need its review — and add the Security line to "
            "your report. In existing code, security fixes are proposals labelled 🟢 safe or 🟠 risky for AK, "
            "never applied unasked.")


def main() -> None:
    try:
        reason = decide(json.loads(sys.stdin.read() or "{}"))
    except Exception:  # The gate must never trap a session.
        return
    if reason:
        print(json.dumps({"decision": "block", "reason": reason}))


if __name__ == "__main__":
    main()
