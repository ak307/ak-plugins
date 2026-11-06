# Typography system

## Families

- One or two families; a third only for code or tabular data.
- Chosen for the direction and the languages used; system fonts are not a
  design decision. Don't default to the fonts you reach for by habit (Inter,
  Roboto, Geist, the same pair as the last project) — choose what expresses
  this product, and vary across projects.
- Bundled with the app (`@fontsource/<family>` with a build tool, or `.woff2`
  files in the project with `@font-face`), `font-display: swap`, preload the
  one or two files used above the fold. Not linked from Google — internal
  networks often block it.

## Scale

- A deliberate scale (often a ratio such as 1.2–1.333), as tokens: e.g.
  caption, small, body, body-large, h4…h1, display.
- Body text 16 px on mobile web (never below 14 px for text users must
  read); sizes in `rem` so browser text settings apply.
- Responsive display sizes with `clamp()` so headings scale smoothly between
  breakpoints, never so large they push the primary content off the first
  screen on phones.
- Mobile: `sp` (Android) / Dynamic Type styles (iOS) / `TextTheme` (Flutter)
  that respect the user's text size.

## Readability

- Line length ~50–80 characters for paragraphs.
- Line height ~1.4–1.6 for body, ~1.1–1.25 for headings.
- **Tall scripts** (Myanmar/Burmese, Thai, Tamil, Devanagari): body line
  height ≥ 1.6, no fixed-height single-line boxes, fonts that cover the
  script (Noto Sans Myanmar, Padauk), tested with real text.
- Weights: a small consistent set (e.g. 400 body, 500 labels, 600–700
  headings).
- Tabular figures (`font-variant-numeric: tabular-nums`) for numbers in
  tables, stats and timers.
- Letter-spacing slightly tighter for large display sizes, slightly looser
  for small caps/labels; never tracked-out caps on everything.

## Hierarchy

Three or four levels per screen are enough. Size and weight create
hierarchy; colour supports it. Don't style headings by appearance alone —
semantic heading levels must be in order (accessibility).
