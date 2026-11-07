"""arkar UI quality gate — a Stop hook that runs when Claude is about to finish.

Written rules alone get skipped now and then ("this is a small site", a skill
that didn't load), and a skipped step is exactly where a session falls back to
a plain, generic UI. So before Claude stops, this checks the session's own
record:

1. UI files were changed → the UI orchestrator (`arkar-ui-intelligence`) and
   `arkar-ui-visual-qa` must have been loaded.
2. The session created or rewrote `DESIGN.md` (a new product, page set or
   redesign — a small edit to an existing one doesn't count) → all nine UI specialists must have been loaded, and the
   required evidence must exist: a `## Compositions` section
   in DESIGN.md, and `premium-pass.md` with an independent critique and a
   motion review from filmstrips.

When something is missing it blocks the stop with a reason that tells Claude
exactly what to finish — up to three times per session, so a session can't
just reply "I didn't get to it" — then lets it stop. Any error inside the gate
lets Claude stop normally: the gate must never trap a session.

Input: the Stop hook event as JSON on stdin. Output: a JSON decision on stdout,
or nothing. Standard library only, Python 3.8+.
"""
from __future__ import annotations

import json
import re
import sys
import tempfile
from pathlib import Path

UI_FILE = re.compile(
    r"\.(html?|css|scss|sass|less|jsx|tsx|vue|svelte|astro|dart|blade\.php|twig|erb|hbs)$"
    r"|/(components?|views?|pages?|screens?|widgets?|templates?|layouts?)/.*\.(js|ts|php|py|kt|swift)$",
    re.IGNORECASE,
)
MARKUP = re.compile(r"<(form|input|button|label|table|select|textarea|nav|header|main|section)\b[^>]*>", re.IGNORECASE)
SKIP_PATH = re.compile(r"(^|/)(node_modules|vendor|dist|build|qa-screenshots|\.git)/|(^|/)tests?/|_test\.|\.test\.|\.spec\.")
ORCHESTRATOR = "arkar-ui-intelligence"
VISUAL_QA = "arkar-ui-visual-qa"
# New products and redesigns load every specialist (the orchestrator's required minimum sets).
ALL_SPECIALISTS = ("arkar-ui-discovery", "arkar-ui-art-direction", "arkar-ui-ux-engineering",
                   "arkar-ui-design-system", "arkar-ui-motion-design", "arkar-ui-responsive-design",
                   "arkar-ui-accessibility", "arkar-ui-implementation", VISUAL_QA)


# Files written through the shell: `cat > f`, `tee f`, `> f`, Python `open("f", "w")` /
# `Path("f").write_text(...)`, `sed -i ... f`, `cp/mv ... f`. Sessions sometimes build whole sites this way.
SHELL_TARGET = re.compile(
    r"(?:>>?|\btee(?:\s+-a)?)\s*['\"]?([\w./~-]+\.[\w.]+)"
    r"|open\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"][wa]"
    r"|Path\(\s*['\"]([^'\"]+)['\"]\s*\)\s*\.write_text"
    r"|\bp\s*=\s*['\"]([^'\"]+\.[\w.]+)['\"]"
    r"|\bsed\s+-i\S*\s+(?:-e\s+)?(?:'[^']*'|\"[^\"]*\")\s+([\w./~-]+)"
    r"|\b(?:cp|mv)\s+(?:-\w+\s+)*\S+\s+([\w./~-]+\.[\w.]+)")


def shell_writes(command: str) -> list[tuple[str, bool]]:
    """(path, written whole) for each file a shell command writes."""
    found = []
    for match in SHELL_TARGET.finditer(command):
        target = next(group for group in match.groups() if group)
        if target.startswith("/dev/") or target.endswith((".log", ".txt", ".json", ".png")) and "DESIGN" not in target:
            continue
        operator = match.group(0).lstrip()
        whole = (operator.startswith(">") and not operator.startswith(">>")) or \
            (operator.startswith("tee") and not operator.startswith("tee -a"))
        found.append((target, whole))
    return found


def read_session(transcript_path: str) -> tuple[set[str], list[str], list[str]]:
    """The skills loaded, the files written or edited, and the files written whole (created or rewritten)."""
    skills: set[str] = set()
    edited: list[str] = []
    written: list[str] = []
    with open(transcript_path, encoding="utf-8", errors="ignore") as transcript:
        for line in transcript:
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") != "assistant":
                continue
            content = event.get("message", {}).get("content", [])
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                tool_input = block.get("input") or {}
                if block.get("name") == "Skill":
                    skills.add(str(tool_input.get("skill", "")))
                elif block.get("name") == "Bash":
                    for file_path, whole in shell_writes(str(tool_input.get("command", ""))):
                        edited.append(file_path)
                        if whole:
                            written.append(file_path)
                elif block.get("name") in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
                    file_path = str(tool_input.get("file_path", ""))
                    # HTML built inside code (Python f-strings, PHP echo, JS template literals) is UI too.
                    text = str(tool_input.get("content", "")) + str(tool_input.get("new_string", ""))
                    if not UI_FILE.search(file_path) and MARKUP.search(text):
                        file_path += "#markup"
                    edited.append(file_path)
                    if block.get("name") == "Write":
                        written.append(str(tool_input.get("file_path", "")))
    return skills, edited, written


def relative(path: str, cwd: Path) -> str:
    """The path inside the project, so a project kept in e.g. ~/test/ isn't ignored."""
    try:
        return Path(path).resolve().relative_to(cwd.resolve()).as_posix()
    except (ValueError, OSError):
        return Path(path).as_posix()


def loaded(skills: set[str], name: str) -> bool:
    return any(skill == name or skill.endswith(":" + name) for skill in skills)


