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
- Screens × sizes looked at: <…> → felt ordinary: <list or "nothing"> → fixed: <list>
- Audit (scripts/audit.cjs, before → after): axe serious/critical <a→b>, console errors <a→b>,
  overflow <sizes>, targets <24px <a→b>, rendered system: radii <n> · shadows <n> · font sizes <n> · spacing values <n>
- Interaction probe (scripts/interaction-probe.cjs, before → after):
  no hover <a→b>, no focus <a→b>, no transition <a→b>, under 24px <a→b>
- Motion (filmstrips: load + <flows filmed>): <what moved well · what felt abrupt, slow, decorative or confusing → fixed> · reduced motion filmed: <yes/no>
- Motion metrics (scripts/motion-metrics.cjs on the main flows, incl. one interruption and --reduced, before → after):
  slow responses <a→b>, linear/slow movement <a→b>, popped in / vanished <a→b>, jumps <a→b>, low fps <a→b>, reduced motion ignored <a→b>
- States seen (every state in the sheet): <which>
- Experience walk (record.cjs videos, experience-standard.md): <flows × paths walked (happy, invalid,
  failure+retry, cancel/back/undo, refresh, keyboard, phone)> → moments fixed: <list> · still weak: <list>
- First-time-user walkthrough: <flows walked> → hesitations found and fixed: <list>
- Three-second test per main screen: <screen → what catches the eye first → wow / fine>
- Composition: <probe structure flags → fixed or justified by the sheet>
- Independent review (references/independent-review.md): <critical/major/minor found → fixed> · second review: <not needed / done> (or "cold review" if no subagent tool)
- Still not premium (if any) and why: <…>
```

**One pass, not rounds.** The pass checks the build against its sheet and
fixes every defect it finds, then the independent review runs once (twice
only if it found a critical defect). Don't rebuild the design to raise a
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

Apply `arkar-ui-intelligence/references/premium-standard.md` and the build
sheet to everything in scope. **The sheet is the checklist:** tick each
acceptance check, see each state it lists at each target size, walk each
flow it lists. Then go beyond it — walk every page, button, tab, dropdown,
menu, form, loading, processing, download, success and error state you
built or changed and ask: *does this feel premium, polished, beautiful,
intuitive and impressive, or boring, basic, generic or unfinished?* A state
or moment the sheet missed is added to the sheet and built.

1. **Audit** (web): `scripts/audit.cjs` on each changed page measures what
   the eye misses — accessibility violations (axe-core, WCAG 2.2 AA),
   console errors, broken assets, overflow at 1440/768/375/320, small
   targets — and the design system as actually rendered (distinct radii,
   shadows, font sizes, spacing values, colours). Fix every serious or
   critical violation, console error, failed request (a missing file, a
   blocked font CDN), fallback font and overflow — these are defects, not
   notes. A wide spread of values means tokens aren't being used —
   consolidate to about ≤ 6 radii, ≤ 12–14 font sizes and ≤ 5 shadows.
2. **Interaction probe:** `scripts/interaction-probe.cjs` takes a full-page
   screenshot, flags **template structures** (equal-card rows, tiles over a
   long table, repeating uniform sections, mostly empty sections), hovers,
   focuses and clicks every safe control, and reports which give no
   hover/focus/press feedback, have no transition, are too small, or do
   nothing visible — saving a slowed filmstrip of the first load and each
   click. A template flag on a new product or redesign is fixed from the
   content (`arkar-ui-art-direction/references/visual-ambition.md`); in an
   existing product it may be the product's own pattern — say so.
3. **Motion:** film each main flow with `scripts/film.cjs` (open the
   detail, filter, ask the AI and watch the answer arrive, confirm a
   destructive action, open and close a menu; `--span=3000` for longer
   sequences, `--reduced` once with reduced motion) and **look at every
   strip** — motion is judged by eye, like layout, against the sheet's
   choreography. Then measure the same flows with
   `scripts/motion-metrics.cjs <url> <steps>` — real presses, not previews:
   response time, each animation's timing and easing, frame pacing, things
   that pop in or vanish, jumps; interrupt one action mid-animation
   (`<step>@120`) and run once with `--reduced`. Cover the six motion areas
   in `references/motion-testing.md` that the product has. Each finding is
   checked against the film, then fixed or justified in the record.
4. **Experience walk** to
   `arkar-ui-intelligence/references/experience-standard.md`: record each
   main flow at real speed with `scripts/record.cjs <url> <out.mp4> --cursor
   <steps>` — the happy path, invalid input, a failure and retry (the mock's
   `?fail=1`), slow data (`?latency=slow`), cancel/back/undo, a refresh
   mid-task, keyboard only, and the phone size — and judge every moment:
   the press, the wait, the hand-off from loading to result, success and
   toasts (position, timing, wording, undo), dialogs, errors and recovery,
   transitions, information timing.
5. **First-time-user walkthrough** of each main flow: with no prior
   knowledge and a real goal, note every hesitation, confusion, missing
   feedback, unclear wording or dead end — and fix it.
6. **Whole-screen judgement, section by section:** the three-second test —
   "wow, this looks premium", or just "fine"? Check the boring signals in
   `arkar-ui-art-direction/references/visual-ambition.md` (muted or
   monochrome palette, no hero moment, flat, low contrast range, rows-only
   layout, empty areas) and fix with
   `arkar-ui-art-direction/references/premium-craft.md`. "Clean but
   plain", default type, flat grey surfaces and unstyled states are premium
   failures — in an existing product, judged within its design system.

7. **One system, not separate pages:** the same kind of control looks and
   behaves the same on every screen (one button family, one field style,
   one dialog, one toast); no screen carries its own copy of a shared
   component; the audit's spread of radii, shadows and font sizes stays
   small. A duplicate or drifting component is a defect — fold it back into
   the shared one.

Record a `## Verify` table in the record (sheet item or moment → what
happens → result → fix) and fix every defect it shows, re-checking each fix.
Then run the **independent review** (`references/independent-review.md`)
for new screens, page sets, products and redesigns. **Working is not done;
exceptional is done** — reached by deciding well and fixing every defect,
not by rebuilding.

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

Checks against the build sheet, `DESIGN.md` and the decisions of every
other specialist; the independent review is `references/independent-review.md`
(with `design-critic.md` and `experience-tester.md` as its two briefs);
the orchestrator (`arkar-ui-intelligence`) always ends UI work here.
