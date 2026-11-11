# The independent review — once, for defects

The builder is too kind to its own work. One fresh reviewer, who never saw
the code or the reasoning, finds what users would meet: in how the product
**looks** (`design-critic.md`) and in how it **behaves when used**
(`experience-tester.md`). It is a check for defects against the product's
mode and build sheet — not a scoring loop to rebuild against.

## When

After Verify, for new screens, page sets, new products and redesigns. Small
component changes don't need it (their premium pass is enough).

This review is AK's standing request for every such task: starting the
subagent for it is asked for, not optional — don't skip it as something
"only done when the user asks". Only when the Agent tool isn't available is
it replaced by the cold review below.

## How

1. Prepare the evidence: the screenshots and filmstrips `design-critic.md`
   lists (every main screen at desktop and phone, every key state, every
   view behind each tab), and the app running on local or test data.
2. Start **one** fresh subagent with the Agent tool, in the foreground
   (`run_in_background: false`) — wait for its report; never end your turn
   waiting for a background agent. Give it both briefs (the critic's, then
   the tester's), the screenshot and filmstrip paths, the URL, one line on
   the product and its users, and the mode with the design system's name.
   Never the code, `DESIGN.md` or your reasoning.
3. It returns one list of defects ranked **critical / major / minor**, and
   the visual and experience rubric scores as a diagnostic.

## After the review

- **Fix every critical and major defect**, and the minor ones that are
  quick; check each fix yourself (re-shoot, re-film or re-walk that moment).
  Fixes stay within the build sheet's decisions; if one needs a different
  decision, change the sheet first.
- **A second review only if the first found a critical defect** — with a
  fresh subagent and new evidence, to confirm the critical ones are gone.
  Never a third, and never a review just to raise a score.
- Scores are recorded, not chased. For a new product or redesign the target
  is overall ≥ 8 with nothing below 7; if it's short after the fixes, say
  plainly in the report what is still short and why, and what you'd propose.
- Record `## Independent review` in `qa-screenshots/premium-pass.md`: the
  defects by severity, what you fixed and how you checked it, what remains
  and why, and the scores.
- No Agent tool → do the cold review yourself (both briefs, evidence only,
  before re-reading code) and record it as a cold review.
