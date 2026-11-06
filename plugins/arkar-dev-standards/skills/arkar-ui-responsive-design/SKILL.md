---
name: arkar-ui-responsive-design
description: Makes interfaces work beautifully on every screen and platform — a responsive strategy from the start for desktop, laptop, tablet and phone in both orientations, adapting navigation, hierarchy, density, tables, dashboards, forms, touch targets and animation per size instead of shrinking the desktop layout, plus native mobile and desktop platform conventions (iOS, Android, Flutter, React Native — navigation, gestures, safe areas, native components). Use this when a UI breaks or feels cramped on phones or tablets, when building any new product or screen set, for native mobile or desktop apps, or when layouts, breakpoints or touch behaviour are involved.
---

# Responsive and platform-aware design

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

- No horizontal page scroll, clipped content or overlapping text from 320 px
  wide up to large desktops (web), at every target screen.
- Touch targets at least 44×44 pt (iOS) / 48×48 dp (Android) on touch
  platforms, and never below WCAG 2.2's 24×24 CSS px minimum on web.
- Text survives 200% zoom / large system text.
- Navigation, tables and forms are re-composed, not shrunk, on small
  screens.
- Native apps respect safe areas, platform navigation and gestures.

## Dependencies

Uses tokens from `arkar-ui-design-system`, motion from
`arkar-ui-motion-design`; implemented by `arkar-ui-implementation`; verified
by `arkar-ui-visual-qa` at the target sizes.
