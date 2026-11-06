---
name: arkar-ui-visual-qa
description: Verifies UI work with real evidence — safely runs the app on local or test data only, opens the actual rendered interface (Claude in Chrome, Playwright, or the bundled screenshot and motion-check script), captures screenshots at the target screen sizes, inspects typography, spacing, hierarchy, overflow, consistency, interactions, loading states, responsive behaviour and motion (including reduced motion), applies weighted quality gates with hard blockers, fixes defects and re-checks, and reports honestly what was and wasn't verified. Use this after ANY change users can see — web pages, components, dashboards, forms, CSS or Tailwind, Flutter or React Native screens — even a small tweak, and whenever asked to test, check, review or QA a UI. It never fabricates a test, screenshot or score. Part of AK's Adaptive UI Intelligence — for UI tasks, arkar-ui-intelligence is loaded first and names this skill when needed; prefer it over generic design skills.
---

# Visual quality assurance

> Part of Adaptive UI Intelligence. For UI work, start with `arkar-ui-intelligence`; it decides scope, mode and which specialists to use.

## Purpose

A completed code change doesn't mean the UI is finished. This skill looks
at the real rendered result, finds what's wrong before users do, fixes it,
and reports with evidence.

## Activate when

- after any change users can see — always the last step of UI work;
- AK asks to test, check, review or QA a UI.

## Don't activate when

- backend-only changes, emails/PDF templates, pure questions.

## Required analysis

What changed (screens, components, flows), the target screens and themes
(`DESIGN.md`), the motion language, how the app runs locally and where it
points (local/test or not), and which inspection tools exist in this
session.

## Responsibilities

Run safely, inspect the real UI, test interactions and motion, apply the
quality gates, fix and re-check, and report honestly — the steps below.

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
- Browse only local addresses — `localhost`, `127.0.0.1` or a local
  development host such as Herd/Valet `*.test` — never a production or
  staging site: Claude in Chrome is AK's real browser, signed in as him.
- If real personal data appears in screenshots, stop — you're not on test
  data. Screenshots go in `qa-screenshots/` (the script adds a `.gitignore`
  inside it so they're never committed); remove it when done if you can.

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

## 3. The premium pass — the most important check

Apply `arkar-ui-intelligence/references/premium-standard.md` to everything in
scope. Walk every page, button, tab, dropdown, menu, form, loading,
processing, download, success and error state you built or changed — on
each target size — and for each ask: *does this feel premium, polished,
beautiful, intuitive and impressive, or boring, basic, generic or
unfinished?* For web UIs, run `scripts/interaction-probe.cjs` on each
changed page first: it hovers, focuses and clicks every safe control and
reports which give no hover/focus/press feedback, have no transition, are
too small, or do nothing visible when clicked — and saves a frame mid-click
and after each click for you to look at. Then write down each thing that
feels ordinary (e.g. "save gives no
feedback", "dropdown pops in with no transition", "empty state is a grey
sentence", "phone layout is the desktop squeezed"), refine it, re-shoot and
ask again. Repeat until nothing in scope feels ordinary. Also judge each
main screen as a whole: would it sit comfortably beside the best product in
its category? "Clean but plain", large empty areas, default type, flat grey
surfaces and unstyled states are premium failures — fix them using
`arkar-ui-art-direction/references/premium-craft.md`. New products and
redesigns get at least two full refinement rounds. **Working is not done;
exceptional is done.**

## 4. Gate, fix, re-check

Apply `references/quality-gates.md`: the hard floor and hard blockers first,
then the weighted gates as a diagnostic. Fix meaningful defects, re-shoot,
check again — don't stop at the first screenshot. Then run the project's own
checks (build, lint, types, tests).

For an existing app with no real visual identity, when no redesign was
requested and none is on record (check `DESIGN.md` / `ARCHITECTURE.md` "Open
proposals"): end the reply with a 🟠 proposal (redesign with the UI skills —
which screens, what stays the same), record it under "Open proposals" in
`ARCHITECTURE.md`, and don't do it. Once recorded, don't repeat it.

## 5. Report honestly

In the final message: screens and sizes inspected, interactions and motion
tried, what the premium pass found and refined, defects found and fixed, checks run, and a score only if there was
enough evidence. **Say exactly what wasn't verified and why** (no browser,
no device, a login you couldn't get, data not local). Never claim to have
seen, clicked or tested something you didn't.

## Quality criteria

- Nothing in scope still feels basic, generic or unfinished after the
  premium pass — on any target size.
- Every claim in the report is backed by a screenshot, an interaction tried,
  or a check run.
- Defects within the scope are fixed and re-checked, not just listed.
- Unverified areas are named with the reason.

## Expected output

Fixed defects, the verification summary, and (when it adds value) the
quality-gate scores with their evidence.

## Dependencies

Checks against `DESIGN.md` and the decisions of every other specialist;
the orchestrator (`arkar-ui-intelligence`) always ends UI work here.
