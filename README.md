# ak-plugins

AK's private Claude Code plugins. One repo, installed once on every laptop,
updated automatically when this repo changes.

## What's inside

**`arkar-dev-standards`** plugin (everything AK created is prefixed `arkar-`):

- **Always-on coding rules** (`plugins/arkar-dev-standards/hooks/coding-rules.md`) —
  loaded into every Claude Code session at startup by a SessionStart hook:
  follow an existing project's layout, readable intermediate-level code,
  naming, comments, and a self-check before finishing.
- **`arkar-project-structure` skill** — standard project templates, used whenever
  Claude creates a project, adds a module, or decides where a file goes.
  Templates in `plugins/arkar-dev-standards/skills/arkar-project-structure/references/`:
  FastAPI, Django, Django agentic (LangChain / LangGraph / LangSmith),
  Laravel (Inertia + React starter kit) and Flutter.
- **`arkar-frontend-design` skill** — gives every web project its own
  creative, impressive visual identity: explores 2–3 directions, picks one,
  records it in the project's `DESIGN.md` so later screens stay consistent,
  and critiques screenshots for uniqueness. Not a house style — each project
  is different on purpose.
- **`arkar-frontend-qa` skill** — the fixed quality floor for browser UI:
  run the app and inspect it at 375 / 768 / 1440 px, test interactions,
  accessibility and states, fix and re-check, report honestly. Includes a
  Playwright screenshot script (`scripts/screenshot.cjs`) for when no browser
  tool is connected. For the richest checks, start Claude Code with
  `claude --chrome` (or enable Chrome by default in `/chrome`).

Design ideas adapted from Anthropic's frontend-design and canvas-design
skills and from UI/UX Pro Max (MIT, Next Level Builder).

## How it reaches every laptop

The repo is added as a plugin marketplace on claude.ai (Customize → Plugins,
"Sync automatically" on) and the `arkar-dev-standards` plugin is enabled there.
Claude Code on any laptop signed in with that claude.ai account downloads it
at session start — nothing to install per laptop.

Requirements per laptop: Claude Code 2.1.273 or newer, signed in with
`/login` using the claude.ai account (not an API key).

Fallback if a laptop can't use claude.ai sync:

```bash
claude plugin marketplace add ak307/ak-plugins
claude plugin install arkar-dev-standards@ak-plugins
```

## Updating the rules or templates

1. Edit the files here, bump `version` in
   `plugins/arkar-dev-standards/.claude-plugin/plugin.json`, commit and push to
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

Add `plugins/arkar-dev-standards/skills/arkar-project-structure/references/<stack>.md`
and a row for it in the table in that skill's `SKILL.md`.

## Checking it works

```bash
claude plugin validate .
```

Tests for the `arkar-project-structure` skill are in
`plugins/arkar-dev-standards/skills/arkar-project-structure/evals/` (one folder per
case). Run them with `claude plugin eval plugins/arkar-dev-standards/skills/arkar-project-structure --allow-tools Write,Edit,Bash --scaffold`.

In a new session, ask Claude: "What coding standards were you given at the
start of this session?" — it should quote the first heading of
`coding-rules.md`.
