# Core test — released plugin vs the draft design-intelligence core (13 Nov 2026)

Record of the test AK approved: the same four briefs (`core-briefs.yaml`) built with the released
plugin (v3.5.0, "current") and with a test copy in which the draft core
(`drafts/ui-core/arkar-ui-design-intelligence/SKILL.md`) replaces every `arkar-ui-*` skill and the
end-of-session checklist gate is off ("core"). Tools: `core_test.py` (runner), `core_measure.cjs`
(first-screen shots and facts), `core_flow.cjs` (states and real-speed video), `core_blind.py`
(unlabelled A/B copies), and one independent blind tester agent per brief.

## Draft versions

- v2 (after an independent review): no compulsory idea, rendering never skipped, self-review names
  the weakest surface. Result: clean but plain, almost no visible glass (asset register, permit form).
- v3: adds AK's interaction excellence and the two-dimension review (energy dashboard).
- v4 ("revised"): plain is not premium, glass must be felt, type chosen on purpose. All four briefs
  were re-run on v4; these are the builds compared below.

## Time and cost (one session per build, up to four running at once)

| Brief | Current | Core v4 |
|---|---|---|
| Asset register (table-heavy, new product) | 75 min, $23.70, 13 skills | 35 min, $8.63, 4 skills |
| Permit to work (form-heavy, new product) | 47 min, $17.26, 12 skills | 44 min, $8.34, 3 skills |
| Energy dashboard (new product) | 73 min, $20.43, 11 skills | 16 min, $4.18, 3 skills |
| Ops Desk: assign a work order (existing React app) | 84 min, $18.06, 11 skills | 10 min, $2.74, 4 skills |

Earlier core drafts: asset register 29 min $6.82 (v2), permit 30 min $7.58 (v2), energy 22 min $5.68 (v3).

## Automated audit of the first screen (same tool for both)

No serious or critical axe violations and no overflow in any new-product build of either setup.
Both Ops Desk builds show the same contrast failure and phone overflow (not checked against the
app before the change). `audit.cjs` cannot inject axe into a page with a strict Content-Security-Policy
(two builds); it needs `bypassCSP`.

## Blind testers (did not know which setup made which; 10 = Apple-made, 5 = ordinary competent web app)

| Brief | Current | Core v4 | Tester would ship |
|---|---|---|---|
| Asset register (7 areas, /70) | 50 | 49 | Current after 3 fixes; untouched today, core is safer |
| Energy dashboard (7 areas, /70) | 51 | 48 | Current after 1 blocker fix; untouched today, only core is safe |
| Ops Desk feature (8 areas, /80) | 60 | 49 | Current after 3 fixes |
| Permit to work (7 areas, /70) | 44 | 50 | Core; current confirmed permits that were not submitted |

Pattern across the four briefs:

- **Current is ahead on** first impression and identity ("wow" vs "good"), motion (complete enter
  and exit, lists that move, numbers that transition), feedback states (loading, slow, failure,
  retry, rollback), kept state (address bar, refresh, Back), keyboard depth and touch targets.
- **Core is ahead on** speed of response, information clarity, form design (validation on leaving a
  field, rules stated first, honest save status), guard rails before committing, fitting an existing
  app's look, and not breaking: three of the four current builds had a trust-breaking bug (a save
  that lands after Discard, an alerts list that goes blank, a submitted permit that reverts to
  draft), plus rows running under a panel, text on glass at 2.8–3.6:1, artificial waits, a phone
  page that jumps to the top on every choice and a hero that hides the table.
- **Core's own faults:** plain first screens, motion that stops halfway (things open with a
  transition and close without), missing loading and failure design and no kept state in one build,
  a dialog that opens on the wrong record after Back, drafts kept only in the current tab, small
  touch targets, a CDN font, and a grid-paper background in four of its new-product builds (a
  sameness of its own).
- **Both:** native selects and date fields remain; toasts cover content.

## What this says about the design of the skill

1. The released skills' heavy process buys real quality in behaviour and identity, at 2–8 times the
   cost, and adds complexity that causes its own bugs.
