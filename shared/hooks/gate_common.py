"""What a session loaded and wrote — the part every arkar gate shares.

The gates (the UI quality gate, the security gate, and any gate a later
domain plugin adds) all ask the same questions of a session's transcript:
which skills were loaded, which files were written or edited, and how many
times this gate has already stopped the session. Those answers live here so
the gates can't drift apart.

One source: `shared/hooks/gate_common.py` in the ak-plugins repo. An installed
plugin can only read files inside its own folder, so
`scripts/build_generated.py` copies this file into the `hooks/` folder of
every plugin that has a gate. Edit only the source; tests fail when a copy
differs.

Standard library only, Python 3.8+.
"""
from __future__ import annotations

import json
import re
import tempfile
from pathlib import Path

UI_FILE = re.compile(
    r"\.(html?|css|scss|sass|less|jsx|tsx|vue|svelte|astro|dart|blade\.php|twig|erb|hbs)$"
    r"|/(components?|views?|pages?|screens?|widgets?|templates?|layouts?)/.*\.(js|ts|php|py|kt|swift)$"
    # UI written in PHP: a Livewire component's class (its state and behaviour) and Filament's forms, tables and pages.
    r"|/(livewire|filament)/.*\.php$",
    re.IGNORECASE,
)
MARKUP = re.compile(r"<(form|input|button|label|table|select|textarea|nav|header|main|section)\b[^>]*>", re.IGNORECASE)
SKIP_PATH = re.compile(r"(^|/)(node_modules|vendor|dist|build|qa-screenshots|\.git)/|(^|/)(tests?|fixtures?|__fixtures__)/|_test\.|\.test\.|\.spec\."
                       # A skill's own assets and examples are a library being written, not a product's UI.
                       r"|(^|/)skills/[^/]+/(assets|references|scripts)/")


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


def written_text(tool_input: dict) -> str:
    """The text a Write, Edit or MultiEdit puts into the file."""
    parts = [str(tool_input.get("content", "")), str(tool_input.get("new_string", ""))]
    for edit in tool_input.get("edits") or []:
        if isinstance(edit, dict):
            parts.append(str(edit.get("new_string", "")))
    return "".join(parts)


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


def blocks_so_far(session_id: str, add: bool = False, kind: str = "gate") -> int:
    """How many times this check has stopped this session (kept in the temp folder)."""
    # Built outside the f-string: a backslash inside one is a syntax error before Python 3.12.
    safe_id = re.sub(r"[^\w-]", "", session_id)[:64]
    counter = Path(tempfile.gettempdir()) / f"arkar-ui-{kind}-{safe_id}"
    count = int(counter.read_text() or 0) if counter.exists() else 0
    if add:
        counter.write_text(str(count + 1))
    return count
