# ak-plugins

AK's private Claude Code plugins. One repo, installed once on every laptop,
updated automatically when this repo changes.

## What's inside

**`dev-standards`** plugin:

- **Always-on coding rules** (`plugins/dev-standards/hooks/coding-rules.md`) —
  loaded into every Claude Code session at startup by a SessionStart hook:
  follow an existing project's layout, readable intermediate-level code,
  naming, comments, and a self-check before finishing.
- **`project-structure` skill** — standard project templates, used whenever
  Claude creates a project, adds a module, or decides where a file goes.
  Templates in `plugins/dev-standards/skills/project-structure/references/`:
  FastAPI, Django, Django agentic (LangChain / LangGraph / LangSmith),
  Laravel (Inertia + React starter kit) and Flutter.

## How it reaches every laptop

The repo is added as a plugin marketplace on claude.ai (Customize → Plugins,
"Sync automatically" on) and the `dev-standards` plugin is enabled there.
Claude Code on any laptop signed in with that claude.ai account downloads it
at session start — nothing to install per laptop.

Requirements per laptop: Claude Code 2.1.273 or newer, signed in with
`/login` using the claude.ai account (not an API key).

Fallback if a laptop can't use claude.ai sync:

```bash
claude plugin marketplace add ak307/ak-plugins
claude plugin install dev-standards@ak-plugins
```

## Updating the rules or templates

1. Edit the files here, bump `version` in
   `plugins/dev-standards/.claude-plugin/plugin.json`, commit and push to
   `main`. Try larger changes on a branch first and merge when the tests pass.
2. On claude.ai: **Customize → Plugins → Add → Manage marketplaces → ⋮ on
   `ak-plugins` → Check for updates.** The "Synced commit" should change to the
   commit you just pushed.
3. Each laptop gets the new version at its next Claude Code start.

Step 2 is needed because claude.ai's "Sync automatically" currently doesn't
react to new pushes (known bug:
https://github.com/anthropics/claude-code/issues/93825). Once that's fixed,
step 2 becomes unnecessary.

## Adding a template for another stack

Add `plugins/dev-standards/skills/project-structure/references/<stack>.md`
and a row for it in the table in that skill's `SKILL.md`.

## Checking it works

```bash
claude plugin validate .
```

Tests for the `project-structure` skill are in
`plugins/dev-standards/skills/project-structure/evals/` (one folder per
case). Run them with `claude plugin eval plugins/dev-standards/skills/project-structure --allow-tools Write,Edit,Bash --scaffold`.

In a new session, ask Claude: "What coding standards were you given at the
start of this session?" — it should quote the first heading of
`coding-rules.md`.