2. Principles alone do not reliably produce the behaviours AK cares most about (kept state, designed
   loading and failure, complete motion, keyboard and touch). They need to be firm expectations.
3. Defects were found by using the product (double press, slow, fail, Back, refresh, keyboard,
   phone, intermediate widths), not by looking at screenshots. A short fixed "use it" check is the
   part of the old process worth keeping, ideally as one tool.
4. Ambition for a new product's identity has to be asked for; without it the result is clean and
   forgettable.

## AK's blind verdict (he did not know which setup made which)

| Brief | Looks better | Feels better | Would ship | His note |
|---|---|---|---|---|
| Asset register | Current | Current | Current | Some UI is simple and not Apple-level, but mostly better than the other |
| Permit to work | Current | Current | Current | Same note |
| Energy dashboard | Current | Current | Current | Same note |
| Ops Desk feature (existing app, look kept) | Same | Same | Neither | "I don't like both A and B at all" |

Decision: the draft core is **not** proposed as a replacement for the released UI skills. The
released plugin makes the look AK prefers; what he still finds missing is that some surfaces inside
it are "simple and not Apple-level". The open questions moved to: how to lift those inner surfaces,
how to cut the plugin's cost and its trust-breaking bugs without losing its look, and what an
existing app with a plain look should get.

## The "use it" check (`drafts/ui-core/arkar-ui-design-intelligence/scripts/use-check.cjs`)

One command that uses a local page the way the blind testers did and prints PASS / FIX / LOOK lines:
load (console errors, public-server dependencies, own files lost, layout shift), ten widths
(sideways overflow, controls under a fixed or sticky side panel), every Tab stop shows focus, phone
touch targets and small text, `?latency=slow` and `?fail=always`, reduced motion; with steps that
open a view, refresh / Back / Forward and layout shift during the steps; with `--commit` and
`--count`, a double press. About 30 seconds a run. `tests/test_use_check.py` holds a page that
behaves and a page with eleven built-in defects; the tool passes the first and names each defect on
the second.

Run on the eight builds of this test without steps, it found again, unprompted, these tester
findings: the core dashboard's layout jump (0.81), its Google Fonts dependency and its missing
slow and failure states; the current dashboard's rows running under the side panel at 1200–1280 px;
the core register's layout jump (0.29) and its seven browser-default controls; a Tab stop with no
visible focus in the current register; a 16 px "Reset demo data" target in the core permit form.
With a step that opens a building it also found that the core dashboard's sheet is not in the
address (Back leaves the app) while the current one passes refresh, Back and Forward.

What it does not find: the three trust-breaking bugs in the current builds (a save that lands
after Discard, an alerts list that goes blank, a submitted permit that reverts to draft). Those
need a person or an agent using the product with intent. The tool is a floor, not a tester.

## Round 3 — the released plugin with a working surface (branch `ui-working-surface`)

AK approved a revised plan: keep the released plugin's process (it makes the look he prefers),
give the tables, forms and controls the same standard as the hero, shorten the checking, and — for
an existing app with a plain look — keep its colours and layout but lift the screens in scope.

What the four released-plugin builds of round 1 actually did (from their event streams):

- All three new-product builds copied the three ready-made kits (glass, motion, experience). The
  glass kit covers bars, panels, sheets, pills and tabs — nothing for fields, dropdowns, date
  pickers, tables or rows.
- Of 55 UI reference files, about 10 were opened across the four builds; the business-systems
  file (tables and forms) never; premium-craft once.
- The plugin's own rule for tables and forms was "stay solid for legibility", with three lines
  of advice.
- Planning (loading 11–13 skills) was 6–8% of each build's cost; checking was 60–86%
  (80–130 turns, 70–100 images looked at, 20–40 tool runs, two reviewer agents).
- Three of the four builds still shipped a trust-breaking bug.

Changes tested in round 3:

1. `surface-kit.css` / `surface-kit.js` (arkar-ui-design-system/assets): fields, dropdown, date
   picker, action menu, tick / radio / switch, buttons, chips, table, list rows, toolbar,
   selection bar, status, meter, empty and skeleton states. Themed by tokens; the real `<select>`
   and `<input type="date">` stay underneath. 13 tests. Writing it, the use check found five faults
   in the kit itself (a form that moved under the pointer when a message appeared, a closed menu
   still rendered, no focus ring on an invalid field, a jump on load, small touch areas).
