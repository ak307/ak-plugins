# Creative process: a unique identity for each project

Every project gets its own visual identity, invented for its purpose, users
and setting. There is no house style to apply. Two projects for different
people and purposes should not look alike; screens within one project should
clearly belong together.

## Contents
1. Understand the project's identity
2. Explore two or three genuinely different directions
3. Choose and refine one direction
4. Check against the generic defaults
5. Making it impressive: techniques
6. Spend boldness where it matters
7. Critique for uniqueness and craft
8. Axes for generating variety (when stuck)

## 1. Understand the project's identity

Distinctive design comes from the project's own world, not from a style
catalogue. Write down, one line each:

- **Purpose:** what the product is for and why it exists.
- **Users and setting:** who uses it, where, on what device, in what state of
  mind (a guard at night on a phone; a finance officer at month-end on two
  monitors; a visitor nervous in an unfamiliar lobby).
- **Primary job:** the one thing the main screen must make effortless.
- **Tone:** how it should feel (calm and trustworthy, energetic, precise,
  warm and welcoming, authoritative, playful).
- **Vocabulary:** objects, materials, places, signals and rituals of that
  world (badges, plates, floor plans, ledgers, shift rosters, checkpoints,
  receipts, lanyards, signage). Signature ideas come from here.
- **Constraints:** brand assets, an existing design system, accessibility
  needs, devices, offline use, content density.

If the brief is thin, infer sensibly from the project's code, data and
domain, and state the assumptions in the final message.

## 2. Explore two or three genuinely different directions

Before committing, sketch two or three directions that would lead to
noticeably different products — not three shades of the same idea. For each:

- **Name and concept:** two or three words and one sentence ("Reception Desk —
  the app greets you like a well-run front desk: warm, unhurried, one thing at
  a time").
- **Palette:** 4–6 named colours with roles.
- **Type:** one or two typefaces and why they suit the concept.
- **Layout idea:** a sentence (and a tiny ASCII wireframe if it helps).
- **Signature element:** the memorable thing, taken from the vocabulary.

Make them differ on several axes at once (section 8). Then pick the one that
best serves the users and the primary job, and say in a line why — and
briefly what the alternatives were — in the final message. If AK is present
and the choice is a real taste decision for a new product, offer the
directions and let him choose before building.

## 3. Choose and refine one direction

Turn the chosen direction into a design system for the project:

- **Colour tokens:** background, surface(s), ink, muted ink, primary, accent,
  and semantic colours (success, warning, danger, info) — all as CSS
  variables / theme tokens. Choose the palette for the concept; use the CBM
  red `#AE1A28` as primary only when AK asks for CBM branding or the project
  already uses it.
- **Type:** families (bundled with the app, not linked from Google), a type
  scale, weights, letter-spacing for display sizes, tabular numbers for data.
- **Shape language:** radius scale, border use, elevation levels — all from
  the concept (sharp and engineered, soft and friendly, layered and physical).
- **Spacing and grid:** a spacing scale and the grid/alignment rule.
- **Motion character:** how things move (crisp and mechanical, soft and
  settling, gently springy — always calm and premium), the timing tokens, and the signature moment
  per main screen — see `motion.md`.
- **Signature elements:** one per main screen, related to each other.
- **Voice:** how labels, empty states and errors sound.

Record all of this in the project's `DESIGN.md` (template:
`design-md-template.md`) before building screens.

## 4. Check against the generic defaults

If a choice would appear in any similar app regardless of the project, it's a
default, not a decision. Revise it unless the project's brief or existing
identity asks for it:

- **The "basic form" look:** system font, white page, grey 1px inputs, a bare
  table, a single accent button, a plain dark header bar with a text title.
- **The SaaS card kit:** everything chopped into identical white rounded cards
  with the same soft grey shadow; gradient washes as decoration.
- **Template chrome:** ALL-CAPS tracked-out labels above every heading;
  `A · B · C` meta strings; a `→` on every button; numbered `01 / 02 / 03`
  markers on content that isn't a sequence; a big number with a small label as
  the hero for everything.
