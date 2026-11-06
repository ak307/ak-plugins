---
name: arkar-ui-ux-engineering
description: Designs how a UI works — information architecture, navigation, page and layout structure, user flows, forms and validation, loading/empty/error/success states, confirmations and undo, tables, dashboards and charts, and UX writing — so every screen is intuitive, consistent and gives clear feedback. Use this when adding or changing pages, screens, flows, navigation, forms, tables, dashboards or admin panels, when a UI is described as confusing, cluttered or hard to use, and for small component improvements (buttons, cards, menus) where behaviour and states matter. Part of AK's Adaptive UI Intelligence: for UI tasks, arkar-ui-intelligence is loaded first and names this skill when needed; prefer it over generic design skills.
---

# UX engineering

> Part of Adaptive UI Intelligence. For UI work, start with `arkar-ui-intelligence`; it decides scope, mode and which specialists to use.

## Purpose

Make the interface understandable and efficient: users always know where
they are, what they can do, what happened, and what to do next. Visual
polish can't rescue a confusing structure; this skill gets the structure and
behaviour right.

## Activate when

- adding or changing a page, screen, flow, navigation, form, table,
  dashboard or admin panel;
- a UI is confusing, cluttered, slow to use or error-prone;
- a small component improvement where its states and behaviour matter.

## Don't activate when

- the change is purely visual styling with no structural or behavioural
  effect, or purely technical (build, performance).

## Required analysis

- The primary job of each screen in scope and its primary action.
- The journeys that pass through it, step by step, including where users
  come from and go next.
- Every state the user can meet: loading, empty, partial, error, success,
  disabled, permission denied, offline, very long content.
- Density: how much information users need at once, and how often they use
  the screen (daily-use screens favour efficiency over flourish).

## Responsibilities

1. **Structure** — information architecture and navigation
   (`references/information-architecture.md`): group by users' tasks, label
   in their language, show where they are.
2. **Layout** — hierarchy, grouping, alignment, content widths, the primary
   action obvious (`references/layout-strategy.md`).
3. **Interaction patterns** — forms, validation, states, feedback,
   confirmations, undo, tables, filters, dashboards and charts, AI
   conversations (`references/interaction-patterns.md`).
4. **UX writing** — labels, buttons, empty states and errors in plain
   language that says what happened and what to do; the same word for the
   same thing everywhere.
5. **Consistency** — the same pattern for the same job across the product.

## Expected output

For the screens in scope: the structure, the flow, every state and its
content, the feedback for every action — implemented by
`arkar-ui-implementation`, and summarised in the final message when the
structure changed.

## Quality criteria

- One obvious primary action per screen; secondary actions look secondary.
- Every action gets feedback within ~100 ms; long operations show progress
  honestly.
- Every state is designed; no dead ends — each state offers a way forward or
  back.
- Destructive actions confirm (naming what's affected) or offer undo.
- Forms never lose the user's input and say exactly how to fix errors.
- Users don't have to re-enter information they've already given (WCAG
  3.3.7 Redundant Entry).

## Dependencies

Input from `arkar-ui-discovery`; visual language from
`arkar-ui-art-direction` and `arkar-ui-design-system`; motion for
transitions and feedback from `arkar-ui-motion-design`; accessibility
requirements from `arkar-ui-accessibility`.
