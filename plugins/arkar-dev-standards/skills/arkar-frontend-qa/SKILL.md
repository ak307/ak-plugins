---
name: arkar-frontend-qa
description: AK's standard for browser-based UI work — polished responsive design, and running the app in a real browser to inspect it at mobile, tablet and desktop sizes, fix what's wrong and re-check before calling it done. Use this whenever building, changing, styling or fixing anything users see in a browser — web pages, React/Vue/Inertia/Blade/Django-template screens, Livewire components, dashboards, forms, layouts, CSS or Tailwind — even a small UI tweak, and even if the user doesn't ask for testing or design.
---

# Frontend quality and visual QA

AK's team ships internal and customer-facing web apps. A screen that compiles
but looks generic, breaks on a phone, or has a dead button costs more to fix
after users find it than before. So for browser-based work, design quality,
responsiveness, usability and checking the real rendered app are part of the
task, not extras. Apply this by default unless AK says otherwise for a task.

Correctness, security and the existing code standards still apply; this adds
to them.

## 1. Before writing UI code

- Identify the main user journeys for the change (who uses this screen, what
  they need to get done).
- Look at the existing app first: its design system (Tailwind theme, CSS
  variables, shadcn/ui or other component library, layout components), and
  two or three existing screens. New UI matches them. Don't introduce a
  second component library or a new colour palette into an existing app.
- Find how the app runs locally (README, `package.json` scripts, `composer.json`,
  `manage.py`) and which tests/checks exist.

## 2. Design direction

- **Existing app:** follow its look. Improve weak spots within that look.
- **New app:** choose a deliberate direction that suits the users (e.g. a
  dense, calm, data-first look for finance staff; large touch targets and
  high contrast for security officers on phones), define it as tokens
  (colours, type scale, spacing, radius, shadows) in one place, and use the
  tokens everywhere.
- **CBM apps:** primary brand colour `#AE1A28`, used for primary actions,
  focus and key highlights — not as a background for large areas. Pair it
  with neutral surfaces and check contrast of text on it.
- Aim for polished and distinctive, not template-default. Concretely: real
  hierarchy, consistent spacing, designed empty/loading/error states, purposeful
  icons, and subtle motion where it helps.

`references/design-checklist.md` has the detailed checklist (layout,
typography, colour, component states, forms, motion, responsive rules,
accessibility, and the defects to look for in screenshots). Read it when
building a new screen or app; skim the "Common defects" list before every
inspection.

## 3. Build it

Implement with all states in mind (loading, empty, error, success, disabled),
keyboard access and visible focus, labels and helpful validation on forms,
and motion that respects `prefers-reduced-motion`. Scale the effort to the
change: a colour tweak doesn't need new empty states; a new page does.

## 4. Run it and look at it

**Start the app** (dev server in the background) and open the changed screens
in a real browser. Use the first of these that is available:

1. **Claude in Chrome** (`mcp__claude-in-chrome__*` tools) — AK's own Chrome.
2. **Playwright MCP** (`mcp__playwright__*` tools), if configured.
3. **The screenshot script** in this skill, `scripts/screenshot.cjs` — takes
   all three viewport screenshots and reports console errors, failed requests
   and horizontal overflow. Works anywhere Node runs.

`references/browser-tools.md` explains each option, how to start the app for
each stack, and what to do when no browser is available. Read it before the
first inspection.

Then, for each changed screen:

- **Three viewports:** mobile **375 × 812**, tablet **768 × 1024**, desktop
  **1440 × 900**. Take a screenshot at each and actually look at it against
  the "Common defects" list.
- **Interact:** click the buttons and links you changed, submit forms (valid and
  invalid input), open menus/dialogs, use Tab and Escape.
- **Check the console and network** for errors and failed requests.
- Log in with test credentials from the project's seed data or `.env.example`
  when screens are behind auth; if none exist, create a local test user the
  way the project does (seeder, `createsuperuser`).

## 5. Fix and re-check

Fix every visual, functional and responsive problem you found, then take new
screenshots and check again. Don't stop at the first screenshot. Repeat until
the screens are clean at all three sizes, then run the project's existing
tests and checks (unit tests, linters, type checks, build).

## 6. Definition of done — and honesty

A browser-based task is done only when, as far as the environment allows:

- the app runs;
- the changed screens were inspected in a browser at 375, 768 and 1440 wide;
- the relevant interactions were tried;
- problems found were fixed and re-checked;
- the existing automated checks pass.

In the final message, say briefly what you checked (which screens, sizes and
interactions) and what you fixed. **If something couldn't be checked** — no
browser tool, the app needs a database or service that isn't available, a
login you couldn't get — say exactly what wasn't verified and why. Never claim
to have seen, clicked or tested something you didn't.

## When this doesn't apply

Backend-only changes (API endpoints, models, jobs) with no UI change, mobile
apps that don't run in a browser (Flutter for Android/iOS), emails/PDF
templates, and pure questions or explanations. For a Flutter **web** build,
the viewport and inspection steps still apply.
