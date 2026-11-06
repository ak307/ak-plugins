---
name: arkar-ui-accessibility
description: Builds accessibility and inclusive design into every interface, targeting WCAG 2.2 AA — colour contrast, keyboard navigation, visible and unobscured focus, semantic markup and heading structure, accessible names and form labels, error identification, screen reader support, accessible dialogs, menus and navigation, touch target size, dragging alternatives, reduced motion, text resizing and multilingual text (including Burmese). Use this for new screens, forms, dialogs, menus or custom controls, for accessibility audits or fixes, and whenever a UI must be usable with a keyboard, screen reader, large text or reduced motion. It never claims compliance without real testing.
---

# Accessibility and inclusive design

## Purpose

Everyone can perceive, operate and understand the interface — including
keyboard users, screen reader users, people with low vision, colour
blindness, motion sensitivity, tremor, or reading in a second language.
Accessibility is mandatory, not a polish step.

**Target:** WCAG 2.2 Level AA wherever it applies (web; the same intent on
native platforms through their accessibility APIs).

## Activate when

- building new screens, forms, dialogs, menus, tabs or custom controls;
- an accessibility audit, complaint or fix;
- a redesign or new product (requirements from the start).

## Don't activate when

- a pure copy or colour-token change that keeps existing contrast — but the
  hard floor below still applies to every UI task.

## Required analysis

- Which controls and flows are in scope; any custom widgets (combobox, date
  picker, drag-and-drop, carousel).
- The project's tools: headless accessible components (Radix, Headless UI,
  Material), testing tools available (axe, Lighthouse, Playwright,
  Flutter `meetsGuideline`).

## Hard floor (every UI task, never traded for style)

- Text contrast ≥ 4.5:1 (≥ 3:1 for large text); UI components and meaningful
  graphics ≥ 3:1.
- Everything works with a keyboard; focus is always visible and not hidden
  behind sticky headers or overlays (2.4.11).
- Form fields have labels; errors identify the field and say how to fix it.
- Images and icon-only buttons have accessible names; decorative images are
  hidden from assistive tech.
- Reduced motion respected; nothing flashes more than three times a second.
- Targets at least 24×24 CSS px or adequately spaced (2.5.8); dragging has a
  single-pointer alternative (2.5.7).
- No horizontal scroll or loss of content at 320 px width / 400% zoom; text
  readable at 200%.

## Responsibilities

1. Apply the WCAG 2.2 AA requirements relevant to the scope
   (`references/wcag-guidelines.md`).
2. Build accessible interactions: keyboard models, focus management, ARIA
   only to fill gaps (`references/accessible-interactions.md`).
3. Inclusive design: language, scripts, text size, cognitive load, colour
   vision, motion sensitivity (`references/inclusive-design.md`).
4. Test with what's available (automated checks + keyboard pass + screen
   reader spot-check where possible) and report honestly.

## Expected output

Accessible implementation of the scope, and in the final message: what was
tested and how, issues fixed, and what remains unverified (e.g. "no screen
reader test performed").

## Quality criteria

- Semantic HTML first; ARIA only where native semantics can't express it.
- Automated checks clean for the scope (where a tool is available) **and**
  a manual keyboard pass done — automated tools find only part of the
  problems.
- Never state "WCAG compliant" or "accessible" as verified without the
  testing that supports it; say "built to WCAG 2.2 AA; tested with …".

## Dependencies

Contrast tokens from `arkar-ui-design-system`; reduced-motion behaviour
from `arkar-ui-motion-design`; touch/zoom from `arkar-ui-responsive-design`;
verified within `arkar-ui-visual-qa`.
