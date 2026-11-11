"""arkar UI quality gate — checks UI work at the start and at the end.

Written rules alone get skipped now and then ("this is a small site", a skill
that didn't load), and a skipped step is exactly where a session falls back to
a plain, generic UI. The workflow is Understand → Decide → Build sheet →
Implement → Verify → Independent review → Report, and this hook holds the
two ends of it:

- **Before writing (PreToolUse on Write/Edit):** a UI file is about to be
  written but `arkar-ui-intelligence` hasn't been loaded → the write is held
  and Claude is told to load it first, so the decisions and the build sheet
  come before the code, not after it. Asked at most twice per session.
- **Before finishing (Stop):**
  1. UI files were changed → `arkar-ui-intelligence` and
     `arkar-ui-visual-qa` must have been loaded.
  2. The session created or rewrote `DESIGN.md` (a new product, page set or
     redesign) → all nine UI specialists must have been loaded.
  3. It created or rewrote DESIGN.md, or wrote a build sheet into it → the
     evidence must exist: a `## Build sheet` section in DESIGN.md, and
     `premium-pass.md` with the Verify record (films and the experience walk)
     and the `## Independent review`.

When something is missing at the end it blocks the stop with a reason that
tells Claude exactly what to finish — up to three times per session, then
lets it stop. Any error inside the gate lets Claude go on normally: the gate
must never trap a session.

Input: the hook event as JSON on stdin. Output: a JSON decision on stdout, or
nothing. Standard library only, Python 3.8+.
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
SKIP_PATH = re.compile(r"(^|/)(node_modules|vendor|dist|build|qa-screenshots|\.git)/|(^|/)tests?/|_test\.|\.test\.|\.spec\."
                       # A skill's own assets and examples are a library being written, not a product's UI.
                       r"|(^|/)skills/[^/]+/(assets|references|scripts)/")
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


SKILL_FILE = re.compile(r"skills/(arkar-[\w-]+)/SKILL\.md$")
BUILD_SHEET = re.compile(r"build sheet", re.IGNORECASE)


def completed_tool_calls(transcript_path: str) -> list[dict]:
    """The session's tool calls in order, without file edits that failed or were held (they changed nothing)."""
    calls: list[dict] = []
    failed: set[str] = set()
    with open(transcript_path, encoding="utf-8", errors="ignore") as transcript:
        for line in transcript:
            try:
                event = json.loads(line, strict=False)  # transcripts can hold raw tabs or newlines inside strings
            except json.JSONDecodeError:
                continue
            content = event.get("message", {}).get("content", []) if isinstance(event.get("message"), dict) else []
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict):
                    continue
                if event.get("type") == "assistant" and block.get("type") == "tool_use":
                    calls.append(block)
                elif event.get("type") == "user" and block.get("type") == "tool_result" and block.get("is_error"):
                    failed.add(str(block.get("tool_use_id", "")))
    file_tools = ("Write", "Edit", "MultiEdit", "NotebookEdit")
    return [call for call in calls if not (call.get("name") in file_tools and str(call.get("id", "")) in failed)]


def used_subagent(transcript_path: str) -> bool:
    """Whether the session started a subagent (the independent review needs one)."""
    return any(call.get("name") in ("Agent", "Task") for call in completed_tool_calls(transcript_path))


def read_session(transcript_path: str) -> tuple[set[str], list[str], list[str], bool]:
    """The skills loaded, the files written or edited, the files written whole, and whether a build sheet was written."""
    skills: set[str] = set()
    edited: list[str] = []
    written: list[str] = []
    sheet_written = False
    for block in completed_tool_calls(transcript_path):
        tool_input = block.get("input") or {}
        if block.get("name") == "Skill":
            skills.add(str(tool_input.get("skill", "")))
        elif block.get("name") == "Read":
            # When the Skill tool fails, reading the skill's file is the documented fallback.
            skill_file = SKILL_FILE.search(str(tool_input.get("file_path", "")).replace("\\", "/"))
            if skill_file:
                skills.add(skill_file.group(1))
        elif block.get("name") == "Bash":
            command = str(tool_input.get("command", ""))
            for file_path, whole in shell_writes(command):
                # HTML written into code through the shell (a heredoc, sed or a Python edit) is UI too.
                marker = "#markup" if not UI_FILE.search(file_path) and MARKUP.search(command) else ""
                edited.append(file_path + marker)
                if whole:
                    written.append(file_path)
                if "DESIGN.md" in file_path and BUILD_SHEET.search(command):
                    sheet_written = True
        elif block.get("name") in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
            file_path = str(tool_input.get("file_path", ""))
            # HTML built inside code (Python f-strings, PHP echo, JS template literals) is UI too.
            text = written_text(tool_input)
            if not UI_FILE.search(file_path) and MARKUP.search(text):
                file_path += "#markup"
            edited.append(file_path)
            if block.get("name") == "Write":
                written.append(str(tool_input.get("file_path", "")))
            if Path(file_path).name == "DESIGN.md" and BUILD_SHEET.search(text):
                sheet_written = True
    return skills, edited, written, sheet_written


