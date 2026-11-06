# Colour system

## Roles before values

Define the roles the product needs, then choose values for the direction:

- **Surfaces:** background, surface levels (raised panels, overlays).
- **Text:** primary, muted, inverse, link.
- **Action:** primary action (+ hover, pressed, disabled), secondary.
- **Accent:** the signature colour, used sparingly.
- **Focus:** a focus ring colour visible on every surface.
- **Semantic:** success, warning, danger, info — each with a text-safe and a
  fill/background variant.
- **Data:** a categorical series (distinguishable, colour-blind safe) and a
  sequential/diverging ramp if charts need them.
- **Borders and dividers.**

## Contrast (WCAG 2.2 AA)

- Text: ≥ 4.5:1; large text (24 px+, or 19 px+ bold) ≥ 3:1.
- UI components and meaningful graphics (borders of inputs, icons, focus
  indicators, chart lines): ≥ 3:1 against adjacent colours.
- Check every theme; check text on tinted fills and on images.
- Never convey meaning by colour alone — add text, icons or patterns.

## Brand colours

- Keep existing brand colours (Mode A/B); if one fails contrast as text,
  use it for fills and large elements and derive an accessible variant for
  text and focus.
- CBM red `#AE1A28` only when AK asks for CBM branding or the product already
  uses it.

## Restraint

- One primary action colour; the accent used for the signature and key
  highlights, not everywhere.
- Gradients, glows and translucency only when the direction calls for them
  (anti-generic rules); never as filler.
- Avoid grey text on grey backgrounds; muted text still meets contrast.

## Dark theme

- Not an inversion: dark surfaces (not pure black for large areas), lighter
  surfaces for elevation, desaturated accents, re-checked contrast.
- Same semantic tokens, redefined for dark; components unaware of the theme.
- Images and charts checked in both themes.