2. The working-surface standard in the always-read skill text (one world, no browser-default
   control, rows and fields as designed objects, glass on interaction).
3. Verify: one `use-check.cjs` run per surface, the transaction list on every action that
   commits, motion / system / security once each; no before → after pairs.
4. "A plain existing look is lifted, not copied."

Builds: the same four briefs, setup `surface`, results in `core-test-20261113-1139-r3`.

## Round 4 — the revised plugin, all four briefs (results in `core-test-20261113-1139-r4`)

Plugin frozen at commit `e884f41`: the working-surface kit with AK's material map and motion
principles. It does not include what came after (the feedback kit's state model, the thick-glass
critical dialog, the configuration layer).

| Brief | Released plugin (round 1) | Revised plugin (round 4) |
|---|---|---|
| assets-table | 75.0 min · $23.7 · 102 images · 29 check runs | 71.9 min · $19.4 · 56 images · 31 check runs |
| energy-dashboard | 72.9 min · $20.4 · 88 images · 45 check runs | 70.3 min · $17.0 · 68 images · 30 check runs |
| permit-form | 47.4 min · $17.3 · 71 images · 28 check runs | 55.6 min · $15.9 · 76 images · 18 check runs |
| opsdesk-assign | 84.4 min · $18.1 · 88 images · 63 check runs | 86.8 min · $13.7 · 53 images · 33 check runs |
| Total | 279.7 min · $79.5 | 284.6 min · $66.0 |

Cost is 17% lower; time is the same (2% higher). **The shorter checking step did not shorten
the builds.** Checking is still nearly all of the work after the first files are written:

- The use check was meant to run once per surface. Builds ran it 6 to 16 times, because every
  fix was followed by a full rerun.
- The older tools (audit, film, motion-metrics, record, interaction-probe) were still run
  beside it, 12 to 22 times per build.
- The quality gate sent each build back two or three times for a record it had not written
  (independent review, transaction list, security check, interaction probe), and the security
  gate once where the skill had not been loaded.

What the builds are like:

- All three new-product builds copied the working-surface kit and built their tables, forms,
  dropdowns, date fields and dialogs from it. The React app (Ops Desk) kept its own components
  and its look, as intended for an existing app.
- Use check on each finished build (the current `use-check.cjs`): asset register, energy
  dashboard and permit form have nothing to fix (asset register: touch targets under 44 px on a
  phone to look at). Ops Desk has two things to fix — badge contrast and a page that scrolls
  sideways on phones — and both are in the existing app: the released plugin's build has the
  same two, and the revised build reported them as proposals instead of changing them.
- Found by looking: the asset register's "Log service" form shows the browser's own validation
  bubble; it uses the kit's fields but not its form feedback.

Blind comparison (released plugin against revised, random A/B per brief, same journey states,
one recording each), judged by AK on 13 Nov 2026:

| Brief | Looks better | Feels better to use | Would ship | AK's note |
|---|---|---|---|---|
| Asset register | Released | Released | Released | Needs refinement to reach top tier, but better |
| Permit to work | Released | Released | Released | Motion looks stuck and is a little dizzying; still better overall |
| Energy dashboard | Released | Same | Released | UI bugs on the lower page; still better overall |
| Ops Desk (existing app) | Same | Same | Neither | "Both are boring designs. No innovation at all." |

**The revised plugin was preferred on no brief.** By the rule agreed before the test, the
working-surface standard and its kit are not released; `main` stays at v3.5.0.

What the result says:

- The kit made the inner screens tidier and more alike. The released builds' inner screens are
  bolder and specific to the product (the permit's ticket summary, the asset's dark service
  card with its life line), and that is what AK prefers — even with their defects.
- Every build AK chose still "needs refinement": motion that sticks, a layout bug. The bug he saw
  on the energy dashboard (table rows running under the side panel at 1280 px) is one the use
  check reports. Polish and correctness are what checking is for; it costs most of each build
  and still lets these through.
