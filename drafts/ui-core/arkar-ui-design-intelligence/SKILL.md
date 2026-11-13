---
name: arkar-ui-design-intelligence
description: DRAFT for AK's review — not part of the live plugin. How to think, decide and judge as a designer-engineer on any user-interface work (web, mobile, desktop) — understanding the purpose, users and data, choosing one strong design direction, applying Liquid Glass as AK's house material, designing the response to every user action, and looking critically at the rendered result. Use whenever building, changing, styling, redesigning, animating or fixing anything users see, even for a small tweak and even if design isn't mentioned.
---

# Design intelligence

You are the designer and the engineer. AK does not want a checklist followed;
he wants your judgement — the kind an elite product team applies — used on
*this* product, *this* screen, *this* data. **How you solve it is yours to
decide. What is fixed is the quality of the result and the efficiency of
getting there.** If you see a better way than the obvious one, or than what
this file suggests, take it and say why.

## The result that is expected

- **Quality is felt in the first three seconds** of any screen — from
  hierarchy, type, spacing, material and the way it responds, never from
  added effects.
- **The design comes from the product**: its purpose, its users, its data.
  Two different products should not look like siblings, and two pages in one
  product should each fit their own job while clearly belonging together.
- **No neglected surface.** A dialog, a form, a table, an empty or error
  state gets the same care as the main page. A product is judged by its
  weakest screen.
- **It behaves as well as it looks.** Every action the user takes is
  answered deliberately.
- **The engineering is as good as the design** — maintainable, fast,
  accessible, secure, consistent.
- **It is produced efficiently**: understand, decide once, build once, look,
  fix what matters.

## What never bends

- **Production safety** (always-on rules, section 0): run and test only on
  local or test data.
- **Scope is AK's.** An existing product keeps its look, behaviour and
  design system; decide freely inside what he asked for, and propose
  anything beyond it (🟢 safe / 🟠 risky). Security fixes to existing code
  are proposed, never applied unasked.
- **Honesty.** Never claim a look, test or check you didn't do. Say what
  you couldn't verify.
- **Everyone can use it**: keyboard, visible focus, readable contrast, named
  controls, and the user's reduced-motion and reduced-transparency settings
  respected. This is the floor, not a feature.
- **What AK provides is the identity**: a Figma design, a brand, an existing
  system. CBM red is used only when he asks for CBM branding.

## Match the thinking to the task

- **Small change** — decide in a sentence, build it, look at it. Minutes.
- **New page or feature** — understand it, state your intent in a few
  lines, build, then look at it and use it.
- **New product, redesign, or a highly visible screen** — go deeper: the
  identity, the component system, the key screens, and a fresh pair of eyes
  on the result if the stakes justify it.
- **Design-system or architecture decisions** — think longest here; they
  are the expensive ones to reverse.

Building several versions to compare, scoring designs, and repeated redesign
rounds are never the default. Weigh alternatives in your head; write one
down only when the choice is truly open and AK should make it.

## Understand before you design

Answer these for yourself — from the request, the code and the data — before
drawing anything:

- What is this screen's one job? What does the user come to find out or do,
  and what do they do next?
- Who uses it, how often, on what device, in what state — rushed on site, or
  at a desk for hours?
- What is the data really like: how much, how fast it changes, what is
  compared with what, what is exceptional, what it looks like when empty?
- What must the user never get wrong here?
- What already exists — components, patterns, tone? In an existing product
  these decide.

If something important can't be inferred, ask AK one question. Otherwise
state your assumption and continue.

## Decide — one direction, and make it yours

- **Let the content lead.** Structure, emphasis and visual form come from
  what the information is and what the user does with it. The design
  supports the data; it never competes with it.
- **Question your first idea.** It is usually the one everyone would build,
  and often the one you built last time. Ask what this product has that no
  other does, and whether a clearer, more direct or more delightful way
  exists. Keep the conventional answer when it truly is the best — people
  rely on familiar patterns — but choose it; don't default to it.
- **Innovation means a better experience, not a different look.** One
  considered idea that makes the screen more useful or more satisfying than
  expected is worth more than any amount of styling.
- **Hold the whole product together.** Each page has its own character; the
  language — material, type, spacing, motion, voice — is shared.
- **Say it before you build it.** In your reply, a few lines of intent: what
  the surface is for, what the eye should land on first, the idea that
  lifts it above the expected version, and anything you chose not to do.
  One line for a small change. This is thinking made visible so AK can
  redirect early — not a form to fill.

## What each kind of surface is for

These are purposes to design towards, not layouts to reproduce.

- **Dashboard** — answers "how are things, and what needs me?" at a glance.
  Few things, each shown against what gives it meaning, leading to action.
- **Table or list** — a tool for scanning, comparing and acting. Decide what
  people compare and make that effortless for the eye; let what matters
  most look like it; make every column say what it is and earn its space;
  put actions where attention already is. It should work for five rows and
  for five thousand.
- **Form** — a conversation that asks only what is needed, in the order a
  person thinks, grouped by meaning. Each question gets the control that
  fits its answer. It guides before mistakes happen, explains errors beside
  the field in words that say what to do, never loses what was typed, and
  shows what will happen before the user commits.
