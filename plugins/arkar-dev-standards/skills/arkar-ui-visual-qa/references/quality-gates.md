# Quality gates

## 1. Hard floor — every project, never traded for style

- Body text, labels and data readable: ≥ 4.5:1 contrast (≥ 3:1 for large
  text), nothing users must read below 14 px (web).
- Everything works with a keyboard; focus always visible and not obscured.
- Form fields labelled; errors say what's wrong and how to fix it.
- Reduced motion respected; no content left invisible when animation
  doesn't run; no flashing.
- Destructive actions confirm (naming what's affected) or offer undo.
- No horizontal page scroll, clipped content or overlapping text at the
  target screens.
- No console errors or failed requests.

A project's `DESIGN.md` may deliberately break an *advisory* rule (e.g.
low-contrast decorative display type, no hover states on a touch-only kiosk)
and record it under "Deliberate deviations" — never the hard floor.

## 2. Hard blockers — fix before declaring completion

Broken functionality · build failures · severe responsive defects · critical
accessibility problems · major usability problems · serious performance
regressions. These override any score.

## 3. Weighted gates (diagnostic)

| Area | Weight | Evidence |
|---|---|---|
| Visual hierarchy and composition | 15% | screenshots: primary job obvious, balance, one signature element |
| Typography and readability | 10% | scale, line length, line height, weights, scripts |
| Spacing and alignment | 10% | spacing scale respected, edges aligned |
| Brand identity and consistency | 10% | matches `DESIGN.md`, consistent across screens |
| UX and interaction quality | 15% | flows tried, states designed, feedback, forms |
| Responsive behaviour | 15% | every target size inspected |
| Motion and feedback quality | 10% | motion seen running, acceptance criteria |
| Accessibility | 10% | keyboard pass, contrast, automated check if available |
| Performance and maintainability | 5% | no layout shift, build/lint/tests, sensible assets and code |

Score each area 0–100 only where you have evidence; the weighted total is
then: **90–100** excellent · **80–89** good · **70–79** needs refinement ·
**below 70** significant improvement required.

- Don't score areas you couldn't check — mark them "not assessed" and leave
  them out of the total (say so).
- Never fabricate or round up a score; the evidence column must be real.
- Below 80 on work you built: improve the weakest areas and re-check before
  finishing, unless the remaining issues are outside the scope (then report
  them).
