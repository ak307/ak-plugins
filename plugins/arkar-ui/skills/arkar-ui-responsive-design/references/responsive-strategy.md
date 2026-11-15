# Responsive strategy

## Breakpoints from the project, not from habit

- Start from the real devices (`DESIGN.md` target screens) and where the
  content breaks. Typical web anchors when nothing is known: ~640 (large
  phone), ~768 (tablet portrait), ~1024 (tablet landscape / small laptop),
  ~1280–1440 (desktop).
- Add a breakpoint where the layout actually fails, not at every device
  size.
- Record them as tokens (design system) and in `DESIGN.md`.

## Mobile-first CSS

- Base styles for the smallest screen; `min-width` media queries add layout
  as space allows.
- **Container queries** (`@container`) for components that live in different
  widths (cards, sidebars, widgets) — they adapt to their container, not the
  viewport.
- Fluid type and spacing with `clamp()` between sensible minimums and
  maximums.
- Flexible grids (`grid-template-columns: repeat(auto-fit, minmax(…, 1fr))`),
  `minmax()`, `min()`, intrinsic sizing.
- `max-width` on reading content; data screens may use the full width
  deliberately.
- Logical properties (`margin-inline`, `padding-block`) so layouts are
  RTL-ready.
- `dvh`/`svh` units for full-height mobile layouts (browser chrome changes
  the viewport).

## What adapts

Navigation · content hierarchy · information density · layout structure ·
touch targets · forms · tables · dashboards · interactions (hover vs touch) ·
animation behaviour (smaller distances on phones, fewer simultaneous
animations, no hover-dependent effects).

## Input-aware

- `@media (hover: hover) and (pointer: fine)` for hover effects; touch gets
  pressed states instead.
- `@media (pointer: coarse)` for larger targets.
- Never hide essential information behind hover.

## Images and media

`srcset`/`sizes` or `<picture>` so phones don't download desktop images;
`aspect-ratio` reserved; art direction (different crops) when the subject
gets lost on small screens.
