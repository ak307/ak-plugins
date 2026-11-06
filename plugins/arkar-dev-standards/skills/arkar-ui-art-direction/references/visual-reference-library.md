# Visual and engineering reference library

Learn principles and practices from these; never copy an interface, layout
or visual identity. Prefer the official documentation; when guidance might
have changed and research tools are available, check the current page.

## Apple — Human Interface Guidelines

https://developer.apple.com/design/human-interface-guidelines/

| Topic | What to take from it |
|---|---|
| Motion (`/motion`) | add motion purposefully, never gratuitously; make it optional (never the only way to convey information); feedback that follows the gesture; brief, precise feedback; avoid motion on frequent interactions; let people cancel motion rather than wait for it |
| Progress indicators (`/progress-indicators`) | determinate when the duration is known, indeterminate only when it can't be quantified (switch to determinate once known); keep indicators moving and accurate; specific labels rather than "Loading"; allow cancel where possible |
| Layout, typography, color | clear hierarchy, consistent alignment, legible type, adaptable layouts |
| Accessibility | Dynamic Type, VoiceOver, contrast, Reduce Motion / Transparency |
| Platform conventions | navigation, gestures, safe areas and controls per platform (iOS, iPadOS, macOS) |

## Google — Material Design 3

https://m3.material.io — layout, motion (easing and duration tokens, springs
in Material 3 Expressive), components and accessibility; the reference for
Android conventions.

## Accessibility — WCAG 2.2

https://www.w3.org/TR/WCAG22/ and the "Understanding" pages — the target for
all web work (see `arkar-ui-accessibility`).

## Product quality inspirations

| Source | Learn from | Never copy |
|---|---|---|
| Linear (linear.app) | interaction precision, keyboard-first flows, consistency, speed as a feature, restrained motion | its dark UI, purple identity, layouts |
| Stripe (stripe.com, Stripe docs) | enterprise refinement, documentation clarity, data presentation, polished forms and states | its gradients, illustrations, brand |
| Vercel / Geist (vercel.com/geist) | a documented design system: tokens, type scale, component states | its identity |

## Component and motion engineering

| Source | Use for |
|---|---|
| Radix UI (radix-ui.com) | accessible behaviour of dialogs, menus, popovers, tabs (keyboard, focus, ARIA) |
| Motion (motion.dev) | React and vanilla JS animation: springs, layout and exit animations, gestures, reduced motion |
| MDN Web Docs | View Transitions API, CSS animations and transitions, `prefers-reduced-motion` |
| web.dev | Core Web Vitals, image and font loading, rendering performance |
| Framework docs (React, Next.js, Vue, Nuxt, Svelte, Angular, Astro, Tailwind, Flutter, React Native) | the project's own stack — always the version it uses |
