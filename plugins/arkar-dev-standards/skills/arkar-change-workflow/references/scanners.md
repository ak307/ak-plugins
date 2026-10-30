# Security checks per stack

Run the project's own tests first (baseline), then the scanners that fit the
change. Run tools with `uvx` / `npx` so nothing is added to the project's
dependencies. If a tool can't run (not installed, no network), say so in the
report and continue with the others.

## Contents
1. Tests (always)
2. Python — FastAPI, Django, Django agentic
3. Laravel / PHP
4. JavaScript / TypeScript front-ends
5. Flutter / Dart
6. Secrets (any project)
7. Multi-language (when available)
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
uvx bandit -q -r app -ll                 # or the project's package folder; -ll = medium+ severity
uvx ruff check --select S <changed files> # flake8-bandit rules via ruff, fast
uvx pip-audit                             # in the project env; or: uvx pip-audit -r requirements.txt
```

- With `pyproject.toml` + `uv.lock`: `uv export --format requirements-txt > /tmp/req.txt` then
  `uvx pip-audit -r /tmp/req.txt`.
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
uvx --from detect-secrets detect-secrets scan --all-files <changed files or folder>
```

Also check by reading: no keys, passwords, tokens or connection strings in
code, config committed to git, logs or front-end bundles; `.env` is in
`.gitignore`; `.env.example` has placeholders only.

## 7. Multi-language (when available)

```
uvx --from semgrep semgrep scan --config auto --metrics=off <changed files>
```

Semgrep downloads its rules from semgrep.dev; on networks that block it, skip
it and say so. `osv-scanner` (if installed) checks lockfiles for any
language: `osv-scanner scan source -r .`

Claude Code's built-in `/security-review` command can also be used as an
extra pass over the pending changes.

## 8. Reading the results

- **Confirm before reporting.** Open the flagged line and decide whether it's
  real in context (e.g. bandit flags every `subprocess` import — only
  `shell=True` with user input matters).
- **Scope:** findings in your new code → fix now. Findings in existing code →
  proposals (🟢 / 🟠). Findings in unrelated parts of the repo → mention
  briefly under "remaining risks" only if serious (high/critical).
- **Dependency findings:** give the package, current version, fixed version,
  and whether the fix is a patch/minor (usually 🟢) or major (🟠) upgrade.
