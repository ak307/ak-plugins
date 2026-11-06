# Motion principles

## What premium motion feels like

- **Purposeful:** each animation communicates status, gives feedback, or
  shows a spatial relationship. If it does none, remove it.
- **Natural:** objects accelerate and decelerate like physical things; they
  don't start or stop abruptly; they have consistent weight across the
  product.
- **Responsive:** feedback starts immediately on input (within one frame
  where possible) and follows the user's gesture during drags and swipes.
- **Brief and precise:** short for frequent actions, a little longer for
  larger spatial changes; never long enough to wait for.
- **Continuous:** elements move from where they were to where they go;
  relationships stay visible (a card expands into its detail, a modal grows
  from its trigger, a removed item's gap closes).
- **Consistent:** the same kind of change moves the same way everywhere;
  one set of tokens.
- **Interruptible:** a new input redirects the motion from its current
  position and velocity instead of waiting or jumping.
- **Optional:** never the only carrier of information — state is also shown
  by text, icons or layout.

## Easing

| Use | Easing |
|---|---|
| Entering / appearing | decelerate (ease-out), e.g. `cubic-bezier(0.2, 0, 0, 1)` family |
| Leaving / dismissing | accelerate (ease-in), shorter than entering |
| Moving within the screen | standard ease-in-out |
| Progress, shimmer, rotation of spinners | linear |
| Direct manipulation (drag release, toggles, sheets) | springs |

Material 3's duration tokens are a useful reference scale: short 50–200 ms,
medium 250–400 ms, long 450–600 ms, extra-long 700–1000 ms.

## Springs and physics

- Prefer springs for things the user manipulates or that should feel
  physical: sheets, drawers, toggles, drag-and-drop, cards settling, scale on
  press.
- Describe springs perceptually (Motion's `visualDuration` + `bounce`, or
  stiffness/damping/mass where velocity matters). Keep bounce low (≈0–0.2) in
  professional products; zero for most UI.
- Springs carry the gesture's velocity: a fast flick finishes faster.
- Controlled scale: press scale ~0.96–0.98; expansion from the trigger's
  size, not from zero.
- Rubber-band (elastic) resistance at scroll/drag limits only where the
  platform does it.
- Don't spring everything — text changes, colour changes and frequent
  updates use simple short eases.

## Choreography

- One element leads; related elements follow in reading order with a short
  stagger (tens of milliseconds), capped so a long list doesn't take
  seconds — stagger the first few, bring the rest together.
- Elements that belong together move together.
- Never several unrelated things competing for attention.
- A first-view sequence completes within about a second.

## Motion hierarchy in practice

Select the lowest level that achieves the result:

- A saved setting needs level 1 (the control's state), maybe a level-2
  toast — not a level-3 page transition.
- A detail view opening from a list benefits from level 3 (shared element).
- A marketing hero may use level 5 once; the rest of the page stays at 2–3.
- Don't raise the level to make something "look premium" — refinement at a
  low level reads as more premium than spectacle.
