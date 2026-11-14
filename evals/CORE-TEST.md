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

The audit run on the first screen of the four builds of round 5, unchanged:

| Build | Desktop, scrolled | Phone, scrolled |
|---|---|---|
| Permit, released | 76 px pinned — over the budget; content showing above or beside the bar | 64 px; content above or beside the bar; a dark bar over a light page; no safe-area handling |
| Permit, patched | the first screen does not scroll at this size | 64 px; a dark bar over a light page |
| Energy, released | 76 px — over; content above or beside the bar | 76 px; no safe-area handling |
| Energy, patched | 76 px — over; content above or beside the bar; the page likely readable through it (tint 0.42, blur 24 px) | 70 px; content above or beside the bar; likely readable through it; no safe-area handling |

No control takes focus under a pinned bar in any of the four.

On the kit's own test pages (attached and floating, light and dark, desktop and phone): one band
of 52–64 px, nothing above, beside or readable through it, no control takes focus under it.

### One rebuilt brief: the permit form (setup `patched`, a frozen copy of the branch at `af96ac0`)

Finished on its own: 54.9 min, $15.47, 155 turns, 11 skills, 3 reviewers (the early review and two
independent reviews; its own reviewers' overall score went from 6.4 to 7.6). The released build of
the same brief in round 4: 47.4 min, $17.3.

Its navigation decision, from its build sheet: one destination and a seven-section task, so no
navigation bar; nothing pinned on the list; in the editor one compact bar with the way back, the
permit's title once the page title has scrolled out, the save state and "Review & submit"; on a
phone the bar holds the section strip and Previous / Next sit at the bottom.

| Check (a long section of the editor, scrolled) | Round 4 build (released) | New build |
|---|---|---|
| Pinned at the top, desktop | 76 px — over the budget | 56 px, one band |
| Content showing above or beside the bar | yes | no |
| The page readable through the bar | no | no |
| Bar against the page | dark bar over a light page (phone) | in the page's tone |
| Pinned on a phone, top and bottom | 64 px at the top (a bottom bar as well, not measured) | 52 + 65 px = 14% |
| Focus under a pinned bar | none | none |
| Safe areas | not handled | handled |
| What the bar holds | logo, product name, save state, account | back, the permit's title when scrolled, save state, the screen's action |

The early reviewer, given scrolled screenshots, called the phone's pinned bar "a generic truncated
title" beside the section strip; the build merged the two before going on.

Not good: the new build is solid almost throughout. It did not copy the glass kit, its only glass
is one hand-made frosted bar (the phone's Previous / Next bar), and its `DESIGN.md` does not say
why. The two earlier permit builds both used the kit (top bar, segmented controls, sheets,
toasts). The session read only the first 60 lines of
`arkar-ui-art-direction/references/business-systems.md`; the section that makes Liquid Glass the
default for business systems starts at line 65, and no always-read skill text stated it. One
build, so this may be chance, but with the top bar no longer the obvious glass surface the default
is easier to miss.

### Liquid Glass stated as the default (AK, 14 Nov: "yes, i want Glass as default")

| Part | Change |
|---|---|
| Orchestrator, fixed rules (read on every UI task) | Liquid Glass is the default material for every new product and redesign: the floating layer is glass, the working content solid, over a background with something to refract. Going without it needs its reason in `DESIGN.md`. An existing product keeps its own material; glass there is a proposal. |
| Build sheet, `DESIGN.md` template | A Material line: which surfaces are glass, which are solid, what lies beneath — or the reason for none. |
| Art direction, design system, glass references | The default stated where the direction is chosen; "glassmorphism" (frosted cards everywhere) told apart from it. |
| Audit | A `material` line: the selectors whose styles use glass (a backdrop blur), or "no glass anywhere". On the round 4 permit build: `.lg-bar, .lg-panel, .lg-sheet, .lg-control, .lg-pill, .lg-segmented, .toast`. On the round 6 rebuild: `.bottom-bar`. |
| Early and final reviewers | Asked whether the floating layer is visibly glass and the content solid — or the product is solid throughout, or frosted everywhere. |

### The permit form rebuilt again, with glass stated as the default (a frozen copy of the branch at `8f47888`)

Finished on its own: 72.8 min, $20.53, 221 turns, 11 skills, 3 reviewers (the early review twice —
the first sent the editor back as "a standard stacked form" — and one independent review: no
critical defect, 9 major, all fixed; its overall score was 7.1 before the fixes and the build did
not have it scored again). The round 6 rebuild of the same brief: 54.9 min, $15.47. One build
each, so the extra 18 minutes and $5 can't be put down to the glass rule.

The default was picked up. `DESIGN.md` has the Material line ("Liquid Glass for the floating
layer — the scroll-edge header, the floating section rail, the readiness panel, the phone section
sheet and bottom bar, toasts. The forms, worker cards and upload slots people work in are solid.
Beneath the glass is the product's own canvas: a blueprint site-plan grid with a soft amber and
teal light field"), the build copied `liquid-glass.css` and used `.lg-scroll-edge`, `.lg-bar`,
`.lg-panel`, `.lg-sheet` and `.lg-cap`, and its early reviewer was shown the screens at rest and
scrolled, in light and dark.

| Check (the Workers section of the editor, scrolled) | Round 6 rebuild | This rebuild |
|---|---|---|
| Glass on screen, desktop | none | header (tint 0.92), section rail (0.42), "Still needed" panel (0.62) |
| Glass on screen, phone | the bottom bar (hand-made) | header (0.92), bottom bar (0.42); the section sheet when open |
| Glass kit copied | no | yes |
| Material line in `DESIGN.md` | none | yes |
| Pinned at the top, desktop | 56 px, one band | 56 px, one band |
| Content above or beside the bar · readable through it | no · no | no · no |
| Pinned on a phone, top and bottom | 52 + 65 px = 14% | 52 + 66 px = 14% |
| Focus under a pinned bar · safe areas | none · handled | none · handled |
| Bar against the page | in the page's tone | dark navy over a light page in the light theme (in tone in the dark theme) |
| axe serious or critical · console errors · overflow (four sizes, light and dark) | not rerun | 0 · 0 · none |

Not settled, or not good:

- **The dark bar.** After the early review the build carried the first screen's dark band into the
  editor, kept the pinned bar dark navy in the light theme, and recorded that in `DESIGN.md` as the
  brand's tone. The standard allows a dark bar over a light page only when the brand requires it;
  here the build invented the brand, so the exception is its own. It did raise it as a decision
  for AK. The bar is attached, the page opens with the same dark band, and nothing shows around or
  through it — unlike the round 5 floating bars — but it is still the thing the rule was written
  against.
- **Two of the glass surfaces are close to solid.** Its independent reviewer called the pinned bar
  "muddy" and the tablet sheet "too see-through"; the build raised their tints to 0.92 and 0.97.
  What reads as glass is the section rail, the "Still needed" panel and the phone's bottom bar,
  over a pale grid. This is restrained glass, not the round 4 build's.
- **The first screen has no glass on a desktop** (a phone gets a glass bar with the main action
  once the hero's button has scrolled away). Nothing floats on that screen, so this follows the
  rule as written.
- **Defects its own checks missed** (found by looking at the screenshots): on a desktop, an open
  worker card whose certificate has expired shows the name as "A…" — the red stamp takes the room;
  and the hanging tag's ring is cut by the pinned bar once the page has scrolled.

Two things about the checking itself, found on this build and fixed on the branch:

- **The audit's material line named style rules, not the screen.** On this build's first screen it
  listed `.lg-bar, .lg-panel, .lg-sheet…` — the copied kit — while nothing on that screen was
  glass: a build that copies the kit and uses none of it would have passed. The line now names
  what is glass on the scrolled screen at desktop and phone size, each with its tint (0.95 or more
  is reported as solid to the eye), and lists what the styles define apart from that. Tests: a
  page whose styles define glass that nothing uses; a bar at tint 0.96.
- **Screenshots at twice the pixel density under-render glass in this test browser.** At
  `deviceScaleFactor: 2`, headless Chromium 153 blurred only the upper part of each glass surface
  (checked on a bare page with one glass strip: fully blurred at 1, text readable through its lower
  half at 2). The bottom bar looked as if the form could be read through it; at 1 it is correctly
  blurred. The plugin's own scripts use 1, and nobody in this run used 2, but reviewers in earlier
  runs wrote their own scripts at 2, and the still screenshots sent to AK in rounds 4–6 were taken
  at 2 (the recordings at 1) — glass in those stills looked thinner than it is. The inspection reference and both review briefs now
  say to judge glass at 1.

### Two rules after that rebuild (AK, 14 Nov: "go ahead")

| Rule | Where |
|---|---|
| **The pinned bar takes the tone of the content under it.** A dark band at the top of a light page is part of the page: the bar sits on it at rest and is light frosted glass once the page's content is under it. No dark bar stays over a light page in a new product or redesign — the build writes its own brand, so recording one in `DESIGN.md` is not an exception. Only an existing product's real brand, or AK asking, keeps one. | Navigation and header standard (material, defect table), glass reference, orchestrator's build step, both review briefs, the audit's wording |
| **Glass stays visibly glass: a tint of about 0.85 or less.** When text on glass is hard to read, the fix is more blur, a dim layer under a sheet or dialog, or stronger text — never a tint raised until the surface is solid. | Orchestrator's fixed rule, build sheet's Material line, glass reference (rule 2), both review briefs; the audit reports a glass surface tinted past 0.85; the kit gives sheets their own tint (0.74 light, 0.76 dark, was 0.62 and 0.66) and a dim layer (`.lg-scrim`) |

The second rule answers what happened in the rebuild: its reviewer called the sheet (the kit's
0.62) "too see-through" and the dark bar "muddy", and the build's only lever was the tint.

## Round 7 — the two rules on two briefs (a frozen copy of the branch at `6c26aa9`, 14 Nov 2026)

Both briefs AK judged in round 5, rebuilt once each with the navigation and header standard, glass
as the default, the pinned bar in the tone of the content under it, and the glass ceiling.

| | Permit form | Energy dashboard |
|---|---|---|
| Finished on its own | yes, 101.2 min (the cap is 105), $26.32, 4 reviewers | yes, 72.6 min, $17.58, 3 reviewers |
| Its own reviewers' overall score | 7.25, then 7.3 (target 8) | 6.6, then 7.7 look and 7.6 use (target 8) |
| Critical defects its reviewers found | 3, then 1 more; all fixed | 1; fixed |
| Themes it ships | light only | light only (a dark theme is listed as a proposal) |
| Pinned at the top, desktop | 56 px, one band | 56 px, one band |
| Content above or beside the bar · readable through it | no · no | no · no |
| Pinned on a phone, top and bottom | 56 + 68 px = 15% in the editor; 7% on the board | 52 px = 6% |
| Bar against the page | in the tone of the content under it (dark glass over the dark board, light over the form) | in the page's tone |
| Glass on screen, with tints | header 0.8 (0.85 on a phone), section rail 0.84 (dark), "still needed" panel 0.64, phone's bottom bar 0.55 | header 0.8, alerts rail's head 0.84, alert tabs 0.78 |
| Sheets and dialogs | glass over the kit's dim layer | the building sheet, glass over the dim layer |
| axe serious or critical · console errors · overflow (four sizes) | 0 · 0 · none | 0 · 0 · none |

Both rules were picked up from the skill text. No glass surface is tinted past 0.85 and neither
build has a dark bar over a light page; the permit form's own notes say "Pinned bar is glass in the
tone of what's under it" and it switches the bar's tone from what passes under its lower edge.
Both builds used the kit's new sheet tint and dim layer rather than tinting a sheet solid.

Not good, or not known:

- Both builds' own reviewers scored them under the target of 8, and the permit form needed two
  rounds of critical fixes (a literal "null" in two headings; "Saved" shown before the save had
  happened; a dead "Next" covering Submit on phones).
- The permit form ran to within four minutes of the cap and cost $26.32 — half as much again as
  the round 6 rebuild ($15.47). One build each: not enough to say the rules cost more.
- Energy dashboard, by looking: the lower left of the page is empty beside the taller alerts rail;
  on a phone the "resolved — Undo" notice sits over the next card's buttons for its five seconds
  (the build reported this itself).
- Neither build was checked with a screen reader or on a real graphics card (the permit form's
  build measured 20–30 frames a second in the test renderer while glass animated).

For the blind page the chosen builds (round 4, released plugin) and the new builds were recorded
through the same journeys with `evals/core_flow.cjs` — screenshots at twice the pixel density with
glass rendered correctly — and shown as A and B in a random order per brief. The key stays outside
the repository until AK has judged them.

### Round 7 verdict (14 Nov 2026)

Key: in both briefs A was the new build (`ui-top-tier` at `6c26aa9`) and B the build AK chose in
round 4. This was not an independent blind verdict: AK asked for my opinion first, I gave it by
the page's letters, and he answered "I agree with you".

| Question | Permit form | Energy dashboard |
|---|---|---|
| Looks better | B, narrowly | B, narrowly |
| Feels better to use | A | A |
| Top bar and navigation | A | A |
| Use of glass | B | B |
| Would ship | A, after cutting the repetition | A, after cutting the repetition |

What the new builds got right: the top bar (one quiet band, in the page's tone, nothing around or
through it) and products organised around their real job ("what is still missing"; cost over target
and dollars a day at stake).

What they got wrong, and no skill text or check covers:

- **Glass is correct but timid.** Both new builds chose a light theme, and white glass on a light
  page is nearly invisible. The chosen builds read as glass because they are dark with a rich field
  behind. The rule says "over a background with something to refract" and nothing enforces it.
- **No restraint.** The permit form says "needed" in five places on one screen and opens a new
  application as a wall of amber; the energy dashboard has a black "Resolve" on each of five alert
  cards. Nothing in the skills says "say it once" or "one primary action per view".
- **A wait for a local action.** "New permit application" shows a spinner for about a second before
  anything changes.
- **Navigation heavier than the content it serves** (the permit form's dark section rail).

Basis: screenshots at desktop and phone size and slowed filmstrips of the main transitions
(`film.cjs`), not the full recordings.

### Three rule sets after the verdict (AK, 14 Nov: "go ahead with the plan")

| Rule | Where | Check |
|---|---|---|
| **A still shows which surfaces are glass.** Glass needs something under it with a real range of tone or colour (imagery, a visible field, a dark or coloured band the floating layer overlaps), or a tint of its own; white frost on a pale page is a plain panel. A light theme has to answer this. | Glass reference (rule 3), orchestrator's fixed rule, build sheet and `DESIGN.md` Material line, both review briefs | The audit hides each glass surface for a moment and measures the spread of tone behind it; under 9 (of 255) is reported as "flat behind" |
| **Restraint.** One filled primary action per view, row actions quiet; a status or count said once where it is acted on, plus at most one summary; a new empty record opens calm; navigation never outweighs the content it serves. | UX engineering criteria, orchestrator's build step, both review briefs | The audit counts status labels repeated in the first view (four or more), filled buttons in view (more than two), and the same filled button three or more times down the page |
| **A local action shows its result at once.** Creating a draft or opening something already loaded appears immediately and saves behind it; a spinner in the button is for work whose result can't be shown until it is done. | Experience standard (a press) | Judged from the filmstrips |

The two checks on the round 7 builds, before any rebuild:

| Build | Glass | Restraint |
|---|---|---|
| Permit form (new) | section rail and "still needed" panel: flat behind (3.0 and 4.8) | "needed" ×4 in the first view of a half-filled draft |
| Energy dashboard (new) | alerts rail's head: flat behind (1.8) | "Resolve" ×5 down the page |
| Energy dashboard (chosen) | alerts panel on a desktop: 115.7 behind — not flat | nothing |
| Permit form (chosen) | segmented control: flat behind (1.3) | nothing |

The chosen builds are also reported for tints past 0.85 (0.86 to 0.96); they predate that rule.

## Round 8 — the permit form rebuilt with the three rule sets (a frozen copy of the branch at `d43e9b0`, 14 Nov 2026)

One rebuild, as planned. **The session was cut off at the 105-minute cap** while it waited for its
second independent reviewer, so it wrote no final report and its cost was not reported (the last
build, 101 minutes, cost $26.32). What it built was complete and its fixes were in; I checked it
myself.

| Check | Round 7 build | This build |
|---|---|---|
| Glass on screen in the editor | header, section rail and "still needed" panel — rail and panel flat behind (3.0 and 4.8) | header (0.85) on the scrolled page; at rest a glass stepper over a dark band with a drawn site plan; on a phone the step and preview pills and the bottom bar (0.8) |
| Glass reported flat behind | 2 surfaces | none |
| Status labels repeated in the first view | "needed" ×4 (half-filled draft) | none, on the board, a half-filled draft and an empty draft |
| Filled buttons in the first view | 1 | 1 — the bar drops its own Continue while the form's is on screen |
| A new, empty application | a wall of amber "Needed" | calm: numbered steps, an empty form, the permit tag with placeholders; what is missing is said once, on Review & submit |
| "New application" | about a second of "Starting…" | the new form is on screen within 134 ms (filmstrip) |
| Pinned at the top, desktop · phone | 56 px, one band · 15% | 56 px, one band · 13% |
| Content above or beside the bar · readable through it | no · no | no · no |
| Bar against the page | in the tone of the content under it | in the tone of the content under it |
| axe serious or critical · console errors · overflow (four sizes; board and two drafts) | 0 · 0 · none | 0 · 0 · none |
| Its own tests | — | 17 unit tests and 15 browser journeys pass (run by me) |

Its first independent reviewer scored it 6.4 (look) and 5.7 (use) before the fixes, with two
critical defects (an edit lost by a refresh within a second of typing; an approved permit shown
with an error) — both fixed, with tests. The second review had not come back at the cap.

Not good, or not known:

- **Time.** Four builds of this brief on this branch: 55, 73, 101 and now more than 105 minutes.
  Each added rule and review has cost time; the timeline of this run was 30 minutes to the early
  reviews, 30 more to build and verify, 32 for the first independent review and its fixes, and 13
  into a second review that never returned. A real session has no cap and would have finished; it
  would still be the longest so far.
- **The first screen has no glass**: nothing floats on it. The glass is in the editor.
- **By looking:** the "Inducted until" date field clips its year on a desktop ("03/14/202"); dates
  show in US format (its reviewer raised this; the build proposes a custom picker); the permit
  tag's placeholders look like a loading state.
- **An audit fault found here and fixed:** on one draft the audit said the page could be read
  through the bar. It could not: the bar had dropped its own Continue button between the two
  scroll positions the audit compares, and those pixels were counted as the page showing through.
  The audit now notes when a bar changes its own content and judges by its tint instead. A test
  covers it. (`evals/core_test.py` also crashed printing the summary of a cut-off run; fixed.)

## The UI skills in an ordinary coding session (AK, 14 Nov: "make sure that UI skills required are loaded automatically")

What already made them load: the always-on rules (load `arkar-ui-intelligence` first), each skill's
description, the gate that holds the first UI write until the orchestrator is loaded, and the end
gate (orchestrator and visual QA). Evidence from earlier runs, whose prompts never name a skill:

| Kind of request | Runs | What loaded by itself |
|---|---|---|
| A UI feature in an existing app, built for real (`opsdesk-assign`, round 4) | 2 | the orchestrator and the full feature set |
| UI features, planning probes (Livewire, Flutter, sign-in screens) | 31 | the orchestrator and six specialists, every run |
| **The UI is only part of a coding request**, planning probes ("add a Draft reply button", a status filter, a reassign action) | 20 | the orchestrator every run; its specialists in only 6 of 20 |

The last row was the gap: the orchestrator's own minimum set (ux-engineering and implementation for
any UI change) was left to chance. Now the gate enforces it:

- **Before the first UI write** it holds the write until the orchestrator, ux-engineering and
  implementation are loaded; a new UI file (a new screen or component) also needs motion,
  responsive and accessibility. One message names everything to load. Asked three times at most.
- **Before finishing** it checks the same sets, with visual QA.
- A Livewire component's class and Filament's forms and tables (`app/Livewire/`, `app/Filament/`)
  now count as UI; they hold no HTML, so the gate did not see them.

One real session with the release candidate (`workorders-filter`: "add a status filter … to the work
orders table, kept in the URL", on the work-orders fixture; no skill named): 5.2 minutes, $1.66.
It loaded the orchestrator, the change workflow, ux-engineering, implementation, accessibility,
responsive and motion in its first 15 seconds, visual QA before the edit, and security after it; the
gate never had to hold a write. The filter matches the app's other filters and works from the URL;
six existing-code findings came back as labelled proposals, none applied. One run: it shows the
skills load, not that they always will — the gate is what makes that certain.
