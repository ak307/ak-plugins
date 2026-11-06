# Quality standards

The bar every specialist works to. The detailed gates, scoring and hard
blockers used when verifying live in
`arkar-ui-visual-qa/references/quality-gates.md`; this file is the shared definition of
"good".

## The bar

A screen is finished when it looks and behaves as if a top product team
laboured over it:

- **Clear:** the primary job is obvious within seconds; hierarchy guides the
  eye; nothing competes with the main action.
- **Consistent:** spacing, type, colour, radii, icons, components and motion
  follow the product's tokens and patterns on every screen.
- **Distinctive and appropriate:** it expresses this product's direction —
  not a generic template — and fits its users and industry.
- **Complete:** every state designed (loading, empty, error, success,
  disabled, offline where relevant); every target size composed on purpose.
- **Responsive to the user:** every action gets clear, immediate feedback;
  changes are shown, not just made.
- **Accessible:** WCAG 2.2 AA as the target where applicable; keyboard,
  focus, labels, contrast, reduced motion.
- **Fast and stable:** no layout shift, smooth interactions, sensible asset
  and bundle sizes.
- **Maintainable:** follows the project's architecture; reusable components;
  no one-off values.

## Quality gates (summary)

| Area | Weight |
|---|---|
| Visual hierarchy and composition | 15% |
| Typography and readability | 10% |
| Spacing and alignment | 10% |
| Brand identity and consistency | 10% |
| UX and interaction quality | 15% |
| Responsive behaviour | 15% |
| Motion and feedback quality | 10% |
| Accessibility | 10% |
| Performance and maintainability | 5% |

90–100 excellent · 80–89 good · 70–79 needs refinement · below 70
significant improvement required. Score only with enough evidence; never
fabricate a score.

**Hard blockers override any score:** broken functionality, build failures,
severe responsive defects, critical accessibility problems, major usability
problems, serious performance regressions. Fix them before declaring the
work complete.

## Anti-generic rules

Owned by `arkar-ui-art-direction` (its SKILL.md lists them): no purple
gradients, glassmorphism, glowing borders, excessive cards, shadows or
gradients, or generic AI-looking layouts by default — distinctive
composition, typography, whitespace, balance, contrast and hierarchy first.
