---
name: arkar-ui-design-system
description: Creates or improves a product's design system — design tokens (colour, typography, spacing, sizing, radius, shadow, border, layering, motion), semantic colour and type systems, accessible contrast, light and dark themes, reusable components with consistent variants and interaction states, and restyling component libraries (shadcn/ui, Tailwind, Filament, Material, Flutter ThemeData) so they don't look stock. Use this when starting a new product, unifying an inconsistent UI, adding dark mode or theming, defining tokens or a component library, or when spacing, colours or components are inconsistent. Not needed for a change that just uses existing tokens. Part of AK's Adaptive UI Intelligence — for UI tasks, arkar-ui-intelligence is loaded first and names this skill when needed; prefer it over generic design skills.
---

# Design system engineering

> Part of Adaptive UI Intelligence. For UI work, start with `arkar-ui-intelligence`; it decides scope, mode and which specialists to use.

## Purpose

Turn the product's identity into a small, consistent system — tokens and
components — so every screen stays coherent and new screens are fast to
build. Preserve an effective existing system; avoid abstraction for its own
sake.

## Activate when

- a new product (Mode C) or a modernization (Mode B);
- a feature whose component plan extends existing components or adds new ones;
- the UI is inconsistent (spacing, colours, type, components drift);
- adding dark mode, themes, or a component library;
- defining or cleaning up tokens.

## Don't activate when

- the change only uses existing tokens and components — use them;
- the task is a one-off fix in a product with a working system.

## Required analysis

- What exists: CSS variables, Tailwind theme (`@theme` in v4 or
  `tailwind.config`), component library, `ThemeData`, `DESIGN.md` tokens.
- What's inconsistent: one-off values, duplicate components, missing states.
- The identity from art direction (palette roles, type, shape, density) and
  the motion language from motion design.

## Responsibilities

0. **Component-first architecture.** Write the build sheet's component plan
   (`arkar-ui-intelligence/references/build-sheet.md`) before any screen:
   what is reused, what is extended, what is new — with variants,
   properties, states, interactions and tokens. Reuse existing components
   before building; extend before forking; for a new product, build the
   foundation (tokens and shared primitives) before composing screens;
   extract repeated patterns as they emerge, never a speculative library.
   Screens are compositions of these components, so every screen shares one
   design language and interaction pattern.
1. **Tokens** (`references/design-tokens.md`): a primitive layer (raw
   values) and a semantic layer (roles components use) for colour, type,
   spacing, sizing, radius, shadow/elevation, border, layering (z-index),
   motion, breakpoints.
2. **Typography system** (`references/typography-system.md`): families, scale,
   weights, line heights, responsive behaviour, scripts.
3. **Colour system** (`references/color-system.md`): semantic roles, states,
   contrast, data-visualisation colours, dark theme.
4. **Components** (`references/component-guidelines.md`): reusable, with
   consistent variants and every interaction state; library components
   restyled through tokens. Web builds start from the working-surface kit —
   `assets/surface-kit.css` and `assets/surface-kit.js` (fields, dropdown,
   date picker, menu, ticks and switches, buttons, chips, table, list rows,
   toolbar, selection bar, status, meter, empty and skeleton states; call
   `enhance()` once) — themed through its `--ws-*` tokens from `DESIGN.md`,
   set from the same values as the `--lg-*` glass tokens. It replaces
   browser-default selects and date fields and hand-made versions of these
   controls; the product's signature components are still its own. A
   product without a designed dark theme pins `data-theme="light"` on
   `<html>`, or both kits follow the system into a half-dark page.
   **A component is a template:** it defines how it looks and behaves; the
   product defines what it says, what it does and when it appears — no
   wording, icon, size or severity fixed inside a component, and the
   behaviour that keeps people safe not configurable at all
   (`references/component-guidelines.md`). In the kit: `configure({ locale,
   labels, icons })` once for wording, language and icons; tokens for
   everything visual, with floors; `dir="rtl"` mirrors it.
5. **Materials** (`references/materials-glass.md` — the material map: glass
   for navigation and hierarchy, solid for content): solid surfaces and,
   where the direction calls for it, Liquid Glass for the floating control
   layer (bars, sheets, menus, palette) — with legibility guards and
   reduced-transparency fallbacks. Content surfaces stay solid.
6. **Themes** (`references/theming.md`): light/dark and how themes switch,
   per stack.
7. **Record** the system in `DESIGN.md` (colour, type, shape and space
   sections) and in code (the token source of truth).

## Expected output

Token files/config in the project's own mechanism, components using only
semantic tokens, `DESIGN.md` updated, and — for an existing product — a
short note of what was unified.

## Quality criteria

- Meets AK's premium standard (`arkar-ui-intelligence/references/premium-standard.md`): nothing basic, generic or unfinished — working is not enough.

- Components never use raw values (hex, px one-offs, arbitrary Tailwind
  values like `p-[13px]`); they use semantic tokens.
- Every interactive component has its full set of states.
- Text and UI contrast meet WCAG 2.2 AA in every theme.
- No duplicate components doing the same job; no abstraction that only one
  place uses.
- No user-facing wording, dimension or severity hard-coded in a reusable
  component — and none of its safety behaviour left to the caller.
- An existing effective system is extended, not replaced.
- **Readable by default:** body text ≥ 16px (≥ 14px in dense work tools),
  secondary text ≥ 13px, and anything people must read at real contrast —
  pale grey 12px text on off-white looks refined in a screenshot and fails
  in use (and often fails WCAG AA).
- **Form controls belong to the system:** selects, date pickers, checkboxes
  and file inputs are styled to match (custom-styled native controls keep
  their accessibility); an unstyled OS dropdown next to crafted components
  is a premium failure.
- **The chosen fonts actually render — everywhere.** Serve them from the
  project (font files or `@fontsource` packages), not a runtime CDN: a
  blocked CDN, an offline kiosk or a privacy rule silently leaves the
  browser default. Display and brand type is always a bundled font: a
  system stack (Iowan Old Style → Charter → Georgia, SF Pro, Segoe UI)
  looks different on every device and falls back to Times or DejaVu on
  Windows, Android and Linux. A system stack is fine only for plain UI text
  (`system-ui`, sans-serif). Check the result
  (`arkar-ui-visual-qa/scripts/audit.cjs` reports failed font requests and
  fonts that fell back); Times or Arial by accident is a defect.
- **A small, real scale:** the rendered page uses about ≤ 6 radii,
  ≤ 12–14 font sizes and ≤ 5 shadows (audit.cjs counts them). More means
  one-off values crept in — map them back to tokens.

## Dependencies

Identity from `arkar-ui-art-direction`; motion tokens from
`arkar-ui-motion-design`; contrast and state requirements from
`arkar-ui-accessibility`; implemented with `arkar-ui-implementation`.
