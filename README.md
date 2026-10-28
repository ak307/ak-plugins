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
  Templates: FastAPI (`skills/project-structure/references/fastapi.md`).

## One-time setup on each laptop

Prerequisite: git can read this private repo without prompting
(run `gh auth login` once, or have an SSH key on GitHub).

```bash
claude plugin marketplace add ak307/ak-plugins
claude plugin install dev-standards@ak-plugins
```

Then turn on auto-update: in Claude Code run `/plugin` → **Marketplaces** →
`ak-plugins` → **Enable auto-update**.

Alternatively, add this to `~/.claude/settings.json` (Claude Code installs
anything listed here that's missing when a session starts):

```json
{
  "extraKnownMarketplaces": {
    "ak-plugins": {
      "source": { "source": "github", "repo": "ak307/ak-plugins" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "dev-standards@ak-plugins": true
  }
}
```

## Updating the rules or templates

Edit the files here, commit and push. Each laptop picks up the change
automatically (within ~10 minutes of starting a session; it applies on the
next launch or after `/reload-plugins`). To update immediately:

```bash
claude plugin update dev-standards@ak-plugins
```

## Adding a template for another stack

Add `plugins/dev-standards/skills/project-structure/references/<stack>.md`
and a row for it in the table in that skill's `SKILL.md`.

## Checking it works

```bash
claude plugin validate .
```

In a new session, ask Claude: "What coding standards were you given at the
start of this session?" — it should quote the first heading of
`coding-rules.md`.
