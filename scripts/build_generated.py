"""Rebuild the files that are generated into each plugin, and commit them.

An installed plugin can only read files inside its own folder, and its hooks
must work without Python, so two kinds of file are built here:

- `hooks/subagent-context.json` — a plugin's always-on rules (`hooks/*rules.md`)
  as the JSON a SubagentStart hook must print, so subagents get the same rules.
- copies of `shared/hooks/*` — code that more than one plugin's gates use
  (one source, copied into every plugin that has a `*_gate.py`).

Run after editing a rules file or anything under `shared/`:
    python3 scripts/build_generated.py
tests/test_hooks.py fails if a generated file is out of date.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGINS = ROOT / "plugins"
SHARED_HOOKS = ROOT / "shared" / "hooks"


def rules_file(plugin: Path) -> Path | None:
    """A plugin's always-on rules: the one `*rules.md` in its hooks folder, if it has any."""
    found = sorted((plugin / "hooks").glob("*rules.md"))
    if len(found) > 1:
        raise ValueError(f"{plugin.name} has more than one rules file: keep one, so its rules stay short")
    return found[0] if found else None


def subagent_context(rules: str) -> str:
    return json.dumps({"hookSpecificOutput": {"hookEventName": "SubagentStart", "additionalContext": rules}}) + "\n"


def generated() -> dict[Path, str]:
    """Every generated file and what it must contain."""
    files: dict[Path, str] = {}
    for plugin in sorted(path for path in PLUGINS.iterdir() if path.is_dir()):
        rules = rules_file(plugin)
        if rules is not None:
            files[plugin / "hooks" / "subagent-context.json"] = subagent_context(rules.read_text())
        if any((plugin / "hooks").glob("*_gate.py")):
            for shared in sorted(SHARED_HOOKS.glob("*.py")):
                files[plugin / "hooks" / shared.name] = shared.read_text()
    return files


if __name__ == "__main__":
    for path, content in generated().items():
        path.write_text(content)
        print("built", path.relative_to(ROOT))
