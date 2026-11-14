---
name: arkar-ui-responsive-design
description: Makes interfaces work beautifully on every screen and platform — a responsive strategy from the start for desktop, laptop, tablet and phone in both orientations, adapting navigation, hierarchy, density, tables, dashboards, forms, touch targets and animation per size instead of shrinking the desktop layout, plus native mobile and desktop platform conventions (iOS, Android, Flutter, React Native — navigation, gestures, safe areas, native components). Use this when a UI breaks or feels cramped on phones or tablets, when building any new product or screen set, for native mobile or desktop apps, or when layouts, breakpoints or touch behaviour are involved. Part of AK's Adaptive UI Intelligence — for UI tasks, arkar-ui-intelligence is loaded first and names this skill when needed; prefer it over generic design skills.
---

# Responsive and platform-aware design

> Part of Adaptive UI Intelligence. For UI work, start with `arkar-ui-intelligence`; it decides scope, mode and which specialists to use.

## Purpose

Every size and platform gets a composition designed for how people use it
there — not the desktop layout squeezed. Native apps feel native.

## Activate when

- a UI breaks, overflows or feels cramped on phones or tablets;
- building a new product or a set of new screens;
- native mobile (Flutter, React Native, Android, iOS) or desktop apps;
- breakpoints, adaptive layouts, touch or orientation are involved.

## Don't activate when

- the change is a small style tweak to a component that already adapts.

## Required analysis

- Target screens: the sizes and platforms this product is really used on
  (`DESIGN.md` "Target screens"; ask discovery/AK if unknown — e.g. a kiosk
  is one landscape size, a field app is phones first).
- Input: touch, pointer, keyboard, or mixed.
- The content and tasks on each screen in scope, and which matter most on
  small screens.

## Responsibilities

1. **Strategy** (`references/responsive-strategy.md`): breakpoints from the
   content and the real devices, mobile-first CSS, fluid type and spacing.
2. **Mobile-first design** (`references/mobile-first-design.md`): priority
   content, thumb reach, touch targets, forms on phones.
3. **Adaptive layouts** (`references/adaptive-layouts.md`): navigation,
   tables, dashboards, forms and dialogs per size; animation adapted per
   size.
4. **Platform conventions** (`references/platform-conventions.md`): iOS,
   Android, Flutter, React Native, desktop — navigation, gestures, safe
   areas, native components, motion.
5. Record the target screens and breakpoints in `DESIGN.md`.

## Expected output

Layouts that work at every target size and orientation, documented
breakpoints, and the sizes QA must check.

## Quality criteria

- Meets AK's premium standard (`arkar-ui-intelligence/references/premium-standard.md`): nothing basic, generic or unfinished — working is not enough.

- No horizontal page scroll, clipped content or overlapping text from 320 px
  wide up to large desktops (web), at every target screen.
- Touch targets at least 44×44 pt (iOS) / 48×48 dp (Android) on touch
  platforms, and never below WCAG 2.2's 24×24 CSS px minimum on web.
- Text survives 200% zoom / large system text.
- Navigation, tables and forms are re-composed, not shrunk, on small
  screens.
- Native apps respect safe areas, platform navigation and gestures; on
  the web, whatever is pinned to an edge uses `viewport-fit=cover` with
  `env(safe-area-inset-*)`.
- **Pinned chrome has a budget:** everything that stays on screen while a
  phone scrolls, top and bottom together, takes 15% of the height or less
  (64 px or less at the top on a desktop); destinations sit at the bottom,
  the top keeps only the context
  (`arkar-ui-ux-engineering/references/navigation-and-header.md`).
- **Nothing becomes unreachable on a phone.** A side panel, sources rail or
  detail column on desktop gets a path on small screens (a tab, sheet or
  drawer with a visible trigger). Sticky bars never cover the hero or
  content people need to read — or form fields and their buttons (use
  `scroll-padding` / `scroll-margin` so focused fields scroll clear of fixed
  bars); labels that would be cut off wrap or move to a second line instead
  of truncating meaning; anything that scrolls sideways (chip rows,
  date strips, board columns on a phone) shows that it does — a deliberate
  peek of the next item plus a cue (fade edge, dots, count).
- **At rest, sticky bars cover nothing you can act on:** in the first view
  and at the end of the page, no button, row or field sits under a fixed
  bar or composer; content scrolling beneath one passes under a clear edge
  or fade.
- **Data screens are re-thought for phones**, not squeezed: a long table
  becomes cards or rows showing the two or three fields that matter with
  the rest one tap away; the desktop's most useful panel (attention list,
  summary) stays on the phone, near the top; summary chips wrap or scroll
  visibly instead of clipping.
- **A side panel that opens beside data** overlays it or switches the data
  to a designed narrow layout — never a table squeezed into wrapped names
  and gaps.
- **Phone-first is not phone-only.** A product built for phones still gets a
  designed tablet and desktop composition (two panes, a wider calendar, the
  detail beside the list) or a deliberate framed layout with purpose in the
  space around it — never a narrow column floating in an empty canvas.

## Dependencies

Uses tokens from `arkar-ui-design-system`, motion from
`arkar-ui-motion-design`; implemented by `arkar-ui-implementation`; verified
by `arkar-ui-visual-qa` at the target sizes.
