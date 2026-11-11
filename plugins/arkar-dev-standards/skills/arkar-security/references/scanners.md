# Security checks per stack

Why tools at all: Claude reviews the code (authorisation, logic, injection,
output) — that is most of the work. Two things need a tool: **known-vulnerable
package versions** (new advisories appear daily, after any model's training
date — the package managers' built-in audits check the live database) and
**secrets across the whole repository** (an exhaustive pattern scan in
seconds, no tokens). Run the project's own tests first (baseline), then the
checks that fit the change. Run tools with `uvx` / `npx` so nothing is added to the project's
dependencies, with a version range so a surprise major release doesn't
change what runs. If a tool can't run (not installed, no network), say so in the
report and continue with the others.

## Contents
1. Tests (always)
2. Python — FastAPI, Django, Django agentic
3. Laravel / PHP
4. JavaScript / TypeScript front-ends
5. Flutter / Dart
6. Secrets (any project)
7. Optional extra pass
8. Reading the results

## 1. Tests (always — after Rule 0 confirms they point at a local or test database)

| Stack | Command |
|---|---|
| Python | `uv run pytest` (or `python manage.py test` if the project uses Django's runner) |
| Laravel | `php artisan test` (Pest/PHPUnit) |
| JS/TS | `npm test` / `npm run test` if defined; `npm run build` and the type check catch breakage too |
| Flutter | `flutter test` |

Run the tests that cover the affected area before changing anything
(baseline) and again after (regression check). Run the full suite at the end
when it's reasonably fast.

## 2. Python — FastAPI, Django, Django agentic

```
uvx --from 'bandit>=1.8,<2' bandit -q -r app -ll       # or the project's package folder; -ll = medium+
uvx --from 'ruff>=0.12,<1' ruff check --select S <changed files>
uvx --from 'pip-audit>=2.9,<3' pip-audit -r /tmp/req.txt  # see below for producing req.txt
```

- With `pyproject.toml` + `uv.lock`: `uv export --format requirements-txt > /tmp/req.txt` then
  `uvx --from 'pip-audit>=2.9,<3' pip-audit -r /tmp/req.txt`.
- Django: `DJANGO_DEBUG=false uv run python manage.py check --deploy` lists
  missing security settings. Use placeholder secrets — never load the real
  production `.env` for it.

## 3. Laravel / PHP

```
composer audit                            # known vulnerable packages (needs composer.lock)
vendor/bin/phpstan analyse                # Larastan, if the project has it
php artisan route:list                    # check new routes have the right middleware (auth, can:, throttle)
```

## 4. JavaScript / TypeScript front-ends

```
npm audit --omit=dev                      # production dependencies only
```

Treat `npm audit fix --force` as a major upgrade (🟠) — never run it without approval.

## 5. Flutter / Dart

```
dart analyze
flutter pub outdated                      # then check advisories for outdated packages
```

## 6. Secrets (any project)

```
uvx --from 'detect-secrets>=1.5,<2' detect-secrets scan --all-files <changed files or folder>
```

Also check by reading: no keys, passwords, tokens or connection strings in
code, config committed to git, logs or front-end bundles; `.env` is in
`.gitignore`; `.env.example` has placeholders only.

## 7. Optional extra pass

Claude's own review (`backend.md`, `frontend.md`) covers what pattern
scanners look for, in context. Use these only as an extra pass on a large or
sensitive change, never instead of the review:

```
uvx --from 'semgrep>=1.100,<2' semgrep scan --config p/owasp-top-ten --metrics=off <changed files>
```

Use a named ruleset, not `--config auto` (it needs metrics on — never turn
metrics on); if semgrep.dev is blocked, skip it and say so. Claude Code's
built-in `/security-review` command is another optional pass over pending
changes. Don't install other tools on AK's machines for this.

## 8. Reading the results

- **Confirm before reporting.** Open the flagged line and decide whether it's
  real in context (e.g. bandit flags every `subprocess` import — only
  `shell=True` with user input matters).
- **Scope:** findings in your new code → fix now. Findings in existing code →
  proposals (🟢 / 🟠). Findings in unrelated parts of the repo → mention
  briefly under "remaining risks" only if serious (high/critical).
- **Dependency findings:** give the package, current version, fixed version,
  and whether the fix is a patch/minor (usually 🟢) or major (🟠) upgrade.
