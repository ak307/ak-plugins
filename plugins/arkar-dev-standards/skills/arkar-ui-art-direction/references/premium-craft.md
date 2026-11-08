# Premium craft — how top-tier interfaces get their richness

"Clean" is not premium. A tidy page with default type, flat colour fields and
plain white cards *works* but looks unfinished next to Apple, Linear, Stripe
or Arc. What separates them is **craft density**: many small, deliberate
decisions that together make every surface feel considered, tactile and
alive. Restraint means *precision*, never *plainness*.

Use these techniques within the chosen direction. They are tools, not a
style: pick the ones that express this product, execute them carefully, and
combine them so the result is unmistakably this product's own.

## 1. Typography with finesse

- Choose a typeface with character for display (a refined grotesk,
  geometric, humanist or serif chosen for the direction), and a highly
  legible text face; never the default sans by habit.
- **Real scale contrast:** a confident display size against calm body text;
  headings with tightened tracking (≈ -0.01 to -0.03em) and tighter leading;
  small labels slightly tracked out.
- Use weights deliberately (e.g. 450/550 on variable fonts) and optical sizes
  where available; tabular figures for data; true typographic quotes,
  dashes and ellipses.
- Typographic colour: primary text near-black (tinted, not #000), secondary
  text a tinted grey with enough contrast, never three shades of grey
  fighting.
- Let type carry the design in one place per screen (a hero statement, a big
  number, an elegant section title).

## 2. Colour with depth, not flat fields

- **Tinted neutrals:** greys carry a hint of the brand hue (cool slate, warm
  stone, green-grey). Pure #fff/#000/#ccc greys look default.
- Layered surfaces: background, raised surface, overlay — each a slightly
  different value, so structure reads without heavy borders.
- One confident accent used with purpose; semantic colours tuned to the
  palette (not stock red/green).
- **Crafted gradients and light** (when the direction allows): very subtle
  tonal gradients on large surfaces, a soft radial glow behind a hero object,
  a gentle sheen on a primary button. Low contrast, large radius, colour
  stops within the same family — never the default purple-to-blue wash.
- Dark themes: deep tinted backgrounds (not #000), surfaces lighter as they
  rise, desaturated accents, hairlines in translucent white.

## 3. Depth and materiality

- Shadows built from **two or three layers** (a tight contact shadow plus a
  soft ambient one), tinted with the background hue, low opacity — not a
  single grey `0 2px 4px`.
- **Hairlines:** 1px borders in a translucent tint of the text colour
  (e.g. 8–12% opacity) rather than flat grey; inner highlights
  (`inset 0 1px 0` white at low opacity) on raised controls give a tactile
  edge.
- Translucency and backdrop blur only for layers that float over content
  (navigation bars, sheets, popovers) — subtle, with a solid fallback.
- Subtle texture or pattern (noise at 2–4%, a fine grid, a pattern from the
  product's world) can give large surfaces life — sparingly.

## 4. Imagery and illustration

Empty space is not a design. Large areas (heroes, empty states, onboarding,
section openers) need a visual:

- **Product visuals built in code:** a stylised render of the actual product
  (a mini dashboard, a conversation, a card stack) composed with real UI
  components, slightly scaled and layered with depth — often the strongest
  hero for apps and SaaS.
- **SVG illustration** from the product's world, drawn with the palette and a
  consistent stroke/shape language.
- **Data as imagery:** a beautifully drawn chart, map, timeline or diagram.
- Photography only when the project supplies it; never stretched or
  low-resolution; consistent treatment (crop, tint, radius).
- Icons from one high-quality family (e.g. Lucide, Phosphor, Heroicons, SF
  Symbols on Apple platforms), consistent size and stroke, optically aligned
  with text.

## 5. Composition and rhythm

- A clear focal point per screen; asymmetric balance where it adds energy;
  generous but purposeful whitespace (space frames content, it doesn't
  replace it).
- A consistent spacing rhythm (e.g. 4/8-based) with larger steps between
  sections than within them.
- Vary section treatments down a page (full-bleed, split, contained,
  inset panel) so it reads as a designed sequence, not stacked boxes.
- Align everything to a grid; optical alignment for icons and text.
- Cards only when content is genuinely a card; otherwise sections, lists and
  tables with refined dividers.

## 6. Components that feel expensive

- **Buttons:** comfortable height (40–48px), refined radius, a primary with
  subtle depth (gradient sheen or inner highlight), a crisp pressed state
  (scale ~0.97, darker), a visible but elegant focus ring (2px offset ring in
  the accent).
- **Inputs:** soft tinted fill or hairline border, generous padding, an
  animated focus ring, inline validation with icons.
- **Tables:** comfortable rows, tabular numbers, quiet hairline dividers,
  hover row tint, sticky header with a subtle shadow when scrolled, status
  shown with refined badges (tinted background + dot), not loud colour blocks.
- **Navigation:** clear active state that moves (a sliding indicator), icons
  plus labels, keyboard shortcuts shown where useful.
- **Dialogs, menus, popovers:** layered shadow, hairline, slight blur behind,
  scale-and-fade entrance from their origin.
- **Empty, loading, error, success:** each designed with a small
  illustration or icon, a helpful message in the product's voice, and a clear
  next action — never a grey sentence.
- **Badges, chips, avatars, tooltips, toasts:** consistent sizes and radii,
  tinted fills, small details done right (avatar rings, tooltip arrows,
  toast progress bar).

## 7. Detail polish (what people feel without naming)

- Consistent radii (nested radius = outer − padding).
- Hover states on everything clickable, transitions on every state change
  (120–200 ms), no element changing without motion.
- Selection colour (`::selection`), custom scrollbars where appropriate,
  focus rings that match the design, caret colour in the accent.
- Favicon, page titles, and the empty space of a fresh account designed.
- Numbers formatted for humans (S$1,240.50, "3 days ago" with an exact date
  on hover).
- No orphans in headlines (`text-wrap: balance`), `text-wrap: pretty` for
  paragraphs.

## 8. The premium test, before you show anything

Put your screenshot next to the best product in its category in your mind
and ask: would this sit comfortably beside it? If not, name the ten most
visible differences (type, depth, imagery, spacing, components, states,
motion) and close them. Repeat until it would.
