# UI skill change log

Every change to the `arkar-ui-*` skills, why it was made and the test that
exposed it. Commits are on the `ui-intelligence` branch; each eval run records
the skills commit it used (`skills_commit` in `results.json`), so any change
can be checked against earlier results with `python3 evals/report.py`.
Scenarios are never removed — only added — so every change is re-tested
against all earlier problems.

| Commit | Change | Why (evidence) | Exposed by |
|---|---|---|---|
| cb2f0e0 | Ten `arkar-ui-*` skills replace frontend-design/qa | AK's Adaptive UI Intelligence brief | — |
| bbe6dad | Required minimum specialist sets; visual QA always loaded | Visual QA skipped, D lacked motion/responsive, C skipped art direction | Round 1, A–F |
| da42482 | AK's premium standard as the most important rule | Round-1 screens "not a good design" (AK) | AK review |
| 4174e20 | Premium pass is the definition of done (record + report block) | Premium pass not executed in round 3 | Round 3 |
| 97d0c1a | Apple UX principles | AK: round 4 "still boring"; Apple UX article | AK review |
| 0da22c9 | Visual ambition: three-second test, boring signals | Calm muted screens in rounds 4–5 | Round 5 |
| 6a9279c, 28d8647 | Template detector, compositions, independent critic | Template structures (3 cards → CTA; tiles over table) | Round 5 |
| 2772b88 | Compositions and critique as required orchestrator steps | Critic 0/6, sketches 2/6 when only in references | Round 7 |
| a5efeeb | Alternatives must differ in idea; squint test; generic, not first | Admin layout identical every run; "drop first idea" discarded a good card visual | Rounds 8–9 |
| 4b2c13a, 6dfb40f | A requested frame isn't the composition; critic's "generic" forces recomposition | Run refused critic's #1 finding citing "the brief asked for a list" | Round 10 |
| e38d9cd, 5a9499c | Filmstrips (film.cjs); critic and premium pass judge motion | Motion never actually watched (AK: transitions matter) | AK review |
| 638ba22 | Required steps whatever the size; every section needs a visual idea | A run skipped steps "because this is a small three-page site"; flat lower sections | Round 12 |
| 011f76c | Free port + confirm it's your project | Parallel runs read another app on a shared port | Round 11 |
| 89f8d3c | Stop-hook UI quality gate; resilience playbook | Steps skipped / skills not loaded in some runs (lottery) | Rounds 11–12 |
| 2367033 | HTML built inside code counts as UI; at most one ambient loop | UI skills not loaded for Python-built HTML; 20 looping animations on a landing page | Broad check r13 |
| 1051b95 | audit.cjs: axe, errors, overflow, design-system spread | Contrast failures and 18 font sizes invisible to visual review | Objective audit |
| b053ef8 | No raw design values in components (status colours too) | Flutter status chips with hard-coded colours | Scenario D |
| 51e9fb2 | Motion never delays primary content; animate only what changed; nothing unreachable on phones; no blank panels; one number one source; styled form controls; fonts must render | Blind scoring of round 12: only 1/6 accepted | Blind score r12 |
| 044cdcd | Gate sees files written through the shell (`cat >`, `tee`, Python writes, `sed -i`, `cp/mv`); insists up to 3 times per session | Thin-content run wrote everything via Bash heredocs → gate never fired; another replied "didn't get to it" after one block | Edge cases r1 |
| (next) | Phone-first ≠ phone-only; fixed bars never cover form fields; direction-aware step transitions; interrupted values continue from current; one meaning one encoding; sensible focus return + designed ring; content visible by default; readable text sizes | Blind scores edge1: 0/12 accepted (phone column on empty desktop, hard cuts between steps, hidden field behind sticky footer, stock bar colour vs status, alarming focus ring, scroll-reveal content hidden) | Blind score edge1 |
