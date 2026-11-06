# Mobile-first design

## Priorities

- On a phone, the primary job comes first; secondary information moves
  below, into tabs, or behind "more" — it isn't simply stacked in desktop
  order.
- One column for content and forms; two columns only where items are small
  and comparable (e.g. thumbnails).
- Primary actions within thumb reach (bottom of the screen for
  one-handed use) — a sticky bottom action bar for the main action of long
  screens.

## Touch

- Targets ≥ 44×44 pt (iOS) / 48×48 dp (Android); on web at least 24×24 CSS
  px (WCAG 2.2) and aim for ~44 px for primary controls; spacing between
  adjacent targets.
- Everything done by dragging has a single-tap alternative (WCAG 2.5.7).
- Swipe actions are shortcuts, never the only way.
- No hover-dependent information.

## Forms on phones

- Correct input types and `inputmode` for the right keyboard; `autocomplete`
  for addresses, names, OTP codes.
- Labels above fields; large, well-spaced fields; the submit button visible
  without hunting.
- Avoid long dropdowns — segmented controls or searchable pickers for many
  options; native date pickers.
- Keep the field in view when the keyboard opens; don't cover it with sticky
  bars.

## Performance on phones

Mid-range phones on mobile networks: smaller images, fewer fonts, less
JavaScript, shorter and fewer animations, no heavy blur.

## Text

16 px body minimum on mobile web (prevents iOS zoom on focus, too); layouts
that survive 200% text size and system font scaling.
