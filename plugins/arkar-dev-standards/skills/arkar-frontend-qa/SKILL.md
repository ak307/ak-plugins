---
name: arkar-frontend-qa
description: AK's quality floor for browser-based UI work — run the app in a real browser, inspect it at the project's target screen sizes, meet a small hard accessibility/usability floor (other checks advisory), fix and re-check, and report honestly what was verified. Use this whenever building, changing, styling or fixing anything users see in a browser — web pages, React/Vue/Inertia/Blade/Django-template screens, Livewire components, dashboards, forms, layouts, CSS or Tailwind — even a small UI tweak, and even if the user doesn't ask for testing.
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

## 2. Hard floor vs advisory checks

Quality here works like Canva's design checker: a small **hard floor** that
every project meets, and **advisory checks** that guide the work but that a
project's design may deliberately override.

**Hard floor — never traded for style:**

- Body text, form labels and data are readable: at least 4.5:1 contrast
  (3:1 for text 24px+ or 19px bold), and no text below 14px for things users
  must read.
- Everything works with a keyboard, and keyboard focus is always visible
  (its style can match the design).
- Form fields have labels; errors say what's wrong and how to fix it.
- Motion respects `prefers-reduced-motion` (a calmer version is fine).
- Destructive actions (delete, reject, cancel) confirm first, naming what
  will be affected, or offer undo.
- No horizontal page scroll, clipped content or overlapping text on the
  project's target screens.
- No console errors or failed requests.

**Advisory — `references/design-checklist.md`:** layout, type, colour,
component states (including offline), forms, feedback and motion, responsive
behaviour, elevation / interaction / icon rules, chart choice, 200% text
size, translation-ready text (and tall scripts like Myanmar), component
code. Follow them by default.
The project's identity may deliberately break one (e.g. low-contrast
decorative display type, no hover states on a touch-only kiosk, unusual
navigation) — record it under "Deliberate deviations" in `DESIGN.md` and
mention it in the final message.

Scale the effort to the change: a colour tweak doesn't need new empty
states; a new page does.

## 3. Run it and look at it

**First, check what the app will talk to (Rule 0, production safety).** A
running app reads `.env`: if its database, queue, mail or storage point at
production, every click and form submit changes live data and sends real
messages. So:

- **Local or test data only** (database local or in-memory, mail/SMS on
  `log`/`array`/`locmem`, queue `sync`): run it and interact fully.
- **Production, shared or unclear:** don't start the app against it. Say so,
  and propose a local setup (a `.env.testing`-style local database, SQLite,
  docker-compose). Until then, check what you can without running it —
  build, tests that don't touch the database, reading the markup and CSS —
  and state clearly that the UI wasn't inspected.
- Never run seeders or create users except in a database you've confirmed is
  local. Never start queue workers or schedulers for QA.
- Browse only `localhost` / `127.0.0.1`. Never open a production or staging
  domain with the browser tools — Claude in Chrome is AK's real browser,
  signed in as him.

Then start the app (dev server in the background) and open the changed
screens in a real browser. Use the first that is available:

1. **Claude in Chrome** (`mcp__claude-in-chrome__*` tools) — AK's own Chrome.
2. **Playwright MCP** (`mcp__playwright__*` tools), if configured.
3. **The screenshot script** in this skill, `scripts/screenshot.cjs` — takes
   all three viewport screenshots and reports console errors, failed requests
   and horizontal overflow. Works anywhere Node runs.

`references/browser-tools.md` explains each option, how to start the app per
stack, and what to do when no browser is available. Read it before the first
inspection.

For each changed screen:

- **The project's target screens:** the sizes listed under "Target screens"
  in `DESIGN.md` (e.g. a kiosk: 1280 × 800 landscape only; a control-room
  board: 1920 × 1080). If none are recorded, use mobile **375 × 812**,
  tablet **768 × 1024** and desktop **1440 × 900**. Take a screenshot at each
  and actually look at it.
- **Interact:** click what you changed, submit forms (valid and invalid), open
  menus and dialogs, use Tab and Escape.
- **Console and network:** no errors or failed requests.
- Behind a login: use test credentials from local seed data or
  `.env.example`, or create a test user the way the project does — only in a
  local database.
- Screenshots are of local test data. If real personal data (NRIC, salary,
  medical details) appears, stop: you're not on test data. Delete
  `qa-screenshots/` when you're done.

## 4. Fix and re-check

Check each screenshot against the hard floor and the "Common defects" list in
`design-checklist.md` (and the design critique in `arkar-frontend-design`).
Fix, re-shoot, check again — don't stop at the first screenshot. Then run the
project's existing tests and checks (unit tests, linters, type checks, build).

## 5. Definition of done — and honesty

Done only when, as far as the environment allows:

- the app runs;
- the changed screens were inspected in a browser at the project's target
  screen sizes (default 375, 768 and 1440 wide);
- the hard floor is met;
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