def relative(path: str, cwd: Path) -> str:
    """The path inside the project, so a project kept in e.g. ~/test/ isn't ignored."""
    try:
        return Path(path).resolve().relative_to(cwd.resolve()).as_posix()
    except (ValueError, OSError):
        return Path(path).as_posix()


def inside(path: str, cwd: Path) -> bool:
    """Only the project's own files count: scratch pages written to /tmp or elsewhere are not its UI."""
    candidate = Path(path)
    if not candidate.is_absolute():
        return True
    try:
        candidate.resolve().relative_to(cwd.resolve())
        return True
    except (ValueError, OSError):
        return False


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


def missing_evidence(cwd: Path, edited: list[str], used_agent: bool = True) -> list[str]:
    """What a new product, page set or redesign still lacks."""
    # Shell writes give relative paths (often after a `cd`), so find those DESIGN.md files in the project.
    design_docs = [Path(path) for path in edited if Path(path).name == "DESIGN.md" and Path(path).is_absolute()]
    if any(Path(path).name == "DESIGN.md" and not Path(path).is_absolute() for path in edited):
        design_docs += find_files([cwd], "DESIGN.md")
    roots = {cwd} | {doc.parent for doc in design_docs}
    problems: list[str] = []
    design_text = "".join(doc.read_text(errors="ignore") for doc in design_docs if doc.exists())
    if not re.search(r"^#{2,3}\s*Build sheet", design_text, re.MULTILINE | re.IGNORECASE):
        problems.append("DESIGN.md has no `## Build sheet` section — write it before (or now, for) the UI code: "
                        "per screen the job, direction, composition, components, data and latency, every state, "
                        "interactions, motion, copy, responsive, accessibility and acceptance checks "
                        "(arkar-ui-intelligence/references/build-sheet.md)")
    elif not re.search(r"component plan", design_text, re.IGNORECASE):
        problems.append("the build sheet has no component plan — before the screens, list the components reused, "
                        "extended and new (variants, properties, states, interactions, tokens), and compose the "
                        "screens from them (arkar-ui-intelligence/references/build-sheet.md)")
    records = find_files(sorted(roots), "premium-pass.md")
    record = "".join(path.read_text(errors="ignore") for path in records)
    if not records:
        problems.append("no `qa-screenshots/premium-pass.md` record of the premium pass — "
                        "arkar-ui-visual-qa definition of done")
    else:
        if not (re.search(r"film", record, re.IGNORECASE) and re.search(r"motion", record, re.IGNORECASE)):
            problems.append("premium-pass.md has no motion review from filmstrips — film the main flows with "
                            "arkar-ui-visual-qa/scripts/film.cjs and judge them by eye (Verify)")
        if not re.search(r"interaction.probe|interaction-probe", record, re.IGNORECASE):
            problems.append("premium-pass.md has no interaction probe results — run "
                            "arkar-ui-visual-qa/scripts/interaction-probe.cjs on each changed page (hover, focus, "
                            "press feedback, transitions, target sizes) and record before → after (Verify)")
        if not re.search(r"experience (walk|test)|record\.cjs", record, re.IGNORECASE):
            problems.append("premium-pass.md has no experience walk — record the main flows at real speed with "
                            "arkar-ui-visual-qa/scripts/record.cjs (happy path, errors and retry, cancel/undo, "
                            "refresh, keyboard, phone) and judge every moment (Verify)")
        if not re.search(r"independent review|cold review|independent critique|cold read", record, re.IGNORECASE):
            problems.append("premium-pass.md has no `## Independent review` — one fresh subagent reviews the look "
                            "and the use for defects (arkar-ui-visual-qa/references/independent-review.md)")
        elif not used_agent and not re.search(r"no agent tool|agent tool (is|was)n'?t available|"
                                              r"agent tool (is |was )?not available|without an agent tool",
                                              record, re.IGNORECASE):
            problems.append("the independent review was done without a subagent — AK asks for a fresh subagent "
                            "(Agent tool) on every new screen, page set, product or redesign; a self-review only "
                            "counts when the Agent tool isn't available. Start it now with "
                            "arkar-ui-visual-qa/references/independent-review.md and record its findings")
    return problems


MAX_BLOCKS = 3
MAX_HOLDS = 2


def blocks_so_far(session_id: str, add: bool = False, kind: str = "gate") -> int:
    """How many times this check has stopped this session (kept in the temp folder)."""
    # Built outside the f-string: a backslash inside one is a syntax error before Python 3.12.
    safe_id = re.sub(r"[^\w-]", "", session_id)[:64]
    counter = Path(tempfile.gettempdir()) / f"arkar-ui-{kind}-{safe_id}"
    count = int(counter.read_text() or 0) if counter.exists() else 0
    if add:
        counter.write_text(str(count + 1))
    return count


