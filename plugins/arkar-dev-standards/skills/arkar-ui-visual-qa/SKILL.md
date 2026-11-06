---
name: arkar-ui-visual-qa
description: Verifies UI work with real evidence — safely runs the app on local or test data only, opens the actual rendered interface (Claude in Chrome, Playwright, or the bundled screenshot and motion-check script), captures screenshots at the target screen sizes, inspects typography, spacing, hierarchy, overflow, consistency, interactions, loading states, responsive behaviour and motion (including reduced motion), applies weighted quality gates with hard blockers, fixes defects and re-checks, and reports honestly what was and wasn't verified. Use this after ANY change users can see — web pages, components, dashboards, forms, CSS or Tailwind, Flutter or React Native screens — even a small tweak, and whenever asked to test, check, review or QA a UI. It never fabricates a test, screenshot or score.
---

# Visual quality assurance

## Purpose

A completed code change doesn't mean the UI is finished. This skill looks
at the real rendered result, finds what's wrong before users do, fixes it,
and reports with evidence.

## Activate when

- after any change users can see — always the last step of UI work;
- AK asks to test, check, review or QA a UI.

## Don't activate when

- backend-only changes, emails/PDF templates, pure questions.

## 1. Run it safely (production safety first)

A running app reads `.env`: if its database, queue, mail or storage point at
production, every click changes live data and sends real messages.

- **Local or test data only** (local/in-memory database, mail/SMS on
  `log`/`array`, queue `sync`, Firebase emulator or dev project): run it and
  interact fully.
- **Production, shared or unclear:** don't start the app against it. Say
  so, propose a local setup, check what you can without running it (build,
  tests that don't touch the database, reading markup and styles) and state
  that the UI wasn't inspected.
- Never run seeders or create users except in a confirmed local database;
  never start queue workers or schedulers for QA.
- Browse only `localhost` / `127.0.0.1` — Claude in Chrome is AK's real
  browser, signed in as him.
- If real personal data appears in screenshots, stop — you're not on test
  data. Delete `qa-screenshots/` when done (it's git-ignored).

## 2. Discover the tools, then inspect

Use the first available (`references/visual-inspection.md`): Claude in Chrome
→ Playwright MCP → the bundled script `scripts/screenshot.cjs` (Node +
Playwright; screenshots at each size, console errors, failed requests,
horizontal overflow, and `--motion` for animation checks). For mobile apps,
`references/responsive-testing.md` (emulators, widget and golden tests).

For each screen in scope:

1. **Screenshots at the target screens** (`DESIGN.md`; default 375×812,
   768×1024, 1440×900) — and **look at each one** (Read the PNGs).
2. **Examine:** typography, spacing, hierarchy, alignment, overflow and
   clipping, component consistency, the signature element, empty/loading/
   error states.
3. **Interactions** (`references/interaction-testing.md`): click what
   changed, forms valid and invalid, menus, dialogs, keyboard (Tab, Enter,
   Escape), focus visibility.
4. **Motion** (`references/motion-testing.md`): it runs, it matches the
   motion language, it's quick on frequent actions, it calms under reduced
   motion, nothing is left invisible.
5. **Console and network:** no errors or failed requests.

## 3. Gate, fix, re-check

Apply `references/quality-gates.md`: the hard floor and hard blockers first,
then the weighted gates as a diagnostic. Fix meaningful defects, re-shoot,
check again — don't stop at the first screenshot. Then run the project's own
checks (build, lint, types, tests).

For an existing app with no real visual identity, when no redesign was
requested or already proposed: end the reply with a 🟠 proposal (redesign
with the UI skills — which screens, what stays the same) and don't do it.

## 4. Report honestly

In the final message: screens and sizes inspected, interactions and motion
tried, defects found and fixed, checks run, and a score only if there was
enough evidence. **Say exactly what wasn't verified and why** (no browser,
no device, a login you couldn't get, data not local). Never claim to have
seen, clicked or tested something you didn't.

## Expected output

Fixed defects, the verification summary, and (when it adds value) the
quality-gate scores with their evidence.

## Dependencies

Checks against `DESIGN.md` and the decisions of every other specialist;
the orchestrator (`arkar-ui-intelligence`) always ends UI work here.
