# Navigation and the header

Navigation is designed as part of each product, from that product's own
structure — never a ready-made bar carried from one product to the next.
The standard: it feels native to its product, belongs visually to the
content around it, and behaves reliably while the page scrolls, on every
size and in every theme the product ships.

AK's judgement behind this: four different products were built with the
same floating glass top bar, and he called every one "not right and
strange" — content showed in the gap above the bar and through its glass, a
dark bar sat over a light page, 76 px stayed pinned for a logo and an
account, and a second header band sat under it.

## 1. What stays on screen is earned

While someone scrolls, the only things worth pinning are the ones they need
*while scrolling*: where they are (the page or record's title, compact), the
step they are on, this screen's one action (Save, Approve), the filters of
a long list.

- The brand mark, a greeting, the date and the account scroll away with the
  page, or live in the side rail. Nobody half-way down a page reaches for
  the logo.
- Test each pinned item: *would someone at the bottom of this page reach
  for it?* If not, it scrolls.
- A bar that holds only a mark and an account is not pinned at all.

## 2. The header is a state of the page — one band at a time

- **At rest** the page has its own header: the title, what the page is for,
  its actions — generous, part of the page, no bar behind it.
- **Once the title has scrolled out**, one compact bar takes over its
  context: the title in small, the step, the action.
- Never two bands pinned one under the other (a top bar plus a page header
  band). The context moves *into* the one bar.
- A second pinned band is earned only by content that needs it while
  scrolling — a long table's column header, the filters of a long list —
  and the total still fits the size budget (§6).

## 3. Navigation, page header and utilities are three things

Navigation is the destinations. The page header is this page's title,
context and actions. Utilities are search, notifications, the account, the
theme. Decide each on its own; a bar that mixes all three is how headers
grow.

The pattern follows the structure — count the destinations first:

| Destinations | Pattern |
|---|---|
| One (a single-purpose tool, a flow) | no navigation: the context, and a way back or out |
| 2–5, parallel | tabs or a segmented control in the header; on phones a bottom bar |
| 6 or more, or grouped | a side rail (icons with labels, collapsible); on phones a bottom bar for the top 3–5 and "More" |
| A multi-step task | a stepper; the rest of the navigation steps back until the task ends |

- Utilities sit where they are least in the way: the foot of the rail, or
  the end of the header at rest. They rarely need to stay while scrolling.
- On phones the destinations go to the bottom, within the thumb's reach;
  the top keeps only the context.
- Each size gets its own arrangement, never the desktop bar squeezed: say
  what collapses (labels to icons, several actions into one menu), what
  moves (destinations to the bottom) and what is always kept (this screen's
  main action).

## 4. The scroll edge

- **Nothing shows above or beside a pinned bar.** Attach it to the window's
  edge at full width; or, if it floats inside the page's margins, cap it:
  the page's own colour from the window's edge down to the bar, then a
  short fade, so content fades out before it reaches the bar.
- **Nothing behind it can be read.** Once content is under it the bar is
  frosted (a tint of 0.7 or more, with blur) or solid. Thin glass over
  text shows the text.
- **Focus and jump targets never land under it.** `scroll-padding-top`
  equals the bar's height (WCAG 2.2, Focus Not Obscured), and anything that
  sticks lower down starts at the bar's lower edge.
- **One order of layers:** content, parts that stick inside it, the header,
  menus and sheets, toasts. A menu opened from the bar sits above it.
- **One glass layer per stack:** a menu or sheet over a glass bar is solid
  or strongly tinted, never glass on glass.

## 5. Material

- **Two states, switched at a threshold** — content under the bar, or not —
  and cross-faded in about 180 ms. No effect tied to each pixel of scroll
  (parallax, blur that grows as you scroll), no animated blur radius.
  Reduced motion: the switch is instant.
- **The bar is in the page's own tone, in every theme the product ships.**
  No dark slab over a light page unless the brand requires it and
  `DESIGN.md` says so. Tint, edge and shadow come from tokens.
- Text and icons on the bar keep their contrast over the busiest content
  that can pass under it.
- Reduced transparency, more contrast, or no `backdrop-filter`: solid.

## 6. Size

- Pinned at the top on a desktop: **64 px or less**.
- Everything pinned on a phone, top and bottom together: **15% of the
  height or less**.
- Touch targets of 44 px on phones (24 px is the floor).
- Whatever is pinned to an edge respects the safe areas:
  `viewport-fit=cover` and `env(safe-area-inset-*)`.

## 7. Through a change of screen

The bar and the navigation don't move, blink or re-enter when the screen
changes; the content beneath them changes (`changeScreen` in the motion
kit, or the router's view transitions). The compact context follows the new
screen's title.

## 8. Building it

The kits give mechanics, never a bar:

- `scrollEdge(bar, { title })` in the experience kit marks the bar while
  content is under it (`data-over`), keeps `scroll-padding-top` at the
  bar's height, and marks when the title has scrolled out (`data-context`)
  while copying the title into the bar.
- The glass kit has the two materials: `.lg-scroll-edge` (attached; plain
  page at rest, frosted over content) and `.lg-cap` (around a floating
  bar). `.lg-bar` is for bars that float over a canvas, not the page's
  header.
- Everything else — what the bar contains, its shape, where the
  destinations live — is designed per product in the build sheet.

Other stacks keep the same behaviour with their own tools: Alpine or
Livewire with a scroll listener and `x-bind` for the two states; React, Vue
and Svelte with an `IntersectionObserver` on the title; Flutter with a
pinned `SliverAppBar` (`scrolledUnderElevation`, a title that appears when
the large one collapses) and `NavigationBar` or `NavigationRail` by width;
React Native with the navigator's large-title and blur header options.

## 9. Checking it

`arkar-ui-visual-qa/scripts/audit.cjs` judges the header on the scrolled
page, at desktop and phone size (run it once per theme with `--scheme`):

| The audit says | It is |
|---|---|
| content showing above or beside the bar: YES | a defect |
| the page readable through the bar: YES or LIKELY | a defect |
| a control takes focus under a pinned bar | a defect |
| a dark bar over a light page (or the reverse) | a defect, unless `DESIGN.md` records it as the brand's |
| OVER the budget, or bands stacked | a defect, unless each band is earned (§2) — say why in the Verify table |
| safe areas missing with bars pinned on a phone | a defect |

Screenshots at rest *and* scrolled, in each theme the product ships, go to
the early look review and the independent review: a header is judged where
it goes wrong, which is never the top of the page.
