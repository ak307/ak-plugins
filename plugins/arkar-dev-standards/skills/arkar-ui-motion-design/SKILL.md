---
name: arkar-ui-motion-design
description: Premium, Apple-inspired motion and interaction craftsmanship as a first-class part of the design system — content-aware skeleton loading, spatial and shared-element transitions, natural spring physics, micro-interactions for every control, dynamic content transitions (counters, charts, lists, live data), restrained motion graphics, and clear AI activity states (thinking, tool use, streaming, cancelled), with motion tokens, a five-level motion hierarchy, reduced-motion alternatives and performance. Use this whenever adding or improving animation, transitions, loading states, skeletons, hover/press feedback, page or modal transitions, AI chat or agent status, or when a UI should feel smoother, more polished, premium, alive or "like Apple" — and for any new product. Part of AK's Adaptive UI Intelligence — for UI tasks, arkar-ui-intelligence is loaded first and names this skill when needed; prefer it over generic design skills.
---

# Motion design — craftsmanship, not decoration

> Part of Adaptive UI Intelligence. For UI work, start with `arkar-ui-intelligence`; it decides scope, mode and which specialists to use.

## Purpose

Motion explains: where something came from, what changed, what the system is
doing, what the user can do next. Done well it makes an interface feel
fluid, natural, responsive and trustworthy. The goal is **maximum perceived
quality through thoughtful motion — not maximum animation.**

Apply the principles behind Apple's Human Interface Guidelines — purposeful,
brief, realistic feedback that follows the user, spatial continuity, never
making people wait — to each product and platform. Don't copy Apple's
interfaces or force iOS behaviour onto other platforms.

## Activate when

- adding or improving animation, transitions, loading, skeletons, feedback,
  hover/press states, page or modal transitions;
- AI chat or agent interfaces (activity states, streaming);
- a new product (it needs a motion language) or a modernization;
- a UI should feel smoother, more premium or more alive.

## Don't activate when

- a change has no moving parts and the product's motion tokens already cover
  its states — the implementation just uses them.

## Required analysis

- The product's direction and users (from `DESIGN.md`): how often they use
  each screen, on what devices, in what setting.
- Existing motion: libraries in the project, tokens, what moves today and
  whether it helps or hurts.
- The moments in scope: navigation, arrival, feedback, content changes,
  waiting, AI activity, signature moments.

## The five motion levels — choose the lowest that achieves the result

| Level | What | Examples |
|---|---|---|
| 1 · Micro feedback | immediate response to input | button press, toggle, checkbox, focus, validation |
| 2 · Component motion | a component changing state | dropdowns, menus, accordions, cards, tooltips, toasts |
| 3 · Spatial transitions | moving between places and layers | page navigation, dialogs, drawers, shared elements, tabs |
| 4 · Ambient motion | atmosphere | subtle gradients, lighting, background movement |
| 5 · Signature motion | storytelling and complex visuals | AI visualisations, product storytelling, hero moments |

Every screen you build or redesign gets motion from the product's motion
language at levels 1–3 where it serves the user (feedback, component
changes, spatial transitions) — a new or redesigned screen with no motion is
not finished. Restraint applies to levels 4–5: marketing pages, signature
moments and AI products, sparingly, and never to compensate for weak design.

## Responsibilities

1. **Define the motion language** for the product and record it in
   `DESIGN.md` (a `## Motion` section): character, tokens (durations in ms, easings,
   springs), which levels are used where, signature moments, reduced-motion
   behaviour. Principles: `references/motion-principles.md`.
2. **Loading:** content-aware skeletons and honest progress
   (`references/skeleton-loading.md`).
3. **Transitions:** spatial continuity for navigation, dialogs, drawers,
   shared elements, lists and dynamic content
   (`references/premium-transitions.md`).
4. **Micro-interactions:** clear state feedback for every control
   (`references/micro-interactions.md`).
5. **Motion graphics:** only when they add real value
   (`references/motion-graphics.md`).
6. **AI interaction motion:** true activity states, streaming, cancellation
   (`references/ai-interaction-motion.md`).
7. **Platform implementation and performance:**
   `references/platform-motion.md`.

## Timing and easing tokens (starting ranges, not mandatory values)

