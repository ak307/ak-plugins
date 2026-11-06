---
name: arkar-ui-accessibility
description: Builds accessibility and inclusive design into every interface, targeting WCAG 2.2 AA — colour contrast, keyboard navigation, visible and unobscured focus, semantic markup and heading structure, accessible names and form labels, error identification, screen reader support, accessible dialogs, menus and navigation, touch target size, dragging alternatives, reduced motion, text resizing and multilingual text (including Burmese). Use this for new screens, forms, dialogs, menus or custom controls, for accessibility audits or fixes, and whenever a UI must be usable with a keyboard, screen reader, large text or reduced motion. It never claims compliance without real testing. Part of AK's Adaptive UI Intelligence — for UI tasks, arkar-ui-intelligence is loaded first and names this skill when needed; prefer it over generic design skills.
---

# Accessibility and inclusive design

> Part of Adaptive UI Intelligence. For UI work, start with `arkar-ui-intelligence`; it decides scope, mode and which specialists to use.

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

## Hard floor

The hard floor in `arkar-ui-visual-qa/references/quality-gates.md` applies to
everything you build or change (contrast, keyboard and visible focus,
labels and errors, accessible names, target size and dragging alternatives,
reduced motion, reflow and zoom). Pre-existing problems outside the request
go to the approval list, not into the code.

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
