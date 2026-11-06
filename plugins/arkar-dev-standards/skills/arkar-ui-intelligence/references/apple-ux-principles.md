# Apple-level UX principles — how premium products earn love

Ten habits behind Apple-level product experiences (adapted from Ryan
Almeida, "10 UX secrets from Apple that will make your product
irresistible", Medium, 2025), turned into concrete practice for this
system. They complement `premium-standard.md`: that file sets the bar;
these say how products reach it.

| # | Principle | What you do | Owner |
|---|---|---|---|
| 1 | **Sweat the micro-stuff** — small things aren't small; they show users you care | every control has crafted hover/press/focus/disabled states; every state change moves; numbers, dates and copy are formatted for humans; nothing is left at a default | motion-design, design-system, visual-qa (premium pass + interaction probe) |
| 2 | **Cut what doesn't earn its place** — simplicity is focus, not a lack of features | one primary job per screen; remove or demote options that confuse or slow the main flow; progressive disclosure for advanced things. In existing products, **removing or hiding a feature changes behaviour — propose it to AK (🟠), don't do it** | ux-engineering |
| 3 | **Animate to teach and guide** — motion shows where things came from and went | spatial continuity (a closed panel returns to its trigger, a saved item flies into its list, a deleted row's gap closes); never decoration for its own sake | motion-design |
| 4 | **Make the interface disappear** — users should feel capable, not impressed by chrome | content first; controls appear when needed and stay quiet otherwise; no visual noise around the task; the richness lives in craft and content, not in extra UI | ux-engineering, art-direction |
| 5 | **Be consistent, then add one small surprise** — rhythm first so the surprise delights rather than confuses | the same patterns everywhere; then one tasteful moment of delight per product (a crafted empty state, a satisfying completion, a thoughtful detail) | art-direction, motion-design |
| 6 | **Solve problems, not trends** — ask what annoys users today | each design choice traced to a user problem or goal; no trend effects without a purpose (anti-generic rules) | art-direction, ux-engineering |
| 7 | **Talk like a person, not an error log** | plain, warm, specific copy: "Saving your claim…", "We couldn't reach the server — your changes are safe, try again"; never raw codes, stack traces or "Invalid input" | ux-engineering (UX writing) |
| 8 | **Design for feelings, not just functions** — reassure, encourage, celebrate | reassure before risky steps ("You can undo this for 10 seconds"), encourage progress ("2 of 3 steps done"), celebrate completion proportionately, show empathy in context (e.g. "3 approvals waiting — the oldest has waited 5 days") | ux-engineering, motion-design |
| 9 | **Own mistakes** — honest, human errors with a way forward | say what went wrong in plain words, what was kept, and what to do next (retry, contact, undo); never blame the user; never a dead end | ux-engineering |
| 10 | **Test with humans** — designers and developers aren't the users | walk every main flow as a first-time user would (no prior knowledge, real goal), note every hesitation or confusion and fix it; recommend AK watch a few real users try the main flow before launch | visual-qa (first-time-user walkthrough) |

## Using them

- During design: check each screen against 2, 4, 6 and 8 — is anything here
  that doesn't help the user's goal? does the screen make them feel capable
  and reassured?
- During build: 1, 3, 5, 7 and 9 decide how every control, transition, message
  and error is finished.
- During verification: 10 — the first-time-user walkthrough is part of the
  premium pass.