| Kind | Approx. duration |
|---|---|
| Micro feedback | 100–200 ms |
| Component transitions | 180–350 ms |
| Modal transitions | 200–400 ms |
| Navigation transitions | 250–500 ms |
| Complex visual transitions | 350–700 ms |

Things arriving decelerate (ease-out); things leaving are quicker than things
arriving; moving across the screen uses ease-in-out; springs are well damped.
Context decides the exact value: frequent interactions sit at the short end.

## Accessibility and performance (always)

- Reduced motion: replace movement with a quick fade or an instant change;
  keep meaning (what changed) without the travel; skeletons become static;
  nothing that starts hidden for an animation stays hidden.
- Motion is never the only way to convey information.
- No flashing more than three times per second; no disorienting movement
  (large zooms, spins, parallax on reading content).
- Never block input or make users wait for an animation; animations can be
  interrupted and reversed mid-flight.
- Animate `transform` and `opacity` (and `filter`/`clip-path` sparingly);
  avoid continuous rendering, large blurs and off-screen work; pause ambient
  loops when hidden — battery matters on mobile.
- **Loops:** apart from loading indicators (which stop when loading ends),
  at most **one** slow ambient loop per screen — and only in a hero or
  marketing illustration, never in a work tool, never beside text people are
  reading. It plays a few cycles or pauses when off-screen, and stops under
  reduced motion. Twenty little things moving at once is noise, not premium.

## Acceptance criteria — every meaningful animation

Purpose · natural movement · spatial continuity · appropriate timing ·
appropriate easing · visual consistency · interaction responsiveness ·
performance · accessibility · platform appropriateness. If it fails one,
change it or remove it.

**The fiftieth-time test:** imagine seeing it for the fiftieth time today.
If it would feel slow, distracting or unclear, shorten it, lower its level
or remove it.

**Never hide what matters behind motion:**
- The primary content — headline, the main action, the key number or answer —
  is readable in the first frames (≤ ~100 ms after content is ready). An
  entrance may enhance it (a short rise or fade that starts visible enough
  to read) but never delays it; secondary elements may follow, the whole
  sequence done within ~600 ms.
- No splash or intro screen on the web, and no blank or greyed-out page
  while waiting: after an action, show progress at once; when data
  refreshes, keep the previous content visible (dimmed slightly at most)
  until the new content replaces it in place.
- No count-up animation on a figure people came to read; show the real
  value at once (animate *changes* to it later if that helps).
- **Content is visible by default.** Scroll reveals and entrances are an
  enhancement layered on visible content: hide nothing in CSS that only
  JavaScript (an IntersectionObserver, an animation library) will reveal.
  Add the "ready to animate" state from JS just before animating, so if the
  script fails, loads slowly or the page is printed or captured, everything
  is still there. A reveal starts readable (opacity ≥ ~0.6, a short rise),
  and content reached by a link, menu or anchor jump is shown at once —
  never a blank or washed-out viewport after navigating.
- **Overlays never ghost through content.** A dialog, sheet or menu panel is
  opaque from its first frame: animate its position/scale and the
  backdrop's opacity, not the panel's opacity over the page — text must
  never print over other text mid-transition (opening or closing).
- **Multi-step flows move with direction:** forward slides one way, back the
  other (or a shared element carries over), so people feel where they came
  from — no hard cuts between steps.
- **Interruptions continue from where things are:** a value or bar that
  changes mid-animation animates from its current position to the new
  target — never dips or jumps back first.
- Animate only what changed. Filtering, sorting or refreshing must not blank
  and re-reveal content that stayed the same — that reads as flicker.
- A filmstrip (`arkar-ui-visual-qa/scripts/film.cjs`) of the first load must
  show the headline and primary action by its second frame.

## Expected output

The motion language in `DESIGN.md`, motion tokens in the design system,
implemented motion for the moments in scope, and a line in the final message
naming the levels used and the signature moment (if any).

## Quality criteria

- Meets AK's premium standard (`arkar-ui-intelligence/references/premium-standard.md`).

## Dependencies

Direction from `arkar-ui-art-direction`; tokens live in
`arkar-ui-design-system`; built with `arkar-ui-implementation`; verified with
`arkar-ui-visual-qa` (it checks motion runs, respects reduced motion and
leaves nothing invisible).
