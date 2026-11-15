"""arkar UI quality gate — checks UI work at the start and at the end.

Written rules alone get skipped now and then ("this is a small site", a skill
that didn't load), and a skipped step is exactly where a session falls back to
a plain, generic UI. The workflow is Understand → Decide → Build sheet →
Implement (with an early look review of two screens) → Verify →
Independent review → Report, and this hook holds the
two ends of it:

- **Before writing (PreToolUse on Write/Edit):** a UI file is about to be
  written but the skills that change needs haven't been loaded → the write is
  held and Claude is told which to load first, so the decisions and the build
  sheet come before the code, not after it. Every UI change needs
  `arkar-ui-intelligence`, `arkar-ui-ux-engineering` and
  `arkar-ui-implementation`; a new UI file (a new screen or component) also
  needs motion, responsive and accessibility. This is what makes the UI
  skills load by themselves in an ordinary coding session, where the UI is
  only part of the request. Asked at most three times per session.
- **Before finishing (Stop):**
  1. UI files were changed → the same skills and `arkar-ui-visual-qa` must
     have been loaded.
  2. The session created or rewrote `DESIGN.md` (a new product, page set or
     redesign) → all nine UI specialists must have been loaded.
  3. It created or rewrote DESIGN.md, or wrote a build sheet into it → the
     evidence must exist: a `## Build sheet` section in DESIGN.md, and
     `premium-pass.md` with the `## Early review` (two screens judged for
     their look before the rest is built), the Verify record (films, the
     experience walk with its videos, the security check) and the
     `## Independent review`.

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
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gate_common import (  # noqa: E402
    MARKUP, SKIP_PATH, UI_FILE, blocks_so_far, completed_tool_calls, inside, loaded, read_session, relative, written_text,
)

ORCHESTRATOR = "arkar-ui-intelligence"
VISUAL_QA = "arkar-ui-visual-qa"
# New products and redesigns load every specialist (the orchestrator's required minimum sets).
ALL_SPECIALISTS = ("arkar-ui-discovery", "arkar-ui-art-direction", "arkar-ui-ux-engineering",
                   "arkar-ui-design-system", "arkar-ui-motion-design", "arkar-ui-responsive-design",
                   "arkar-ui-accessibility", "arkar-ui-implementation", VISUAL_QA)
# The orchestrator's smallest sets: what every UI change needs beside the orchestrator, and what a new
# screen or component adds. (Visual QA comes at the end; DESIGN.md written whole needs all nine.)
ANY_UI_CHANGE = ("arkar-ui-ux-engineering", "arkar-ui-implementation")
NEW_SCREEN = ("arkar-ui-motion-design", "arkar-ui-responsive-design", "arkar-ui-accessibility")


def used_subagent(transcript_path: str) -> bool:
    """Whether the session started a subagent (the independent review needs one)."""
    return any(call.get("name") in ("Agent", "Task") for call in completed_tool_calls(transcript_path))


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


def has_videos(records: list[Path]) -> bool:
    """A recorded journey (record.cjs writes .mp4, or .webm without ffmpeg) beside a premium-pass record."""
    for record in records:
        for suffix in ("*.mp4", "*.webm"):
            if next(record.parent.rglob(suffix), None) is not None:
                return True
    return False


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
        elif not has_videos(records) and not re.search(r"could(n't| not) record|no video", record, re.IGNORECASE):
            problems.append("the experience walk has no videos — step screenshots can't show timing; record the "
                            "main flows at real speed with arkar-ui-visual-qa/scripts/record.cjs (or say in "
                            "premium-pass.md why recording couldn't run)")
        if not re.search(r"security.check", record, re.IGNORECASE):
            problems.append("premium-pass.md has no security check — run the `arkar-security` skill's scripts/security-check.cjs "
                            "on the changed pages (and --code on the source); fix findings in new code, and list "
                            "existing-code findings as 🟢 / 🟠 proposals for AK (Verify)")
        if not re.search(r"early (look )?review", record, re.IGNORECASE):
            problems.append("premium-pass.md has no `## Early review` — the first screen and the main inner screen "
                            "are judged for their look by one fresh subagent before the rest is built "
                            "(arkar-ui-visual-qa/references/early-review.md). If the rest is already built, do it "
                            "now on those two screens and act on what it says")
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
MAX_HOLDS = 3


def is_project_ui(path: str, cwd: Path) -> bool:
    """A UI file (or code holding markup, marked #markup) of this project, not a dependency, test or scratch file."""
    plain = path[:-7] if path.endswith("#markup") else path
    if not (UI_FILE.search(plain) or path.endswith("#markup")):
        return False
    return inside(plain, cwd) and not SKIP_PATH.search(relative(plain, cwd))


def decide(event: dict) -> str | None:
    """The reason to keep going, or None when Claude may stop."""
    session_id = str(event.get("session_id") or "")
    # Insist a few times per session, never forever — counted across turns, not only within one stop,
    # so a false alarm or a step AK chose to skip can't block every later reply in the session.
    if session_id and blocks_so_far(session_id) >= MAX_BLOCKS:
        return None
    if event.get("stop_hook_active") and not session_id:
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
    design_rewritten = any(Path(path).name == "DESIGN.md" and not SKIP_PATH.search(relative(path, cwd))
                           for path in written)
    # A UI file written whole is a new screen or component (or one rewritten): the larger set.
    new_screen = any(is_project_ui(path, cwd) for path in written)
    needed = [name for name in ANY_UI_CHANGE + (NEW_SCREEN if new_screen else ()) if not loaded(skills, name)]
    if needed and not design_rewritten:
        problems.append(("a new screen or component was written" if new_screen else "UI was changed") +
                        ", and the specialists that needs weren't loaded: " + ", ".join(f"`{name}`" for name in needed) +
                        ". Load each with the Skill tool and check the work against it (its quality criteria), fixing what falls short")
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


def decide_before_write(event: dict) -> str | None:
    """The reason to hold a UI write until the skills it needs are loaded, or None to let it go ahead."""
    tool_input = event.get("tool_input") or {}
    file_path = str(tool_input.get("file_path") or tool_input.get("notebook_path") or "")
    if not file_path:
        return None
    plain_path = file_path
    if not UI_FILE.search(file_path) and MARKUP.search(written_text(tool_input)):
        file_path += "#markup"
    cwd = Path(event.get("cwd") or ".")
    if not is_project_ui(file_path, cwd):
        return None
    transcript_path = event.get("transcript_path")
    if not transcript_path or not Path(transcript_path).exists():
        return None
    skills = read_session(transcript_path)[0]
    # A Write to a path that isn't there yet is a new screen or component: it needs the larger set.
    target = Path(plain_path) if Path(plain_path).is_absolute() else cwd / plain_path
    new_screen = event.get("tool_name") == "Write" and not target.exists()
    specialists = [name for name in ANY_UI_CHANGE + (NEW_SCREEN if new_screen else ()) if not loaded(skills, name)]
    if loaded(skills, ORCHESTRATOR) and not specialists:
        return None
    session_id = str(event.get("session_id") or "")
    # Ask a few times at most: if a skill truly can't load, the work must still be able to go on.
    if session_id and blocks_so_far(session_id, kind="hold") >= MAX_HOLDS:
        return None
    if session_id:
        blocks_so_far(session_id, add=True, kind="hold")
    name = Path(plain_path).name
    named = ", ".join(f"`{skill}`" for skill in specialists)
    why = "a new screen or component needs them" if new_screen else "every UI change needs them"
    if not loaded(skills, ORCHESTRATOR):
        return (f"arkar UI quality gate: this writes UI ({name}) before `{ORCHESTRATOR}` was loaded. Load it now with "
                "the Skill tool" + (f" — and with it, in the same message, {named} ({why})" if specialists else "") +
                " — and follow its workflow — Understand → Decide → Build sheet → Implement → Verify → Independent "
                "review → Report: classify the task, load any other specialists it names, write the build sheet (a "
                "few lines in your reply for a small change), then make this change. If a skill can't load, read its "
                "SKILL.md file instead.")
    return (f"arkar UI quality gate: this writes UI ({name}) but the specialists this change needs aren't loaded: "
            f"{named} ({why}). Load them now with the Skill tool, in one message, apply what they require to this "
            "change (their quality criteria), then make it. If a skill can't load, read its SKILL.md file instead.")


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
