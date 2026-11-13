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
