"""Rebuild hooks/subagent-context.json from hooks/coding-rules.md.

Subagents only receive hook context as JSON (additionalContext), and the hook
must not depend on Python being installed, so the JSON is built here and
committed. Run after every change to coding-rules.md:
    python3 scripts/build_subagent_context.py
tests/test_hooks.py fails if the two are out of sync.
"""
import json
from pathlib import Path

HOOKS = Path(__file__).resolve().parents[1] / "plugins" / "arkar-dev-standards" / "hooks"


def build() -> str:
    rules = (HOOKS / "coding-rules.md").read_text()
    return json.dumps({"hookSpecificOutput": {"hookEventName": "SubagentStart", "additionalContext": rules}}) + "\n"


if __name__ == "__main__":
    (HOOKS / "subagent-context.json").write_text(build())
    print("subagent-context.json rebuilt")