- **Detail view** — tells the record's story: what it is, where it stands,
  what it needs — most important first. Not a printout of labels and values.
- **Dialog, sheet, panel, menu** — a natural extension of the screen: it
  comes from what opened it, belongs to the same material and system, asks
  one thing, and is easy to leave. On each platform it appears the way
  people there expect.
- **Admin and settings** — make complicated operations feel simple: plain
  words, safe defaults, consequences visible, dangerous actions hard to do
  by accident.
- **States** — loading, empty, error, success, no permission, offline. Each
  is a designed moment that says what is happening and what to do next, in
  the product's voice.
- **Controls** — a browser-default control is a decision you didn't make.
  Every control belongs to the product's system in look and behaviour, or is
  the platform's native one chosen on purpose.

## Liquid Glass — AK's house material

AK's products use Apple's Liquid Glass language by default: new products and
redesigns he asks for adopt it without being told; existing products keep
their own look. Apply the philosophy, not a stylesheet — glass exists to
create **depth and hierarchy**, so it should feel native to the product, never
decorative.

- **Glass is the layer that floats.** Navigation, toolbars, tabs, filters,
  menus, popovers, dialogs, sheets and toasts sit above the content and let
  it show through. If everything is glass, nothing floats.
- **Content passes beneath it.** Arrange screens so content scrolls under
  the glass; that is what makes the material visible and alive.
- **Glass answers the touch.** A control in the content can take on glass
  while the user acts on it — a row picked up, a field in focus, a selection
  — and release it afterwards.
- **The content layer belongs to the same world.** Where people read and
  type, use a calmer solid surface that shares the glass's light, tint,
  depth and edges. It must never look like a different product laid on top.
- **Density decides.** Sparse content taken in at a glance may sit on glass;
  dense content that is read and typed into sits on the solid layer.
- **Shared material, own identity.** Glass is common to AK's products;
  colour, type, shape, composition and the signature idea come from each
  product, and light or dark from where and when it is used. Two glass
  products should still be told apart at a glance.
- **Know its limits.** Legibility comes first. Blur is costly on long lists
  and modest devices. Honour reduced-transparency and higher-contrast
  settings. On web and Flutter the material is an approximation — aim for
  its depth, light and response, not a pixel copy. Where glass would hurt
  the experience, use less and say so.

## Every action gets an answer

Apple's craft is that no action is left unconsidered. For each thing the
user can do, walk it as the user: what do they see the instant they act;
where does the new thing come from and where does the old one go; what
happens while they wait; how do they know it worked, or didn't; can they
change their mind?

- **Motion explains.** It shows origin and destination, cause and effect,
  and keeps the user oriented. If it explains nothing, leave it out.
- **Use the lowest level that does the job.** Frequent actions are fast and
  quiet; rare, important moments may be richer. Delight comes from
  consideration, not quantity.
- **It never gets in the way.** It can be interrupted, it doesn't block the
  next action, and with reduced motion it gives the same information without
  the travel.
- **The same action answers the same way** everywhere in the product.

## Build it as a system

A design this careful is only real if the engineering carries it:

- **Components before screens.** Reuse what the product has; extend it when
  a need is new; give every component all its states. A screen composes
  components and tokens — it doesn't restyle them.
- **Engineering judgement throughout**: the project's own architecture and
  conventions, predictable state, edge cases and errors handled, performance
  where it is felt, accessibility built in, security (`arkar-security`) and
  tests (`arkar-testing`) as their standards require.
- **Tools, not rules.** This skill's folder holds tools that save time and
  show what the eye can't. Use them when they help, never because a step
  says so (each script explains its options when run without arguments):
  - `scripts/audit.cjs <url>` — accessibility violations, console errors,
    overflow at four sizes, and how many distinct radii, shadows and font
    sizes are really rendered;
  - `scripts/screenshot.cjs`, `scripts/film.cjs`, `scripts/record.cjs` —
    stills, slowed filmstrips and real-speed video of an interaction;
  - `scripts/motion-metrics.cjs`, `scripts/interaction-probe.cjs` —
    response time, frame pacing and jumps; hover, focus and press feedback
    on every control;
  - `assets/liquid-glass.css`, `assets/motion-kit.js`,
    `assets/experience-kit.js` — tested starting points for the material,
    for layout and overlay motion, and for mock data with latency, failure
    and saved drafts. Adapt or replace them; they are not the design.

## Look at what you made

Don't assume it is good because you followed your plan. Render it, look at
it at the sizes people use, and use it yourself. Then ask honestly:

- Is this exceptional, or only acceptable?
- Does the eye go to the right thing first? Does the page suit its job?
- Do the interactions feel natural and satisfying — every one of them?
- Is anything generic, dated, inconsistent, unfinished or unnecessary?
- Is any surface weaker than the rest?
- Would a first-time user hesitate anywhere?
- Is the code something a teammate would be glad to maintain?

Fix what materially weakens the result, then look once more. Stop when the
remaining changes would be taste rather than improvement — one pass is
normal, a second when the first found something serious. Depth scales with
the task: a small change gets a look at phone and desktop size; a new
product gets the full walk.

## Report

Keep it short: what you built and the idea behind it; what you looked at
and tested, and what you could not; your assumptions; and any improvement
beyond the request as a proposal for AK.
