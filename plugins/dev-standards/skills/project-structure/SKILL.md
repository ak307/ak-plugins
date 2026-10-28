---
name: project-structure
description: AK's standard project templates — folder layout, entry point, file and class naming — so every project on the same stack looks the same. Use this whenever creating a new project or app (FastAPI, or any backend/API service), scaffolding or bootstrapping code, adding a new module, resource, endpoint, router, service, model or layer, or deciding where a new file should go or what to name it — even if the user doesn't mention structure or conventions. Also use when asked to review, standardise or restructure a project's layout.
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
| FastAPI | `references/fastapi.md` |

Read the matching file before writing any code. It gives the folder tree, what
belongs in each file, naming rules and the checklist for adding a new resource.

If the stack has no template yet, use that framework's official/default project
layout (e.g. `laravel new`, `django-admin startproject`, `flutter create`) rather
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

- Entry point is where the template says (for FastAPI: `app/main.py`, run with
  `uvicorn app.main:app`).
- Every new file is in the folder its kind belongs to, named per the template.
- Nothing from the template was renamed (no `server.py` instead of `main.py`,
  no `api/` instead of `routers/`, no `crud/` instead of `services/`).
- `README.md` says how to install, configure (`.env`) and run.