- Ops Desk: both builds put a list in a dialog. The step that rejects the obvious layout is
  applied to new products, not to a feature added to an existing app.
- Not tested by this round: the feedback state model, the critical dialog and the configuration
  layer, which came after the frozen copy. They are tested as code, and unproven as design.

## Diagnosis of the three builds AK chose (released plugin; read-only, 13 Nov 2026)

| Defect | Confirmed how | Cause | Why the released checks let it through |
|---|---|---|---|
| Permit: going from the list to the form cuts to an empty page for about 0.2 s, then a skeleton, then the form (dark, light, dark) | Frames of the recording; the code replaces the whole screen with an empty container on every change of screen | The motion kit has helpers for lists, panels, steps, loading and numbers — none for changing screen. The guidance for it is in reference files the builds rarely open | Noticed, not fixed: the motion tool reported things popping in and vanishing, and the build's own reviewers scored transitions 5 and motion 6 out of 10. The review runs once and its scores are only a diagnostic |
| Energy: table rows run under the "Needs action" panel at 1200 and 1280 px | Use check (11 controls overlapped) and the screenshot | A sticky panel laid over the content instead of holding its own column | The audit checks 1440, 768, 375 and 320 px only, and nothing checks for controls under a sticky panel |
| All three "need refinement" | Each build's own record | By its own reviewers: permit 6.4, energy about 6.9 ("still short of the bar"), asset register about 8.0 after fixes | By design: one review, fix the critical and major defects, scores are a diagnostic, and design shortfalls become proposals ("design changes, not defects — proposed to AK rather than built") |
| Asset register: one Tab stop with no visible focus (the buildings group) | Use check | A custom group given a Tab stop without a focus style | The interaction probe checks controls, not custom groups |

Not confirmed today: the three trust-breaking bugs last round's testers reported (a save that
lands after Discard, an alerts list that goes blank, a submitted permit that reverts to draft).
Acknowledging every alert on the energy dashboard in the plain path ends in a proper empty state.
No animation loops forever on any of the three once the page has settled.

A fault in this test's own recorder: `core_flow.cjs` takes its screenshots during the video, and
each one shows for two frames as a zoomed corner of the page. The released permit recording has
the most screenshots, 61 of its 103 seconds standing still and 21 abrupt whole-screen changes; the
revised one 9. Some of "looks stuck and a little dizzying" is the recorder, not the product. Fix
the recorder (video in a pass of its own) before the next comparison.

## Round 5 — the released plugin with three targeted fixes (branch `ui-top-tier`)

AK approved the plan from the diagnosis: a change of screen never cuts to blank (`changeScreen`
in the motion kit), layout checked at ten widths including controls under a sticky panel (in
`audit.cjs`), an early look-only review of the first screen and the main inner screen, and a test
recorder that films in a pass of its own. The released look and process are otherwise unchanged.

Builds: permit form and energy dashboard, setup `patched` (a frozen copy of the branch), results
in `core-test-20261113-1139-r5`. **Both were stopped by the account's five-hour usage limit before
the final independent review**: the energy dashboard at 54 min ($15.1) while preparing it, the
permit form after Verify with the review started ($14.2; it then sat until the 105-minute cap).
Neither wrote its record or final report, so time and cost can't be compared with other rounds,
and both are shown as they stood.

| Check | Released build AK chose | Patched build |
|---|---|---|
| Permit: empty frames between screens (fixed recorder, same journey) | 4 (0.16 s, list to form) | 0 |
| Energy: controls under a fixed or sticky panel, ten widths | at 1200 and 1280 px (12 controls) | none |
| Audit at 1440 / 768 / 375 / 320 (axe, console, overflow, small targets) | — | clean on both builds |

- The permit build routes its screens through `changeScreen`. The energy dashboard is one screen
  with a sheet, so it has no change of screen to route.
- On first load the patched permit build shows its content about 0.2 s later than the released
  one (3 empty frames at 0.5–0.6 s). That is the page starting, not a change of screen.
