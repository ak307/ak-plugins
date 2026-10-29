---
name: arkar-frontend-qa
description: AK's fixed quality standard for browser-based UI work — run the app in a real browser, inspect it at mobile, tablet and desktop sizes, test interactions, accessibility and states, fix and re-check, and report honestly what was verified. Use this whenever building, changing, styling or fixing anything users see in a browser — web pages, React/Vue/Inertia/Blade/Django-template screens, Livewire components, dashboards, forms, layouts, CSS or Tailwind — even a small UI tweak, and even if the user doesn't ask for testing.
---

# Frontend quality and visual QA

This is the part of frontend work that is the same in every project: the
quality floor and the habit of checking the real rendered app. A screen that
compiles but breaks on a phone, has a dead button or can't be used with a
keyboard costs more to fix after users find it. How the UI **looks** — its
identity — is project-specific and comes from the `arkar-frontend-design`
skill; use both together.

Correctness, security and the code standards still apply.

## 1. Before writing UI code

- Identify the main user journeys for the change.
- Look at the existing app: its components, tokens and `DESIGN.md` if present
  (see `arkar-frontend-design`). Don't add a second component library.
- Find how the app runs locally (README, `package.json`, `composer.json`,
  `manage.py`) and which tests/checks exist.

## 2. Build to the quality floor

`references/design-checklist.md` is the floor every project meets, whatever
its look: layout and hierarchy, readable type sizes, contrast, component
states, forms and validation, feedback and motion (including
`prefers-reduced-motion`), responsive behaviour, accessibility, elevation /
interaction / icon rules, chart choice. Scale the effort to the change: a
colour tweak doesn't need new empty states; a new page does.

## 3. Run it and look at it

Start the app (dev server in the background) and open the changed screens in
a real browser. Use the first that is available:

1. **Claude in Chrome** (`mcp__claude-in-chrome__*` tools) — AK's own Chrome.
2. **Playwright MCP** (`mcp__playwright__*` tools), if configured.
3. **The screenshot script** in this skill, `scripts/screenshot.cjs` — takes
   all three viewport screenshots and reports console errors, failed requests
   and horizontal overflow. Works anywhere Node runs.

`references/browser-tools.md` explains each option, how to start the app per
stack, and what to do when no browser is available. Read it before the first
inspection.

For each changed screen:

- **Three viewports:** mobile **375 × 812**, tablet **768 × 1024**, desktop
  **1440 × 900**. Take a screenshot at each and actually look at it.
- **Interact:** click what you changed, submit forms (valid and invalid), open
  menus and dialogs, use Tab and Escape.
- **Console and network:** no errors or failed requests.
- Behind a login: use test credentials from seed data or `.env.example`, or
  create a local test user the way the project does.

## 4. Fix and re-check

Check each screenshot against the "Common defects" list in
`design-checklist.md` (and the design critique in `arkar-frontend-design`).
Fix, re-shoot, check again — don't stop at the first screenshot. Then run the
project's existing tests and checks (unit tests, linters, type checks, build).

## 5. Definition of done — and honesty

Done only when, as far as the environment allows:

- the app runs;
- the changed screens were inspected in a browser at 375, 768 and 1440 wide;
- the relevant interactions were tried;
- problems found were fixed and re-checked;
- the existing automated checks pass.

In the final message, say briefly what you checked (screens, sizes,
interactions) and what you fixed. **If something couldn't be checked** — no
browser tool, a missing database or service, a login you couldn't get — say
exactly what wasn't verified and why. Never claim to have seen, clicked or
tested something you didn't.

## When this doesn't apply

Backend-only changes with no UI change, mobile apps that don't run in a
browser (Flutter for Android/iOS), emails/PDF templates, and pure questions.
For a Flutter **web** build, the viewport and inspection steps still apply.
