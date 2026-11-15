"""What a session loaded and wrote — the part every arkar gate shares.

The gates (the UI quality gate, the code gate, and any gate a later
domain plugin adds) all ask the same questions of a session: which skills
were loaded, which files it wrote or edited — through the file tools, or on
disk while one of its shell commands or subagents ran — and how many times
this gate has already stopped the session. Those answers live here so the
gates can't drift apart.

One source: `shared/hooks/gate_common.py` in the ak-plugins repo. An installed
plugin can only read files inside its own folder, so
`scripts/build_generated.py` copies this file into the `hooks/` folder of
every plugin that has a gate. Edit only the source; tests fail when a copy
differs.

Standard library only, Python 3.8+.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
import time
from datetime import datetime
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

# Tools that can change files without a Write or Edit appearing in the transcript.
OUTSIDE_VIEW = ("Bash", "Agent", "Task")
# Folders not looked into when the project is not a git repository (otherwise git's own ignore rules decide).
NOT_SOURCE = {"node_modules", "vendor", "dist", "build", "storage", "coverage", "target", "Pods", "venv", "__pycache__"}
# Code that can hold HTML: only these are read to see whether a change put markup into them.
CAN_HOLD_MARKUP = re.compile(r"\.(php|py|js|mjs|cjs|ts|rb|go|java|kt|swift|cs)$", re.IGNORECASE)
DISK_SCAN_SECONDS = 4.0   # the hook has 20 seconds in all
DISK_SCAN_FILES = 30000
DISK_READ_FILES = 40
DISK_READ_BYTES = 200_000


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


def moment(timestamp: object) -> float | None:
    """A transcript timestamp ("2026-11-15T02:50:17.633Z") as seconds since the epoch."""
    try:
        return datetime.fromisoformat(str(timestamp).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def outside_view_windows(transcript_path: str) -> list[tuple[float, float]]:
    """When the session's shell commands and subagents ran: (start, end) for each, in seconds since the epoch.

    A command left running in the background, a subagent (it may go on in the background) and a command with no
    result yet all count as running until now.
    """
    running: dict[str, tuple[float, bool]] = {}
    windows: list[tuple[float, float]] = []
    with open(transcript_path, encoding="utf-8", errors="ignore") as transcript:
        for line in transcript:
            try:
                event = json.loads(line, strict=False)
            except json.JSONDecodeError:
                continue
            at = moment(event.get("timestamp"))
            content = event.get("message", {}).get("content", []) if isinstance(event.get("message"), dict) else []
            if at is None or not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict):
                    continue
                if event.get("type") == "assistant" and block.get("type") == "tool_use" and block.get("name") in OUTSIDE_VIEW:
                    in_background = block.get("name") != "Bash" or bool((block.get("input") or {}).get("run_in_background"))
                    running[str(block.get("id", ""))] = (at, in_background)
                elif event.get("type") == "user" and block.get("type") == "tool_result":
                    begun = running.pop(str(block.get("tool_use_id", "")), None)
                    if begun:
                        windows.append((begun[0], time.time() if begun[1] else at))
    return windows + [(begun, time.time()) for begun, _in_background in running.values()]


def git_files(cwd: Path, *flags: str) -> list[str] | None:
    """Paths `git ls-files` lists for the project folder, or None when it is not a git repository."""
    try:
        listed = subprocess.run(["git", "ls-files", "-z", *flags], cwd=cwd, capture_output=True, text=True, timeout=DISK_SCAN_SECONDS)
    except (OSError, subprocess.SubprocessError):
        return None
    return [path for path in listed.stdout.split("\0") if path] if listed.returncode == 0 else None


def project_files(cwd: Path) -> tuple[list[str], set[str]]:
    """The project's own files (paths from its folder), and which of them are new: not yet tracked by git."""
    tracked, untracked = git_files(cwd, "--cached"), git_files(cwd, "--others", "--exclude-standard")
    if tracked is not None and untracked is not None:
        return tracked + untracked, set(untracked)
    files: list[str] = []
    deadline = time.monotonic() + DISK_SCAN_SECONDS
    for folder, folders, names in os.walk(cwd):
        folders[:] = [name for name in folders if name not in NOT_SOURCE and not name.startswith(".")]
        files += [(Path(folder) / name).relative_to(cwd).as_posix() for name in names]
        if len(files) > DISK_SCAN_FILES or time.monotonic() > deadline:
            break
    return files, set()


