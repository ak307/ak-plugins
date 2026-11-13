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
one recording each) is published for AK; the key is kept outside the page. Verdict: pending.

