# Motion graphics

Levels 4–5. Use only when they provide real value — storytelling, explaining
a product, visualising data or AI activity, or a signature moment. They are
never a substitute for good layout, typography and hierarchy.

## Options

| Effect | Good for | Keep it restrained by |
|---|---|---|
| Subtle ambient gradients / soft lighting | marketing heroes, AI-native and luxury directions | slow (many seconds per cycle), low contrast, paused off-screen and under reduced motion |
| Layered depth | heroes, product showcases | few layers, small offsets |
| Controlled blur | separating a focus layer (sheets, overlays) | small radii, few blurred layers — blur is expensive |
| Animated SVG illustrations | empty states, onboarding, signature moments | short, plays once or on interaction, built from the palette |
| Data-visualisation transitions | dashboards, reports | interpolate real data; draw on first view only |
| Progressive visual reveals | storytelling sections | brief, start as soon as visible, never hold text back |
| Subtle parallax | marketing pages | small distances, never on reading content or business screens, off under reduced motion |
| Interactive visualisations | product explanations, analytics | responsive to input, keyboard-accessible, with a text alternative |
| AI activity visualisations | AI products | reflect real states only (see `ai-interaction-motion.md`) |
| Refined background movement | heroes | barely perceptible, paused when not visible |
| Product storytelling animation | landing pages | tied to scroll position or user action, skippable, never hijacking scroll |

## Rules

- Purposeful and restrained; one signature visual per page at most.
- No scroll-jacking (changing scroll speed or direction, forced snapping,
  sections you can't scroll past quickly).
- Nothing loops for attention while people read or work.
- Performance: animate transforms/opacity, limit blur and filters, use
  `IntersectionObserver` to run only when visible; prefer CSS/WAAPI or SVG
  over heavy canvas/video unless the effect needs it; Lottie or GSAP only
  for a signature moment that truly needs a timeline or designer-made
  animation.
- Reduced motion: a still, meaningful frame — not a blank space.
