# Visual design and UX checklist

Use this while building and again while inspecting screenshots. It is a
checklist, not a style: the visual direction comes from the project and its
users (see SKILL.md, "Design direction").

## Contents
1. Layout and hierarchy
2. Typography
3. Colour and contrast
4. Components and states
5. Forms
6. Feedback and motion
7. Responsive behaviour
8. Accessibility
9. Elevation, interaction and icon rules
10. Charts — pick by question
11. Common defects to look for in screenshots

## 1. Layout and hierarchy

- One obvious primary action per screen; secondary actions look secondary.
- A consistent spacing scale (e.g. 4/8/12/16/24/32/48 px) — no one-off gaps.
- Content aligned to a clear grid; edges line up across sections.
- Related things grouped (proximity), unrelated things separated.
- Page title, section headings and body text form three or four clear levels.
- Data-heavy screens (tables, dashboards): numbers right-aligned, units
  shown, totals visually distinct, filters near what they filter.

## 2. Typography

- At most two typefaces; one is usually enough.
- Body text 16 px on mobile (never below 14 px for anything users must read).
- Line length about 50–80 characters for paragraphs.
- Line height ~1.4–1.6 for body, tighter for headings.
- Weight and size, not colour alone, create hierarchy.

## 3. Colour and contrast

- Colours come from tokens/variables (CSS variables, Tailwind theme), never
  scattered hex values.
- One primary colour for actions and focus; neutrals for surfaces and text;
  semantic colours for success / warning / error / info.
- Text contrast at least 4.5:1 (3:1 for large text and UI component borders).
- Don't rely on colour alone to convey meaning — add an icon or text.
- Dark mode only if the project supports it; if it does, check both.

## 4. Components and states

Every interactive component has all the states it can be in, styled
consistently across the app:

| Component | States to design |
|---|---|
| Button | default, hover, focus-visible, pressed, disabled, loading |
| Input | empty, filled, focus, error (with message), disabled, read-only |
| List / table | loading (skeleton), empty (with next step), error (with retry), populated, very long content |
| Dialog / drawer | open, closing, focus trapped, Escape closes, focus returns to trigger |
| Navigation | current page marked, collapsed (mobile), expanded |

Empty states say what's missing and what to do next ("No leave requests yet —
Submit your first request").

## 5. Forms

- Labels always visible (not placeholder-only).
- Validation messages next to the field, in plain language, saying how to fix it.
- Required vs optional is clear.
- Correct input types (`email`, `tel`, `number`, `date`) so mobile keyboards fit.
- Submit button shows loading and prevents double submission.
- After success: clear confirmation and an obvious next step.
- Don't clear the user's input on a server error.

## 6. Feedback and motion

- Every action gets feedback within ~100 ms (state change, spinner, toast).
- Operations over ~1 s show loading; over ~5 s show progress if measurable.
- Transitions 150–250 ms, easing out; nothing bounces for the sake of it.
- Animate opacity and transform, not layout properties (width, top) — smoother.
- Wrap non-essential motion in `@media (prefers-reduced-motion: reduce)` and
  turn it off there.
- No progress bar or skeleton where nothing is actually loading.

## 7. Responsive behaviour

| Width | Expect |
|---|---|
| 375 (mobile) | single column; navigation collapses (menu button or bottom bar); tables become cards or scroll inside their own container; tap targets ≥ 44×44 px; no horizontal page scroll |
| 768 (tablet) | two columns where it helps; navigation may stay collapsed; forms not stretched edge to edge |
| 1440 (desktop) | content has a max width (often 1200–1320 px) or a deliberate full-width layout; no lines of text running the full screen width |

Design each size on purpose — a phone layout is not the desktop layout squeezed.

## 8. Accessibility

- Everything works with keyboard only: Tab order follows the visual order,
  focus is always visible, Enter/Space activate, Escape closes overlays.
- Semantic HTML first (`button`, `a`, `label`, `nav`, `main`, headings in order);
  ARIA only to fill gaps.
- Images that carry meaning have alt text; decorative ones have `alt=""`.
- Icon-only buttons have an accessible name (`aria-label`).
- Error messages are linked to their fields (`aria-describedby`).

## 9. Elevation, interaction and icon rules

- **Elevation scale:** define 2–3 levels (flat, raised, overlay) as tokens and
  use only those — no random shadow values. Higher level = more important or
  temporary (menus, dialogs).
- **One primary action per screen;** other actions use secondary/ghost styles.
- **Weights:** headings 600–700, body 400, labels 500. Numbers in tables and
  stats use tabular figures (`font-variant-numeric: tabular-nums`).
- **Clickable things look clickable:** `cursor: pointer`, a hover state
  (150–250 ms), a visible focus ring, and a pressed state that doesn't move
  the layout. Hover lift, if used, ≤ 2px.
- **Disabled:** reduced opacity (≈0.4–0.5) plus `cursor: not-allowed`, and the
  reason shown where possible.
- **Icons:** one icon family; one consistent stroke width (1.5 or 2px); don't
  mix filled and outline at the same level; never emoji as UI icons;
  meaningful icons have 3:1 contrast and an accessible name.
- **Colour tokens:** components use semantic tokens (`--color-primary`,
  `--color-surface`, `--color-danger`), never raw hex; avoid grey text on grey
  backgrounds.

## 10. Charts — pick by question

| Question | Chart | Not when |
|---|---|---|
| How did it change over time? | line (area if one series) | fewer than ~4 points → show a stat with change instead |
| How do categories compare? | horizontal bar, sorted | more than ~12 categories → top 10 + "others" |
| What share of the whole? | stacked bar or a single progress bar | more than 4 parts → bar chart; avoid pies with many slices |
| How far toward a target? | progress bar / ring with the number | no target exists |
| Where are the hotspots? | heatmap (e.g. day × hour) | sparse data |
| What's the status of many things? | grid of status tiles | fewer than ~6 items → a list |

Always label the axis or value directly, use the palette's semantic colours,
and give a text alternative (the key number in words).

## 11. Common defects to look for in screenshots

- Horizontal scrollbar or content cut off at the right edge on mobile.
- Text overlapping, truncated without an ellipsis or tooltip, or wrapping one
  word per line.
- Buttons of different heights side by side; misaligned icons and text.
- Huge empty areas on desktop, or cramped edges (no side padding) on mobile.
- Default browser styles leaking through (unstyled `select`, blue underlined links in a styled UI).
- Images stretched, pixelated or missing (broken image icon).
- Modals taller than the viewport with no way to scroll.
- Sticky headers covering content or anchor targets.
- Focus ring missing, or removed with `outline: none`.
- Console errors, 404s for assets, failed API calls.
- Emoji used as icons; mixed icon styles; random shadows; clickable cards
  without a pointer cursor or hover state.
