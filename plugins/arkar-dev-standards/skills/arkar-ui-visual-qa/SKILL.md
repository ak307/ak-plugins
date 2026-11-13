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

## Definition of done — the premium pass is required

UI work is **not done** until you have run the premium pass (section 3)
against the build sheet (`arkar-ui-intelligence/references/build-sheet.md`),
written its record to `qa-screenshots/premium-pass.md` (the evidence — the
folder is git-ignored), and put this block, filled in with real results, in
your final message (it may be shortened, never dropped):

```
Premium pass
- Build sheet: <where it is> → acceptance checks <passed n / n> · failed and fixed: <list>
- Use check (scripts/use-check.cjs, one run per surface): <surfaces checked> → FIX found and fixed: <list> · LOOK decided: <list>
- Surfaces looked at (desktop + phone, each once): <list> → felt ordinary: <list or "nothing"> → fixed: <list>
- Transactions (every save / send / assign / delete: pressed twice, left at once, failed and retried, refreshed): <which> → fixed: <list>
- Motion (interaction probe · filmstrips of <flows> · motion-metrics with one interruption and --reduced):
  <what moved well · what was abrupt, slow, decorative or ignored reduced motion → fixed>
- System (scripts/audit.cjs): radii <n> · shadows <n> · font sizes <n> · hand-made controls: <none / list>
- Security check (arkar-security/scripts/security-check.cjs): <findings in new code → fixed> · existing-code proposals: <🟢 / 🟠 list or "none">
- Independent review (references/independent-review.md): <critical/major/minor found → fixed> · second review: <not needed / done> (or "cold review" if no subagent tool)
- Still not premium (if any) and why: <…>
```

**One pass, not rounds.** The pass checks the build against its sheet and
fixes every defect it finds, then the independent review runs once (twice
only if it found a critical defect). Each tool runs once per surface or
page; after a fix, re-run only the check that failed — no "before → after"
pairs, no second sweep of everything. Don't rebuild the design to raise a
score; if something needs a different decision, change the sheet first. If a
tool couldn't run, the block says so — never fill it with results you didn't
get.

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
- When you serve files yourself, pick a **free port** (check it isn't in
  use — other projects and sessions may be serving on this machine) and
  confirm the first page you load is your project (its title or content)
  before taking any screenshots. If another app answers, stop using that
  port and don't repeat anything you saw from it.
- Browse only local addresses — `localhost`, `127.0.0.1` or a local
  development host such as Herd/Valet `*.test` — never a production or
  staging site: Claude in Chrome is AK's real browser, signed in as him.
