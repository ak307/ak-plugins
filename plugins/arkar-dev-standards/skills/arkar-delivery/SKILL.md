---
name: arkar-delivery
description: AK's standard for getting code safely from a laptop to production — CI pipelines per stack (tests, lint, type checks, scanners on every push), environments and configuration, deploy recipes per server type, backups before migrations, release and rollback checklists, feature flags and dependency updates. Claude prepares pipelines, scripts and checklists; AK runs every deployment. Use this whenever setting up or changing CI/CD, GitHub Actions, a pipeline, a Dockerfile or docker-compose for deployment, server or environment configuration, or when asked to deploy, release, go live, roll back, schedule backups or add a feature flag.
---

# Delivery — CI, releases and rollback

Code is only finished when it can reach production safely and come back if
something goes wrong. This skill gives every project the same pipeline and
release routine, so a junior can ship without guessing and a bad release is
a five-minute rollback, not a night of data repair.

## The rule: Claude prepares, AK deploys

Rule 0 applies in full. Claude writes CI files, deploy scripts, server
config, release notes and checklists, and checks them locally. Claude never:

- deploys, restarts or reconfigures a server (no `ssh`, `scp`, `rsync` to
  servers, `kubectl`, `docker push`, `terraform apply`, hosting CLIs);
- pushes to a branch that deploys, tags a release, or triggers a deploy
  workflow;
- runs migrations, backups or restores on a shared or production database.

Instead, the release checklist ends with **numbered steps for AK** to run.
The production guard asks before deploy commands; don't work around it.

## 1. CI on every project

Every repository gets a CI pipeline that runs on every push and pull
request: install, lint/format check, type/static checks, tests (on a service
database inside CI), dependency audit, secret scan, and a build. Templates
per stack are in `references/ci-templates.md` (GitHub Actions; the same
steps translate to GitLab CI or Azure DevOps).

- `main` is protected: changes arrive by pull request, CI must pass, and
  someone other than the author reviews when the team can.
- CI uses only test credentials stored as CI secrets — never production
  secrets, never a production database.
- Dependency updates: Dependabot (or Renovate) grouped weekly for
  patch/minor; majors as separate PRs (🟠).

When adding CI to an existing project, start with what passes today (tests,
audit) and propose the rest (lint, types, coverage) as 🟢 items so a red
pipeline doesn't block the team on day one.

## 2. Environments and configuration

- At least **local**, **staging** (production-like, test data) and
  **production**. Each has its own database, credentials, `APP_ENV`,
  mail/SMS settings and error-tracker environment.
- Configuration comes from the environment (`.env` on servers, CI/host
  secrets) — never committed. `.env.example` lists every key with
  placeholders.
- Production settings: debug off, HTTPS only, secure cookies, error
  tracking on, log level INFO, queue workers and scheduler supervised.
- Staging gets every release first; the release checklist is run there
  before production.

## 3. Releases

Use `references/deploy-and-release.md`:

1. **Before:** CI green on the release commit; migrations reviewed (safe
   per `arkar-project-structure/references/data-and-api.md` section 4, SQL
   shown, 🟠 items approved); a **backup taken and its restore tested**
   recently; release notes; rollback plan written; quiet time chosen for
   risky changes; feature flags for anything that should launch dark;
   front-end build hygiene (`arkar-security`): no source maps or debug
   output served, mock data and test switches off, no secrets in public env
   variables, security headers and cookie flags per its VAPT checklist.
2. **Deploy** with the recipe for the server type (Linux + nginx,
   Windows IIS, Docker Compose) — as steps for AK.
3. **After:** `/health/ready`, a smoke test of the main journeys, the error
   tracker and logs for 15–30 minutes, queue workers restarted.
4. **Rollback** if needed: code back to the previous release; database by
   forward fix or restore — never by running `down` migrations that drop
   data.

## 4. Feature flags

For changes that should be switched on separately from the deploy (a new
approval rule, a new screen for one department): Laravel Pennant, Django
`django-waffle`, FastAPI a settings flag or a small `feature_flags` table.
Flags have an owner and are removed once fully on.

## 5. Final message

Say what you prepared (files, checklists), what you checked locally, and
end with the numbered steps AK runs — backup, deploy, verify, and how to
roll back.
