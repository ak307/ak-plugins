# Deploy and release

The release checklist and deploy recipes. Claude fills these in for the
project and hands AK the numbered steps; AK runs them.

## Contents
1. Release checklist
2. Backups
3. Recipe: Linux + nginx (Laravel)
4. Recipe: Linux + nginx (Django / FastAPI)
5. Recipe: Windows Server + IIS
6. Recipe: Docker Compose
7. Rollback
8. Release notes template

## 1. Release checklist

**Before (staging first, then production)**
- [ ] CI green on the exact commit being released.
- [ ] Migrations reviewed: SQL shown, expand/contract for destructive
      changes, no long locks on big tables, 🟠 items approved.
- [ ] Backup of the production database taken **just before** the release,
      and a restore of a recent backup tested in the last month.
- [ ] New environment keys added on the server (listed in release notes).
- [ ] Feature flags for anything that should launch switched off.
- [ ] Release notes and rollback plan written; a quiet time chosen for
      risky releases; affected users told if there is downtime.

**Deploy** — the recipe for the server type (below).

**After**
- [ ] `/health/ready` returns 200.
- [ ] Smoke test the 3–5 main journeys by hand (or the e2e suite against
      staging).
- [ ] Error tracker and logs watched for 15–30 minutes; no new error types.
- [ ] Queue workers and scheduler running the new code.
- [ ] Release recorded (tag / version, date, who).

## 2. Backups

- **Automatic** daily backups of every production database (MySQL
  `mysqldump --single-transaction --routines --triggers`, or the host's
  snapshot/backup service; PostgreSQL `pg_dump -Fc`), kept off the database
  server, with retention agreed with AK (e.g. 7 daily, 4 weekly, 12 monthly).
- **Before every release with a migration:** an extra backup, named with
  the release version.
- **Restore tested** at least monthly into a scratch database — a backup
  that has never been restored is a guess.
- Uploaded files (storage, media) are backed up too.

## 3. Recipe: Linux + nginx (Laravel)

Release folders with a `current` symlink, so rollback is switching the
symlink back:

```
/var/www/<app>/
├── releases/2026-10-31-1/   # one folder per release
├── shared/.env              # linked into each release
├── shared/storage/          # linked into each release
└── current -> releases/2026-10-31-1
```

Steps for AK:
1. Back up the database.
2. Upload or `git clone --depth 1 --branch <tag>` the release into a new
   `releases/<version>` folder; link `shared/.env` and `shared/storage`.
3. `composer install --no-dev --optimize-autoloader`, `npm ci && npm run build`
   (or upload built assets).
4. `php artisan migrate --force` — the reviewed migrations, after the backup.
5. `php artisan optimize` (config, routes, views, events caches).
6. Switch `current` to the new folder; `sudo systemctl reload php8.4-fpm`.
7. `php artisan queue:restart`; the scheduler cron uses `current`.
8. Run the "After" checks.

## 4. Recipe: Linux + nginx (Django / FastAPI)

- App server under **systemd**: Django `gunicorn config.wsgi` (or
  `uvicorn config.asgi:application` for agentic/async projects), FastAPI
  `uv run fastapi run --workers N` (or uvicorn workers); nginx terminates
  TLS and proxies to it; static files via WhiteNoise or nginx.
- Background workers (Django-Q2 `qcluster`, Celery) as separate systemd
  units.

Steps for AK:
1. Back up the database.
2. Check out the release tag into a new release folder; `uv sync --locked --no-dev`.
3. Django: `uv run python manage.py migrate` and
   `uv run python manage.py collectstatic --noinput`.
   FastAPI: `uv run alembic upgrade head`.
4. Switch the `current` symlink; `sudo systemctl restart <app> <app>-worker`.
5. Run the "After" checks.

## 5. Recipe: Windows Server + IIS

- Laravel: PHP via FastCGI in IIS, site root `public\`, URL Rewrite rules
  from Laravel's `web.config`; `web.config` also removes `X-Powered-By` and
  the `Server` header (see `arkar-change-workflow/references/vapt-checklist.md`).
- Python: IIS as a reverse proxy (URL Rewrite + ARR) to the app running as
  a Windows service (e.g. NSSM running `uv run …` / waitress / uvicorn), or
  `HttpPlatformHandler`.
- Release folders as on Linux, with the IIS site's physical path switched
  to the new folder (or an app-pool recycle after copying).

Steps for AK follow the same order: backup → copy release → install
dependencies → migrate → switch path / recycle app pool → restart the
worker service → "After" checks.

## 6. Recipe: Docker Compose

- Images built in CI and tagged with the version (never `latest` in
  production); `.env` on the server, not in the image.
- Steps for AK: backup → `docker compose pull` → run migrations as a
  one-off (`docker compose run --rm app <migrate command>`) →
  `docker compose up -d` → "After" checks.
- Rollback: set the previous image tag and `docker compose up -d`.

## 7. Rollback

- **Code:** switch back to the previous release (symlink, IIS path, image
  tag) and restart workers. Keep at least the last 3 releases on the server.
- **Database:** prefer a **forward fix** (a new migration or script). If the
  release's migration only added things (expand), old code keeps working
  with the new schema — no database rollback needed. Restore from the
  pre-release backup only for real data damage, and only after deciding what
  happens to data written since.
- Never run `down` migrations that drop columns or tables in production.

## 8. Release notes template

```
Release <version> — <date>
What's new: <user-visible changes, one line each>
Fixes: <bugs fixed>
Database: <migrations, which tables, expand/contract stage, expected duration>
Config: <new or changed environment keys>
Flags: <feature flags and their state>
Risks and rollback: <what could go wrong; how to roll back>
Steps: <numbered steps for AK>
```