def disk_changes(transcript_path: str, cwd: Path) -> list[tuple[str, bool]]:
    """(path, new file) for each project file changed while a shell command or subagent of this session was running.

    A script run in the shell, or a subagent, can change files with no Write or Edit in the transcript, and the gates
    would not see it. The project itself is the record: its files whose modification time falls inside one of those
    runs. A file changed at any other moment — by AK in his editor — is not the session's work and is not counted.
    """
    windows = outside_view_windows(transcript_path)
    if not windows or not cwd.is_dir():
        return []
    earliest = min(start for start, _end in windows) - 1
    files, new = project_files(cwd)
    changed: list[tuple[str, bool]] = []
    deadline = time.monotonic() + DISK_SCAN_SECONDS
    for path in files[:DISK_SCAN_FILES]:
        if time.monotonic() > deadline:
            break
        try:
            modified = (cwd / path).stat().st_mtime
        except OSError:
            continue
        if modified >= earliest and any(start - 1 <= modified <= end + 1 for start, end in windows):
            changed.append((path, path in new))
    return changed


def text_added(cwd: Path, path: str, new: bool) -> str:
    """What a change put into a file: the added lines for a file git tracks, the whole text for a new one."""
    if not new:
        try:
            diff = subprocess.run(["git", "diff", "-U0", "HEAD", "--", path], cwd=cwd, capture_output=True, text=True,
                                  timeout=DISK_SCAN_SECONDS)
            if diff.returncode == 0 and diff.stdout:
                return "\n".join(line[1:] for line in diff.stdout.splitlines() if line.startswith("+") and not line.startswith("+++"))
        except (OSError, subprocess.SubprocessError):
            pass
    try:
        with open(cwd / path, encoding="utf-8", errors="ignore") as changed_file:
            return changed_file.read(DISK_READ_BYTES)
    except OSError:
        return ""


def disk_edits(transcript_path: str, cwd: Path) -> tuple[list[str], list[str], bool]:
    """read_session's last three answers, for the files changed on disk by a shell command or a subagent."""
    edited: list[str] = []
    written: list[str] = []
    sheet_written = False
    texts_read = 0
    for file_path, new in disk_changes(transcript_path, cwd):
        full_path = (cwd.resolve() / file_path).as_posix()
        is_design = Path(file_path).name == "DESIGN.md"
        may_hold_markup = bool(CAN_HOLD_MARKUP.search(file_path)) and not UI_FILE.search(full_path)
        text = ""
        if (is_design or may_hold_markup) and texts_read < DISK_READ_FILES:  # reading is bounded: a formatter can touch hundreds
            text = text_added(cwd, file_path, new)
            texts_read += 1
        marker = "#markup" if may_hold_markup and MARKUP.search(text) else ""
        edited.append(full_path + marker)
        if new:
            written.append(full_path)
        if is_design and BUILD_SHEET.search(text):
            sheet_written = True
    return edited, written, sheet_written


def read_session(transcript_path: str, cwd: Path | None = None) -> tuple[set[str], list[str], list[str], bool]:
    """The skills loaded, the files written or edited, the files written whole, and whether a build sheet was written.

    With the project folder given (the check at the end of a session), files changed on disk by a shell command or
    a subagent are included too, even when no tool call names them.
    """
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
    if cwd is not None:
        disk_edited, disk_written, disk_sheet = disk_edits(transcript_path, cwd)
        edited += disk_edited
        written += disk_written
        sheet_written = sheet_written or disk_sheet
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