def find_files(roots: list[Path], name: str) -> list[Path]:
    """Files called `name` under the project roots, without walking dependency folders."""
    found: list[Path] = []
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob(name):
            inside = relative(str(path), root).replace("qa-screenshots/", "")
            if not SKIP_PATH.search(inside):
                found.append(path)
            if len(found) > 20:
                return found
    return found


def missing_evidence(cwd: Path, edited: list[str]) -> list[str]:
    """What a new product, page set or redesign still lacks."""
    # Shell writes give relative paths (often after a `cd`), so find those DESIGN.md files in the project.
    design_docs = [Path(path) for path in edited if Path(path).name == "DESIGN.md" and Path(path).is_absolute()]
    if any(Path(path).name == "DESIGN.md" and not Path(path).is_absolute() for path in edited):
        design_docs += find_files([cwd], "DESIGN.md")
    roots = {cwd} | {doc.parent for doc in design_docs}
    problems: list[str] = []
    design_text = "".join(doc.read_text(errors="ignore") for doc in design_docs if doc.exists())
    if not re.search(r"^#{2,3}\s*Compositions?", design_text, re.MULTILINE | re.IGNORECASE):
        problems.append("DESIGN.md has no `## Compositions` section (obvious layout rejected, "
                        "alternatives that differ in idea, the chosen one with its hero moment) — "
                        "orchestrator step 3")
    records = find_files(sorted(roots), "premium-pass.md")
    record = "".join(path.read_text(errors="ignore") for path in records)
    if not records:
        problems.append("no `qa-screenshots/premium-pass.md` record of the premium pass — "
                        "arkar-ui-visual-qa definition of done")
    else:
        if not re.search(r"critique|cold read", record, re.IGNORECASE):
            problems.append("premium-pass.md has no `## Independent critique` section — "
                            "orchestrator step 6 (a fresh subagent sees only the screenshots and filmstrips)")
        if not (re.search(r"film", record, re.IGNORECASE) and re.search(r"motion", record, re.IGNORECASE)):
            problems.append("premium-pass.md has no motion review from filmstrips — film the main flows with "
                            "arkar-ui-visual-qa/scripts/film.cjs and judge them by eye (orchestrator step 5)")
        if not re.search(r"experience (test|walk)", record, re.IGNORECASE):
            problems.append("premium-pass.md has no `## Experience test` — a fresh subagent must use the running "
                            "app (happy path, errors and retry, cancel/undo, keyboard, phone) and score the "
                            "experience (orchestrator step 7, arkar-ui-visual-qa/references/experience-tester.md)")
    return problems


MAX_BLOCKS = 3


def blocks_so_far(session_id: str, add: bool = False) -> int:
    """How many times the gate has stopped this session (kept in the temp folder)."""
    counter = Path(tempfile.gettempdir()) / f"arkar-ui-gate-{re.sub(r'[^\w-]', '', session_id)[:64]}"
    count = int(counter.read_text() or 0) if counter.exists() else 0
    if add:
        counter.write_text(str(count + 1))
    return count


def decide(event: dict) -> str | None:
    """The reason to keep going, or None when Claude may stop."""
    session_id = str(event.get("session_id") or "")
    # Insist a few times, never forever: after MAX_BLOCKS the session may stop and report what's missing.
    if event.get("stop_hook_active") and (not session_id or blocks_so_far(session_id) >= MAX_BLOCKS):
        return None
    transcript_path = event.get("transcript_path")
    if not transcript_path or not Path(transcript_path).exists():
        return None
    skills, edited, written = read_session(transcript_path)
    cwd = Path(event.get("cwd") or ".")
    ui_edits = [path for path in edited
                if (UI_FILE.search(path) or path.endswith("#markup"))
                and not SKIP_PATH.search(relative(path[:-7] if path.endswith("#markup") else path, cwd))]
    if not ui_edits:
        return None
    problems: list[str] = []
    if not loaded(skills, ORCHESTRATOR):
        problems.append(f"UI files were changed but `{ORCHESTRATOR}` wasn't loaded — load it with the Skill tool "
                        "and follow it (classification, required specialists, premium pass)")
    if not loaded(skills, VISUAL_QA):
        problems.append(f"`{VISUAL_QA}` wasn't loaded — load it with the Skill tool and run its checks "
                        "on the real rendered UI before reporting")
    # DESIGN.md written whole = a new identity (new product, page set or redesign); a small edit
    # to an existing one (a token, a note) is ordinary work and needs only the two checks above.
    if any(Path(path).name == "DESIGN.md" for path in written):
        not_loaded = [name for name in ALL_SPECIALISTS if name != VISUAL_QA and not loaded(skills, name)]
        if not_loaded:
            problems.append("this is a new product, page set or redesign (DESIGN.md written), which needs all nine "
                            "specialists — not loaded: " + ", ".join(f"`{name}`" for name in not_loaded) +
                            ". Load each with the Skill tool and apply what it requires to the work")
        problems += missing_evidence(cwd, edited)
    if not problems:
        return None
    if session_id:
        blocks_so_far(session_id, add=True)
    return ("arkar UI quality gate — the UI work isn't finished yet:\n- " + "\n- ".join(problems) +
            "\nDo these steps now — don't just report them as not done — then update your final message. If a step truly can't run here "
            "(e.g. no browser or no subagent tool), record why in premium-pass.md and say so in your reply.")


def main() -> None:
    try:
        event = json.loads(sys.stdin.read() or "{}")
        reason = decide(event)
    except Exception:  # The gate must never trap a session.
        return
    if reason:
        print(json.dumps({"decision": "block", "reason": reason}))


if __name__ == "__main__":
    main()
