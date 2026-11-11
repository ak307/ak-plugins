---
name: arkar-project-structure
description: AK's standard project templates — folder layout, entry point, file and class naming — plus the cross-stack standards for database design, migrations, API contracts, background jobs, logging, error tracking and health checks, so every project on the same stack looks and behaves the same. Covers FastAPI, Django, Django + LangChain/LangGraph agents, Laravel and Flutter. Use this whenever creating a new project or app, scaffolding or bootstrapping code, adding a new module, resource, endpoint, router, service, model, table, migration, background job or integration, or deciding where a new file should go or what to name it — even if the user doesn't mention structure or conventions. Also use when asked to review, standardise or restructure a project's layout.
---

# Project structure

AK works across many projects on several laptops, often switching between them
in the same week. When two projects on the same stack are laid out differently,
he and the junior developers have to relearn where everything lives each time.
The fix is boring on purpose: one template per stack, used every time.

## Step 1 — Is this a new project or an existing one?

**Existing project** (it already has source files): its current layout wins.
Look at the folders, the entry point and two or three existing files of the same
kind as the one you're about to add, and copy their placement and naming. Use the
template below only for decisions the project hasn't made yet. If the project
deviates from the template, don't restructure it — at most mention the difference
in one line and offer to migrate if it's causing problems.

**New project** (empty folder, or the user asks you to create one): use the
template for the stack exactly, then build the feature inside it.

## Step 2 — Load the template for the stack

| Stack | Template |
|---|---|
| FastAPI (APIs, small AI/LLM services) | `references/fastapi.md` |
| Django (web apps, internal tools, admin-heavy systems) | `references/django.md` |
| Django agentic project (LangChain / LangGraph / LangSmith agents) | `references/django-agentic.md` — read `django.md` too, it builds on it |
| Laravel (Inertia + React) | `references/laravel.md` |
| Flutter | `references/flutter.md` |

Picking between them for a new project: if the user names the framework, use
it. A project whose main job is running LLM agents with LangGraph is the
Django agentic template; a single small HTTP service around a model call is
FastAPI.

Read the matching file before writing any code. It gives the folder tree, what
belongs in each file, naming rules and the checklist for adding a new resource.

Two standards apply to every stack — read the parts you need:

| When you add or change | Read |
|---|---|
| A model, table, column, migration, query-heavy screen, or API endpoint | `references/data-and-api.md` — types, constraints, indexes, soft delete, audit trail, safe migrations, N+1 and pagination, the API error/pagination/versioning/idempotency contract |
| Status changes, background jobs, scheduled tasks, calls to other systems, logging, error tracking, health checks — and every new project | `references/reliability-and-observability.md` |
| CI, deployment, environments, releases | the `arkar-delivery` skill |

If the stack has no template yet, use that framework's official/default project
layout (e.g. `npm create vite`, `dotnet new`) rather
than inventing one, apply the always-on coding rules, and tell the user in one
line that there's no standard template for this stack yet so they can decide
whether to add one.

## Step 3 — Deviate only on purpose

The template can grow when a project genuinely needs it (a `workers/` folder for
background jobs, a `clients/` folder for external APIs). Add the new folder
alongside the standard ones, never instead of them, and name it in the same
style. When you deviate, say what you added and why in one sentence in your
reply so the decision is visible.

## Step 4 — Check before finishing

- Entry point and project package are where the template says (FastAPI:
  `app/main.py`; Django: `config/`; Flutter: `lib/main.dart` + `lib/app.dart`).
- Every new file is in the folder its kind belongs to, named per the template.
- Nothing from the template was renamed (e.g. no `server.py` instead of
  `main.py`, no `crud/` instead of `services/`, no project-named Django package
  instead of `config/`).
- `README.md` says how to install, configure (`.env`) and run.
- New projects also have: `/health/live` and `/health/ready`, JSON logs with
  a request ID in production, error tracking wired (GlitchTip/Sentry SDK, no
  personal data), a test-database guard, and a CI file from `arkar-delivery`.
- Security from the first commit (`arkar-security`): its plan lines, secure
  defaults, and its checks — dependency audit, secret scan, security tests,
  and the running-page check for web apps.
- New tables follow `data-and-api.md` section 7 (types, constraints,
  indexes, audit trail where people's records change).