- **AI-design clichés:** cream background with serif display and terracotta
  accent; near-black page with one acid-green accent; newspaper hairlines with
  zero radius.
- **Generic motion:** the same fade-and-slide-up on every section and the
  same hover lift on every card, with no character or meaning. (The fix is
  designed motion, not less motion — see `motion.md`.)
- **Reusing the last project's look:** the same fonts, palette and layout
  pattern you'd reach for by habit. Each project starts fresh.

## 5. Making it impressive: techniques

Use the ones that serve this project — never all of them:

- **Signature visuals drawn in code:** SVG illustrations, diagrams or
  patterns from the project's vocabulary (a building whose lit windows are open
  jobs; a visitor badge that fills in as you type; a route whose checkpoints
  light up), made with the palette and a consistent stroke — not clip-art.
- **Type as a visual element:** in one place per screen, large, well-set type
  carries the design — strong scale contrast, careful spacing, on the grid.
- **Data as the hero:** the numbers or resources that matter most, shown
  visually (occupancy, capacity, progress toward a limit) where the eye lands.
- **Purposeful depth and materiality:** layered surfaces, a darker focus
  panel, subtle texture or pattern that echoes the subject's material.
- **Responsive transformation:** each size gets its own composition —
  tables become cards or timelines on phones, forms become steppers or bottom
  sheets, sidebars become bottom bars.
- **Motion that tells the story:** screens flow into each other, content
  arrives in a choreographed order, and the thing the user changed visibly
  moves (a slot fills, a card moves column, a badge prints) — with the
  confirmation using the same word as the button. Details in `motion.md`.
- **Designed empty, loading and error states** in the project's voice and
  visual language — often a small version of the signature visual.

## 6. Spend boldness where it matters

Let one element per screen be the memorable thing and make it excellent.
Keep everything around it quiet, aligned and disciplined. Before finishing,
remove one decoration that doesn't serve the users.

## 7. Critique for uniqueness and craft

Look at the screenshots at 375 / 768 / 1440 (see `arkar-frontend-qa` for how
to take them) and ask:

1. **Uniqueness:** could this screen belong to a different project? If yes,
   what from this project's world is missing?
2. **Identity:** does it express the concept in `DESIGN.md`? Would someone
   recognise it as the same product as its other screens?
3. **Signature:** is the memorable element obvious within two seconds at
   every size?
4. **Impression:** would AK find it impressive, or merely tidy? If merely
   tidy, name three concrete upgrades, apply them, and re-shoot.

Then one **refinement pass** — the bar is a screen that looks as if a top
product designer laboured over it. Don't add new elements; make what's there
cohesive: spacing on the scale, edges aligned, radii and icon sizes unified,
weights balanced, colours calibrated, one unnecessary decoration removed.

## 8. Axes for generating variety (when stuck)

Directions differ when they differ on several of these at once. Combine them
freshly for each project rather than reaching for a familiar recipe:

| Axis | Range |
|---|---|
| Density | airy and spacious ↔ dense and information-rich |
| Temperature | warm (sand, terracotta, cream) ↔ cool (slate, steel, ice) |
| Contrast | soft and low-contrast ↔ stark and high-contrast |
| Light | light surfaces ↔ dark surfaces ↔ mixed (dark panel + light work area) |
| Shape | sharp and engineered ↔ soft and rounded ↔ organic |
| Type personality | geometric, grotesque, humanist, condensed, serif, mono-accented |
| Structure | strict grid ↔ asymmetric/editorial ↔ spatial (map, floor plan, timeline) |
| Metaphor / material | signage, paper and stamps, instruments and gauges, maps, tickets and badges, ledgers |
| Motion | crisp and mechanical ↔ soft and settling ↔ gently springy ↔ layered and spatial (always calm and premium) |
| Colour strategy | neutral + one accent ↔ colour-coded system ↔ one bold colour field |

Business apps still need clarity first: whatever the direction, the primary
job stays effortless and the `arkar-frontend-qa` quality floor still applies.
