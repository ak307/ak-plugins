# Visual ambition — impressive, not merely polished

AK's bar is that people open the product and think *"wow, this is
beautiful."* Polished-but-quiet is a failure. Every product — enterprise,
finance and admin tools included — gets the same visual ambition as the
best consumer products. Calm belongs to motion and clutter, **not** to colour,
contrast and visual impact.

This file has no recipe and names no product to imitate. It gives tests and
levers; each project decides how to use them from its own world.

## 1. The three-second test (every main screen)

Look at the screenshot for three seconds. Does it make you think "this looks
premium and exciting", or "this looks fine"? "Fine" fails. Before you show
anything, name what will catch the eye first, why it's beautiful, and how it
relates to the product.

## 2. Signals of a boring screen — each one fails the premium pass

- A monochrome or near-monochrome palette (all beige, all grey, all one muted
  hue) with no vivid colour moment anywhere.
- Low contrast range: everything mid-tone; no deep darks, no bright lights.
- No hero moment: the screen opens straight into rows, cards or a form.
- Everything the same size and weight; no confident type scale.
- Flat: no layering, overlap or depth between elements.
- No visual besides text and icons: no product visual, illustration, data
  visual or crafted colour field.
- One column of identical rows or identical cards from top to bottom.
- Large plain empty areas with nothing designed in them.
- A safe default direction chosen because the product is "business".

## 3. Levers for visual energy (choose and combine per product)

- **A hero moment on every main screen** — the first thing the eye lands on:
  a bold colour field, a rich product visual or illustration from the
  product's own world, a striking data visual, or an oversized expressive
  headline. Dashboards and admin screens get one too (a summary band with a
  beautiful visual of the key numbers; a header with the product's
  signature).
- **Colour with conviction** — a palette with at least one vivid,
  saturated hue used with confidence in meaningful places (hero, primary
  actions, key data, status), set against deep or bright neutrals so it
  sings. Consider a dark or richly coloured surface for a hero or sidebar to
  create contrast range.
- **Contrast range** — deep darks and bright lights on the same screen;
  light and dark sections alternating where it fits the flow.
- **Depth and layering** — elements that overlap and float (a product card
  over a colour field, a panel lifted over a background visual, layered
  charts), crafted shadows and light that make surfaces feel physical.
- **Type with presence** — one confident display moment per screen
  (large, characterful, well-tracked), clear scale contrast against body text.
- **Composition with movement** — asymmetry, overlap, a strong diagonal or
  focal point, varied section rhythms; not a stack of identical boxes.
- **Imagery made in code** — illustration, product renders, data art,
  patterns or textures from the product's world; never empty space where a
  visual should be.
- **Light and atmosphere** — soft glows, gradients within one colour family,
  subtle grain or texture behind hero areas — crafted, never stock.
- **Motion as part of the impression** — the first view arrives with a
  purposeful entrance; key visuals respond to the pointer or to data.

## 4. Compose from the content, not from templates

The most common reason a polished page still feels boring is a **template
structure**: the layout every page of that type has. These count as boring
signals:

- hero → three equal feature cards → call-to-action band → footer;
- a row of identical KPI tiles above one long full-width table;
- a centred headline over a logo strip, then alternating image/text rows;
- numbered "01 / 02 / 03" blocks for content that isn't a sequence;
- a sidebar plus an identical list on every screen.

Instead, for each main screen **sketch two or three genuinely different
compositions** (a few lines or a tiny ASCII wireframe each) before
building, and choose the one that is most striking while keeping the user's
job easy. Work each section out from these questions:

- **What is this content?** A sequence, a comparison, a place, a quantity,
  people, time, a choice, a story?
- **What must the user notice first** — and which single thing deserves to
  be the largest on the screen?
- **Where does the contrast come from** — size, colour, light/dark, density,
  motion?
- **What would make someone stop and look** here, without slowing the job?

At least one sketch must be an unexpected option, not the layout this kind
of page usually has.

**Alternatives must differ in idea, not in arrangement.** "Filters on the
left vs on top", "table vs cards", or a straw man that obviously fails
(kanban for hundreds of records) are the same composition — the choice
then always lands on the obvious version with nicer details. Make each
alternative answer a *different question the user brings to this screen*,
so each puts a different thing at the centre. For a data-heavy or
all-day work tool, for example: *what needs my attention right now?*
(exceptions and risk lead; the routine rest recedes) · *where is it
happening?* (the product's physical or logical world — sites, doors,
floors, routes, systems — as the frame) · *what changed, and when?* (time
as the frame) · *what is this thing?* (the object itself — a card, a
claim, a vehicle, a contract — rendered as an object, not a row of
labels). The table or list stays fully efficient inside whichever is
chosen; what changes is what the screen is *about* and what the eye meets
first.

**When the request fixes the frame** ("a list of cards and a detail
panel"), that is a feature requirement, not the composition. The list and
panel must exist and stay efficient; the composition is what they *become*
and what surrounds them. An idea-level alternative you reject because it
would slow the main task is rarely worthless — bring it in where it doesn't
slow anything: as the hero band above the list, as a second view of the same
data (List | Plan | Timeline), as the detail panel's centrepiece, or as the
empty state. "The user asked for a list" is never a reason for a screen that
looks like every other list.

**The test of a composition:** blur the screenshot until you can't read
the text. If what's left looks like every other product of this type
(header, a band of numbers, filters, a full-width list), the composition
hasn't been done — whatever the colours and details. Let the nature of the content decide its form: a sequence can be a
journey, a comparison a split, places a plan or map, numbers a data visual,
a set of services something users can explore. Vary section treatments down
a page so it reads as a designed story, not stacked boxes. Note the chosen
composition and the rejected ones in `DESIGN.md`.

## 5. Ambition and usability together

Visual energy goes into the hero moments, the brand surfaces, the key data
and the signature — while the working areas (forms, tables, reading text)
stay clear, legible and efficient. Contrast and accessibility rules still
apply; a bold colour field still meets contrast for its text.

## 6. Varying across projects

Each project's palette, hero moment, imagery and composition come from its
own world, users and direction, so two products never look alike. Don't
reuse the previous project's look — or a familiar product's.
