# ak-plugins

AK's private Claude Code plugins. One repo, installed once on every laptop,
updated automatically when this repo changes.

## What's inside

**`arkar-dev-standards`** plugin (everything AK created is prefixed `arkar-`):

- **Always-on coding rules** (`plugins/arkar-dev-standards/hooks/coding-rules.md`) —
  loaded into every Claude Code session at startup by a SessionStart hook.
  Section 0 is **production safety** (check where tests, migrations, scripts
  and the app will point before running them; never run destructive database
  commands, apply migrations to shared databases, fix live data, edit `.env`
  or print secrets). Then: follow an existing project's layout, readable
  intermediate-level code, naming, comments, and a self-check before finishing.
  The first line shows the plugin version, so an old copy is easy to spot.
- **Production guard** (`hooks/production_guard.py`, run through
  `production_guard.sh` before every Bash, Read and MCP tool call). Always
  blocks wipe/rollback migrations, `DROP`/`TRUNCATE`, `DELETE`/`UPDATE`
  without `WHERE` sent to a database client, `--force` migrations, force
  push, `reset --hard`, `git clean -f`, recursive deletes of `/`, `~` or the
  project, and printing a whole `.env`. Asks AK first before tests,
  migrations, seeders, shells, servers, workers and database clients when
  the project's `.env` looks like production (`APP_ENV=production`, a
  non-local database host including LAN IPs, or `prod`/`live` in the database
  name). Needs Python 3 on the computer; without it, the guard asks before
  anything database-related instead of letting it through.
- **Read-only live-data tool**
  (`skills/arkar-change-workflow/scripts/readonly_query.py`) — the only way
  Claude reads a live database when investigating a reported bug: one
  `SELECT`/`SHOW`/`EXPLAIN` per run, refused if it writes, locks rows or
  touches files, run in a READ ONLY transaction with a 10-second limit, at
  most 50 rows, personal data masked, every statement logged to
  `~/.arkar/readonly-queries.log`. Works with MySQL, PostgreSQL and SQLite.

  **Recommended once per project:** a database user that can only read, in
  `.env` as `READONLY_DATABASE_URL` — the tool then never uses the app's own
  (writable) user. MySQL:
  `CREATE USER 'claude_ro'@'%' IDENTIFIED BY '<password>'; GRANT SELECT ON <db>.* TO 'claude_ro'@'%';`
  then `READONLY_DATABASE_URL=mysql://claude_ro:<password>@<host>:3306/<db>`.
  PostgreSQL: `CREATE ROLE claude_ro LOGIN PASSWORD '<password>'; GRANT CONNECT ON DATABASE <db> TO claude_ro; GRANT USAGE ON SCHEMA public TO claude_ro; GRANT SELECT ON ALL TABLES IN SCHEMA public TO claude_ro;`

Tests for the guard and the read-only tool:
`uvx --with "psycopg[binary]" --with pymysql pytest tests -q`.
- **`arkar-project-structure` skill** — standard project templates plus the cross-stack data/API and reliability/observability standards (`references/data-and-api.md`, `references/reliability-and-observability.md`), used whenever
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

- **`arkar-delivery` skill** — CI pipelines per stack (GitHub Actions:
  lint, types, tests on a CI database, dependency audit, secret scan,
  build), environments, deploy recipes (Linux + nginx, Windows IIS, Docker
  Compose), backups before migrations, release and rollback checklists,
  feature flags. Claude prepares; AK runs every deployment (the guard asks
  before ssh/rsync to servers, kubectl, docker push, terraform apply, firebase
  deploy and similar, and blocks terraform destroy / Firebase data deletes).
- **`arkar-change-workflow` skill** — every feature or update, in one order:
  read the project's `ARCHITECTURE.md` (the bigger picture), run baseline
  tests, propose safe cleanup of the code the change touches and any security
  fixes in **one approval list** (🟢 SAFE CLEANUP / 🟢 SAFE SECURITY FIX /
  🟠 CHANGES BEHAVIOUR), apply only approved items, build the feature cleanly
  and securely, run tests + code scan + dependency audit + secret scan, and
  record decisions in `ARCHITECTURE.md` and `SECURITY.md`. Includes a cleanup
  guide (what "OOP" means here) and a VAPT (OWASP ZAP) checklist.
  For bug reports: reproduce with a failing test, fix the reported bug, then
  review the whole connected workflow (first step to last, scope chosen per
  project) for hidden or related bugs, test safely (never production), and
  report findings as 🐞 RELATED BUG (confirmed / suspected) for approval;
  they're recorded under "Known bugs" in `ARCHITECTURE.md`.

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
3. Each laptop picks it up within **two** Claude Code restarts (VS Code:
   `Ctrl+Shift+P` → Developer: Reload Window). The first start downloads the
   new version in the background; the next start uses it. Check by asking
   Claude to list the skills starting with `arkar` and quote the newest
   section of the coding standards.

Step 2 is needed because claude.ai's "Sync automatically" currently doesn't
react to new pushes (known bug:
https://github.com/anthropics/claude-code/issues/93825). Once that's fixed,
step 2 becomes unnecessary.

## Adding a template for another stack

Add `plugins/arkar-dev-standards/skills/arkar-project-structure/references/<stack>.md`
and a row for it in the table in that skill's `SKILL.md`.

## Checking it works

**On every push (GitHub Actions, `.github/workflows/ci.yml`)** — no AI calls:
plugin validation, ruff, about 350 tests (production guard, read-only tool on
SQLite and real PostgreSQL, hook wiring and size, every code block in the
skills parses, the FastAPI template built and run against PostgreSQL), and a
check that `subagent-context.json` matches the rules. Run the same locally:

```bash
claude plugin validate .
uvx --with "psycopg[binary]" --with pymysql --with pyyaml pytest -q
python3 scripts/build_subagent_context.py   # after editing coding-rules.md
```

**Before publishing a change** — the behaviour evals: real Claude sessions
in throwaway projects, including ones wired to a fake "live" database. See
[`evals/README.md`](evals/README.md).

```bash
uv run --with pyyaml python evals/run.py            # all scenarios
uv run --with pyyaml python evals/run.py --only prod-live-bug
```

Tests for the `arkar-project-structure` skill are in
`plugins/arkar-dev-standards/skills/arkar-project-structure/evals/` (one folder per
case). Run them with `claude plugin eval plugins/arkar-dev-standards/skills/arkar-project-structure --allow-tools Write,Edit,Bash --scaffold`.

In a new session, ask Claude: "What coding standards were you given at the
start of this session?" — it should quote the first heading of
`coding-rules.md`.