- The early review ran in both builds, and both went back for a second one after changing what
  the first asked for. Energy, first review: the first screen "top tier on desktop, held back by
  the phone layout"; second: "the alerts column looks like it comes from a different product" —
  the build as it stands has the alerts on the same dark surface. Permit, first: "good, close to
  top tier"; second: the inner screen "desktop good, phone ordinary".
- A fault in the released audit tool surfaced: it could not run on a page with a
  Content-Security-Policy (both new builds ship one), because it adds axe to the page. Fixed on the
  branch.

Blind comparison (AK's two chosen builds against the patched ones, random A/B, both sides filmed
with the fixed recorder), judged by AK on 14 Nov 2026:

| Brief | Looks better | Feels better to use | Would ship |
|---|---|---|---|
| Permit to work | Released | Released | Released |
| Energy dashboard | Patched | Patched | Patched |

One each. Every build is a new design, the patched builds were unfinished, and there are two
briefs: this does not show that the patched plugin makes better-looking products, nor worse. What
the round does show is in the table of checks above.

AK also found the top bar "not right and strange" in all four builds. All four give it the glass
kit's `.lg-bar` class, and they share the same faults:

- a dark rounded bar set in from the window's edges, so that once the page scrolls, content shows
  in the gap above it, sliced by its edge;
- text behind the glass readable through it (a heading under the bar's own text);
- a dark slab over a light page once the dark first screen has scrolled away, and a box inside a
  box while it is still over the dark one;
- about 90 px of every screen for a logo and an account name — and in the patched permit form a
  second header band under it;
- the same bar in four different products.

The glass kit gives the bar its rounded glass and says nothing about what is above or behind a
bar that floats.


## Round 6 — navigation and the header (branch `ui-top-tier`, 14 Nov 2026)

AK wrote the requirements (the bar is part of each product, not a decorative component inherited
from a kit; a clear content boundary; glass that adapts; no wasted height or second band; chosen
per product; responsive; calm motion; audited). Agreed with four additions and three softenings:

- added: what stays on screen is earned (the context, the step, the screen's action — not the
  logo or the account); the header is a state of the page, one band at a time; navigation, page
  header and utilities are decided separately, with the pattern following the number of
  destinations; focus and jump targets count as part of the scroll edge;
- softened: every theme the product ships (not always light and dark); two material states
  switched at a threshold (not a continuous change); one glass layer per stack.

What changed:

| Part | Change |
|---|---|
| Audit (`audit.cjs`) | Judges the header on the scrolled page at 1280×800 and 390×844: pinned height and bands against a budget (64 px; 15% of a phone's height), content above or beside the bar, the page readable through it, a bar whose tone fights the page, focus under a pinned bar, safe areas. `--scheme=dark\|light` runs it per theme. Reads a bar's material from a `::before` / `::after` layer too. |
| Glass kit (`liquid-glass.css`) | `.lg-bar` is no longer offered as the page's top bar. New: `.lg-scroll-edge` (attached; plain page at rest, frosted to 0.78 once content is under it) and `.lg-cap` (around a floating bar: the page's colour down to the bar, then a fade). |
| Experience kit (`experience-kit.js`) | `scrollEdge(bar, { title, scroller })`: marks the bar while content is under it, keeps `scroll-padding-top` at the bar's height, marks when the title has scrolled out and copies it into the bar. |
| Skills | The standard in `arkar-ui-ux-engineering/references/navigation-and-header.md`; a Navigation part in the build sheet; a scroll-edge rule in the build step; scrolled screenshots and a question about what stays pinned for the early and final reviewers; the audit's header findings are defects in Verify. |

The audit run on the four builds of round 5, unchanged:

| Build | Pinned at the top | Content above or beside the bar | Readable through | Other |
|---|---|---|---|---|
| Permit, released | 76 px — over | yes | no | — |
| Permit, patched | over, 2 bands | yes | — | a dark bar over a light page (phone) |
| Energy, released | 76 px — over | yes | no | — |
| Energy, patched | over | yes | likely (tint 0.42, blur 24 px) | — |

On the kit's own test pages (attached and floating, light and dark, desktop and phone): one band
of 52–64 px, nothing above, beside or readable through it, no control takes focus under it.