- If real personal data appears in screenshots, stop — you're not on test
  data. Screenshots go in `qa-screenshots/` (the script adds a `.gitignore`
  inside it so they're never committed); remove it when done if you can.

## 2. The tools

The bundled scripts are the evidence (`references/visual-inspection.md`);
Claude in Chrome is for pages behind a sign-in the scripts can't reach. For
mobile apps, `references/responsive-testing.md` (emulators, widget and
golden tests).

| Script | What it is for | How often |
|---|---|---|
| `scripts/use-check.cjs` | uses a surface like a tester: load, accessibility rules, dark setting, ten widths, keyboard, phone, slow and failed requests, reduced motion, refresh, Back, double press; saves the surface to look at | once per surface |
| `scripts/interaction-probe.cjs` | hover, focus and press feedback on every control; template structures | once per page |
| `scripts/film.cjs` · `scripts/motion-metrics.cjs` | motion judged by eye, then measured | the main flow and each signature moment |
| `scripts/audit.cjs` | the design system as rendered: radii, shadows, font sizes, colours | once per page |
| `scripts/record.cjs` | a real-speed video of the main journey, for AK | once |
| `scripts/screenshot.cjs` | extra sizes or states the use check didn't save | when needed |

## 3. The premium pass — the most important check

Apply `arkar-ui-intelligence/references/premium-standard.md` and the build
sheet to everything in scope. **The sheet is the checklist:** tick each
acceptance check and see each state it lists. A state or moment the sheet
missed is added to the sheet and built.

1. **Use each surface** (web): for every surface in the sheet — the page,
   the table in use, the form part-filled, each open dialog, sheet, menu and
   picker, the empty and error states —
   `scripts/use-check.cjs <url> <steps that open it> --shots=<name>`.
   Steps are `click=<selector>`, `type=<selector>=<text>`, `press=<key>`,
   `hover=`, `scroll=`, `wait=`. Every **FIX** is a defect: a console error,
   a file that didn't load, a font or script from another server, layout
   that jumps, an accessibility violation, sideways scrolling, a control
   under a panel, a Tab stop with no visible focus, a target under 24 px, a
   view that a refresh loses or that Back walks out of, a save that lands
   twice. Every **LOOK** is decided, not ignored: a dark version nobody
   designed, targets under 44 px, browser-default controls, no loading or
   failure state.
2. **Look at each surface once** — the pictures the use check saved
   (`qa-screenshots/<name>-desktop.png`, `-phone.png`, `-dark.png`) — and
   ask of each: *premium, polished, intuitive and impressive, or boring,
   basic, generic or unfinished?* Judge the working surface hardest: does
   the table, form or list belong to this product's world, or could it sit
   in any admin panel? Check the boring signals in
   `arkar-ui-art-direction/references/visual-ambition.md` (no hero moment,
   flat, rows-only layout, default type, white cards under a designed
   header, unstyled states) and fix with
   `arkar-ui-art-direction/references/premium-craft.md` — in an existing
   product, judged within its look.
3. **The transaction list**, for every action that saves, sends, assigns,
   approves or deletes — this is where trust breaks, and three of four
   test builds had such a bug after a hundred checking steps:
   - pressed twice quickly → it happens once
     (`--commit=click=<button> --count=<selector of the result>`);
   - left at once (Back, Cancel, Discard, another tab) → it does not land
     afterwards, and nothing half-saved shows;
   - failed (`?fail=1`) → a specific message, the input kept, a retry that
     works; then succeeded → the state is right everywhere it shows;
   - refreshed mid-way → the user is where they were, with what they typed;
   - returned to later → still saved, still in the same state.
4. **Motion:** `scripts/interaction-probe.cjs` once per page (controls with
   no hover, focus or press feedback, no transition; template structures —
   fixed from the content in a new product, the product's own pattern in an
   existing one). Film the main flow and each signature moment with
   `scripts/film.cjs` (`--span=3000` for longer sequences) and **look at
   every strip** against the sheet's choreography. Measure the main flow
   once with `scripts/motion-metrics.cjs <url> <steps>` — one action
   interrupted (`<step>@120`) — and once with `--reduced`; when it reports a
   low frame rate, or the design uses glass, blur or heavy shadows, once
   more with `--real-browser` (only that number decides whether performance
   is a defect). Record one real-speed video of the main journey with
   `scripts/record.cjs <url> <out.mp4> --cursor <steps>` for AK.
5. **One system, not separate pages:** `scripts/audit.cjs` once per page —
   about ≤ 6 radii, ≤ 12–14 font sizes and ≤ 5 shadows as rendered; the
   same kind of control looks and behaves the same on every screen (one
   button family, one field style, one dialog, one toast); no screen
   carries its own copy of a shared component. A duplicate or drifting
   component is a defect — fold it back into the shared one.

Record a `## Verify` table in the record (sheet item or moment → what
happens → result → fix) and fix every defect it shows, re-running only the
check that failed. Then run the **independent review**
(`references/independent-review.md`) for new screens, page sets, products
and redesigns — it walks the product as a first-time user, so that walk
isn't repeated here. **Working is not done; exceptional is done** — reached
by deciding well and fixing every defect, not by rebuilding.

## 4. Gate, fix, re-check

Apply `references/quality-gates.md`: the hard floor and hard blockers first,
then the weighted gates as a diagnostic. Fix meaningful defects, re-shoot,
check again — don't stop at the first screenshot. Then run the project's own
checks (build, lint, types, tests).

For an existing app with a plain look, when no redesign was requested and
none is on record (check `DESIGN.md` / `ARCHITECTURE.md` "Open proposals"):
the screens in scope were lifted within its colours, type and layout
(`arkar-ui-intelligence`, step 2); end the reply with a 🟠 proposal to bring
the other screens to the same level — which screens, what stays the same —
record it under "Open proposals" in `ARCHITECTURE.md`, and don't do it. Once
recorded, don't repeat it.

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

Checks against the build sheet, `DESIGN.md` and the decisions of every
other specialist; the independent review is `references/independent-review.md`
(with `design-critic.md` and `experience-tester.md` as its two briefs);
the orchestrator (`arkar-ui-intelligence`) always ends UI work here.
