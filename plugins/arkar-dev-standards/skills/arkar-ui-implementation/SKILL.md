---
name: arkar-ui-implementation
description: Engineers the frontend code for UI work in the project's own stack — React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, Astro, plain HTML/CSS, Tailwind, Laravel Blade/Livewire/Inertia, Django templates/htmx, React Native and Flutter — following the existing architecture and conventions, reusing dependencies and components, writing semantic, accessible, well-structured components with clean state management, and keeping performance high (Core Web Vitals, rendering, re-renders, images, fonts, bundle size, dependency cost, animation cost, memory and battery). Use this whenever writing or restructuring UI code, choosing frontend techniques or libraries, fixing build errors, or when a UI is slow, janky, heavy or shifts while loading.
---

# UI implementation and performance

## Purpose

Turn the design decisions into code that is correct, maintainable and fast —
in the project's own architecture, so juniors can follow it and nothing
unrelated breaks. Performance is part of the implementation, not a later
phase.

## Activate when

- writing or restructuring any UI code;
- choosing techniques or libraries for UI, motion or state;
- build errors in the frontend;
- the UI is slow, janky, heavy, re-renders too much or shifts while loading.

## Don't activate when

- only design decisions are being made (no code yet), or only backend code
  changes.

## Required analysis

Before choosing any technique, inspect the project: framework and version,
routing, state management, styling approach, component library, animation
libraries, build tooling, test setup, linting, folder conventions
(`references/frontend-architecture.md`). Follow what is there.

## Responsibilities

1. **Follow the existing architecture** — folder structure, naming,
   patterns, state management. Reuse existing dependencies and components;
   install nothing new without a clear need (and say why).
2. **Component engineering** (`references/component-engineering.md`):
   semantic, accessible markup; small, composed components; presentation
   separate from data; explicit states; tokens only.
3. **Implementation quality** (`references/implementation-quality.md`):
   preserve functionality, no unrelated changes, build/lint/type checks and
   tests pass.
4. **Performance** (`references/performance.md`): Core Web Vitals, rendering,
   re-renders, images, fonts, bundles, dependency cost, animation cost,
   memory and battery — measured where possible, balanced against visual
   quality.
5. Existing code beyond the task: cleanup and fixes go through the change
   workflow's approval list (`arkar-change-workflow`), never silently.

## Expected output

Working code in the project's conventions, passing its build and checks,
with a short note of any new dependency (and why) and any performance
measurement taken.

## Quality criteria

- No new framework or library because it's fashionable; the platform or an
  existing dependency first.
- No monolithic components; no duplicated components doing the same job.
- Functionality preserved; unrelated code untouched.
- Build succeeds; lint, type checks and tests pass.
- No layout shift introduced; interactions stay responsive; no unnecessary
  continuous animation, heavy blur or filter.

## Dependencies

Implements decisions from `arkar-ui-ux-engineering`,
`arkar-ui-design-system`, `arkar-ui-motion-design`,
`arkar-ui-responsive-design` and `arkar-ui-accessibility`; verified by
`arkar-ui-visual-qa`; code standards from the always-on rules and
`arkar-change-workflow`.
