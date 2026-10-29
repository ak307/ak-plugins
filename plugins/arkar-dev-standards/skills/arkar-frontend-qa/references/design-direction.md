# Design direction: making UI distinctive, not just correct

AK rejects UI that is "basic and boring" even when it works. A clean form
with a system font, white background, grey-bordered inputs, a plain table and
one coloured button is the floor, not the goal. This file is how to get
above it. Read it before designing any new screen, and whenever a page
needs a visual overhaul.

## Contents
1. Ground the design in the subject
2. Write a design plan
3. Check the plan against the generic defaults
4. Patterns that lift internal business apps
5. Spend boldness in one place
6. Critique the screenshots for blandness
7. Example plans

## 1. Ground the design in the subject

Distinctive choices come from the subject's world, not from a style
catalogue. Before designing, write down in one line each:

- **Subject:** what the thing is (season parking permits for a car-park operator).
- **Audience and setting:** who uses it, where, on what device (tenants
  applying from their phones; admins approving at a desk).
- **Primary job:** the one thing the screen must make effortless (see whether
  my permit is valid and renew it in a minute).
- **Vocabulary:** objects, materials and signals from that world (plate
  numbers, levels, bays, gantry barriers, permit stickers, signage).

The vocabulary is where the signature element comes from: a car-park app can
show each level as a capacity bar and the permit as a card that looks like the
real sticker; a patrol app can show the route as a line of checkpoints that
fill in; an energy-monitoring page can use the building's floors as the main
chart.

## 2. Write a design plan (before code)

Keep it short — this is a working note, not a document:

- **Direction name and idea:** name the visual direction in one or two words
  and say in one sentence what it means for this subject ("Signage Clarity —
  everything reads like well-made car-park signage: bold numbers, clear
  colour codes, nothing decorative"). Every later choice should follow from
  this sentence; it keeps the screens coherent.
- **Palette:** 4–6 named hex values with roles (background, surface, ink,
  muted ink, primary, one support colour). CBM apps: primary is `#AE1A28`.
  Build the rest around it on purpose (e.g. warm stone neutrals and deep
  charcoal ink, or cool slate with a dark navy panel) — not plain white and grey.
- **Type:** one or two typefaces chosen for this subject, loaded properly
  (e.g. Google Fonts or self-hosted), with a type scale. Not the browser/system
  default and not the same font as every other project by reflex.
- **Layout concept:** one sentence plus a small ASCII wireframe for mobile
  and desktop. Decide alignment and where the eye lands first.
- **Signature element:** the one memorable thing (section 5).
- **Principles:** two or three lines on what makes this screen specific.

## 3. Check the plan against the generic defaults

If a choice would appear in any similar app regardless of subject, it's a
default, not a decision. Revise it unless the brief or the existing design
system asks for it. The common defaults:

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
  zero radius — unless the subject truly calls for it.
- **Scattered motion:** fade-and-slide-up on every section, hover lift on every
  card. One orchestrated moment beats many effects.

Say in a line what you changed and why.

## 4. Patterns that lift internal business apps

Internal tools can be distinctive and still fast to use. Pick the ones that
fit the subject — never all of them:

- **Show status visually, not just as text:** coloured state chips
  with icons, a timeline or calendar strip instead of a raw table, progress
  rings for quotas (leave balance, budget used).
- **A real header:** brand mark, the page's purpose in words users use,
  and live context (site name, today's date, who's on duty) rather than a bare
  bar.
- **Data as the hero:** today's numbers, a mini chart or a visual of the
  resource (rooms, car-park levels, checkpoints) placed where the eye lands.
- **Designed empty states:** a small illustration or icon, one sentence, and
  the action — not grey text in a table.
- **Responsive transformation:** tables become cards or a timeline on phones;
  forms become a bottom sheet or a stepper; sidebars become a bottom bar.
- **Purposeful depth:** layered surfaces (tinted background, raised panels,
  one darker panel for focus) instead of identical white cards.
- **Iconography:** one consistent icon set (e.g. Lucide/Heroicons via a package
  or inline SVG), sized with the type.
- **Micro-interactions that answer actions:** an approved application moves
  to its new column; a completed checkpoint fills in; a toast confirms with the
  same word as the button ("Approve" → "Approved").

## 5. Spend boldness in one place

Choose one signature element — the permit card, the checkpoint route, the
floor-by-floor energy chart — and make it excellent. Keep everything around it
quiet, aligned and disciplined. Before finishing, remove one decoration that
doesn't serve the job.

## 6. Critique the screenshots, then refine

After the defect check, look at the 375 / 768 / 1440 screenshots and ask:

1. Could this screen belong to any other app? If yes, what from the subject's
   world is missing?
2. Is the signature element obvious within two seconds at every size?
3. Is the palette doing work (hierarchy, state, brand) or just decorating?
4. Does the mobile layout feel designed for a phone, or squeezed?
5. Would AK call it "basic"? If so, name three concrete upgrades, apply them,
   and re-shoot.

Then do one **refinement pass**. The bar is a screen that looks as if a top
product designer laboured over it: every alignment deliberate, spacing
rhythmic, type crisp, colours calibrated. In this pass don't add new
elements — make what's there more cohesive: tighten spacing to the scale,
align edges, unify radii and icon sizes, balance weights, remove one
decoration that doesn't serve the job.

## 7. Example plans

These show the level of specificity expected. Don't copy them — derive your
own from the subject in front of you.

**Season car-park permits (CBM, tenants and car-park admins):**
- Palette: asphalt ink `#22252A`, concrete background `#EEEDEA`, surface
  `#FFFFFF`, primary `#AE1A28`, bay-line yellow `#E8B321` for "action needed",
  muted `#6E727A`.
- Type: "Barlow" (signage feel) — Semibold for numbers and plate numbers,
  Regular for text; scale 14 / 16 / 20 / 28 / 44.
- Layout: desktop — top band shows each car-park level as a capacity bar
  (season / visitor / free), applications list below with plate numbers set
  like real plates; mobile — "my permit" card styled as a parking permit with
  validity dates and a QR, apply flow as a 3-step bottom sheet.
- Signature: the permit card that looks like the physical permit.

**Safety incident reports (site supervisors, mostly on phones outdoors):**
- Palette: deep navy `#16233A`, high-vis orange `#F26B1D` for severity,
  white surface, light steel background `#E8ECF1`, primary `#AE1A28` for main
  actions, green `#2E7D4F` for closed.
- Type: "IBM Plex Sans" for clarity in sunlight; large 18px base on mobile.
- Layout: mobile-first — big "Report incident" button fixed at the bottom,
  reports as a severity-coloured timeline; desktop — map/site list on the
  left, report detail on the right.
- Signature: the severity timeline with photo thumbnails.
