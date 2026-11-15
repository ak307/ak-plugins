# Quality gates

## 1. Hard floor — never traded for style

This is the single canonical list (other skills link here). It applies to
**what you build or change**. Problems that were already there in screens
or behaviour outside the request don't block completion — report them in
the change workflow's approval list (🟢 / 🟠).

- Text users must read: ≥ 4.5:1 contrast (≥ 3:1 for large text: 24 px, or
  ~18.7 px bold), nothing below 14 px on web.
- UI components, focus indicators and meaningful graphics ≥ 3:1.
- Everything works with a keyboard; focus always visible and not obscured.
- Form fields labelled; errors say what's wrong and how to fix it.
- Images and icon-only buttons have accessible names.
- Targets ≥ 24×24 CSS px or adequately spaced; dragging has a
  single-pointer alternative.
- Reduced motion respected; no content left invisible when animation
  doesn't run; no flashing more than three times a second.
- Destructive actions you add confirm (naming what's affected) or offer
  undo.
- No horizontal page scroll, clipped content or overlapping text at the
  target screens (320 px width / 400% zoom reflow for web content).
- No console errors or failed requests introduced; existing ones reported.

A project's `DESIGN.md` may deliberately break an *advisory* rule (e.g.
low-contrast decorative display type, no hover states on a touch-only kiosk)
and record it under "Deliberate deviations" — never the hard floor.

## 2. Hard blockers — fix before declaring completion

Broken functionality · build failures · severe responsive defects · critical
accessibility problems · major usability problems · serious performance
regressions · **anything in scope that still feels basic, generic or
unfinished** (AK's premium standard — `arkar-ui-intelligence/references/premium-standard.md`).
These override any score.

## 3. Weighted gates (diagnostic)

| Area | Weight | Evidence |
|---|---|---|
| Visual hierarchy and composition | 15% | screenshots: primary job obvious, balance, a clear focal point |
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
- Score only what you built or changed. The premium standard expects 90+;
  below that, improve the weakest areas and re-check before finishing. Weak areas outside the scope are
  proposals, not work.