def is_project_ui(path: str, cwd: Path) -> bool:
    """A UI file (or code holding markup, marked #markup) of this project, not a dependency, test or scratch file."""
    plain = path[:-7] if path.endswith("#markup") else path
    if not (UI_FILE.search(plain) or path.endswith("#markup")):
        return False
    return inside(plain, cwd) and not SKIP_PATH.search(relative(plain, cwd))


def decide(event: dict) -> str | None:
    """The reason to keep going, or None when Claude may stop."""
    session_id = str(event.get("session_id") or "")
    # Insist a few times, never forever: after MAX_BLOCKS the session may stop and report what's missing.
    if event.get("stop_hook_active") and (not session_id or blocks_so_far(session_id) >= MAX_BLOCKS):
        return None
    transcript_path = event.get("transcript_path")
    if not transcript_path or not Path(transcript_path).exists():
        return None
    skills, edited, written, sheet_written = read_session(transcript_path)
    cwd = Path(event.get("cwd") or ".")
    if not any(is_project_ui(path, cwd) for path in edited):
        return None
    problems: list[str] = []
    if not loaded(skills, ORCHESTRATOR):
        problems.append(f"UI files were changed but `{ORCHESTRATOR}` wasn't loaded — load it with the Skill tool "
                        "and follow it (classification, build sheet, required specialists, premium pass)")
    if not loaded(skills, VISUAL_QA):
        problems.append(f"`{VISUAL_QA}` wasn't loaded — load it with the Skill tool and run its checks "
                        "on the real rendered UI before reporting")
    # DESIGN.md written whole = a new identity (new product, page set or redesign); a small edit
    # to an existing one (a token, a note) is ordinary work and needs only the two checks above.
    design_rewritten = any(Path(path).name == "DESIGN.md" for path in written)
    if design_rewritten:
        not_loaded = [name for name in ALL_SPECIALISTS if name != VISUAL_QA and not loaded(skills, name)]
        if not_loaded:
            problems.append("this is a new product, page set or redesign (DESIGN.md written), which needs all nine "
                            "specialists — not loaded: " + ", ".join(f"`{name}`" for name in not_loaded) +
                            ". Load each with the Skill tool and apply what it requires to the work")
    # A build sheet added to an existing DESIGN.md = new screens: they need the same verify and review.
    if design_rewritten or sheet_written:
        problems += missing_evidence(cwd, edited, used_subagent(transcript_path))
    if not problems:
        return None
    if session_id:
        blocks_so_far(session_id, add=True)
    return ("arkar UI quality gate — the UI work isn't finished yet:\n- " + "\n- ".join(problems) +
            "\nDo these steps now — don't just report them as not done — then update your final message. If a step truly can't run here "
            "(e.g. no browser or no subagent tool), record why in premium-pass.md and say so in your reply.")


def written_text(tool_input: dict) -> str:
    """The text a Write, Edit or MultiEdit puts into the file."""
    parts = [str(tool_input.get("content", "")), str(tool_input.get("new_string", ""))]
    for edit in tool_input.get("edits") or []:
        if isinstance(edit, dict):
            parts.append(str(edit.get("new_string", "")))
    return "".join(parts)


def decide_before_write(event: dict) -> str | None:
    """The reason to hold a UI write until the orchestrator is loaded, or None to let it go ahead."""
    tool_input = event.get("tool_input") or {}
    file_path = str(tool_input.get("file_path") or tool_input.get("notebook_path") or "")
    if not file_path:
        return None
    if not UI_FILE.search(file_path) and MARKUP.search(written_text(tool_input)):
        file_path += "#markup"
    cwd = Path(event.get("cwd") or ".")
    if not is_project_ui(file_path, cwd):
        return None
    transcript_path = event.get("transcript_path")
    if not transcript_path or not Path(transcript_path).exists():
        return None
    skills = read_session(transcript_path)[0]
    if loaded(skills, ORCHESTRATOR):
        return None
    session_id = str(event.get("session_id") or "")
    # Ask twice at most: if the skill truly can't load, the work must still be able to go on.
    if session_id and blocks_so_far(session_id, kind="hold") >= MAX_HOLDS:
        return None
    if session_id:
        blocks_so_far(session_id, add=True, kind="hold")
    return (f"arkar UI quality gate: this writes UI ({Path(file_path.replace('#markup', '')).name}) before "
            f"`{ORCHESTRATOR}` was loaded. Load it now with the Skill tool and follow its workflow — Understand → "
            "Decide → Build sheet → Implement → Verify → Independent review → Report: classify the task, load the "
            "specialists it names, write the build sheet (a few lines in your reply for a small change), then make "
            "this change. If the skill can't load, read its SKILL.md file instead.")


def main() -> None:
    try:
        event = json.loads(sys.stdin.read() or "{}")
        if event.get("hook_event_name") == "PreToolUse":
            reason = decide_before_write(event)
            if reason:
                print(json.dumps({"hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }}))
            return
        reason = decide(event)
    except Exception:  # The gate must never trap a session.
        return
    if reason:
        print(json.dumps({"decision": "block", "reason": reason}))


if __name__ == "__main__":
    main()
