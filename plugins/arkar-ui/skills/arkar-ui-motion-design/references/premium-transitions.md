# Premium spatial and content transitions

## Spatial continuity

When one element becomes another view, make the relationship visible.

| Transition | Approach |
|---|---|
| Page navigation | a short cross-fade with a small directional offset; direction reflects hierarchy (deeper = forward, back = reverse) |
| Shared element (list item → detail) | the item's image/title/card morphs into the detail's (View Transitions with matching `view-transition-name`, Motion `layoutId`, Flutter `Hero`) |
| Container expansion | the container grows from its current bounds into the new layout; content inside fades in after the container settles |
| Expand / collapse | height via `grid-template-rows` 0fr→1fr or a layout animation, content fades; chevron rotates with it |
| Modal presentation | scale from ~0.96 + fade, or grow from the triggering control; backdrop fades; dismissal quicker and reversible mid-way |
| Sidebars and drawers | slide from their edge with a spring or decelerating ease; follow drag on touch; backdrop dims |
| Tabs | the indicator slides to the new tab; content cross-fades or slides by direction |
| Image expansion | the thumbnail scales to its full view from its own position; close returns it there |
| Content replacement | cross-fade with a short overlap; keep the container's size stable or animate the size change |
| List insertion / removal | new items fade and expand into place; removed items fade and collapse; neighbours move to close the gap (FLIP / layout animation) |

Avoid abrupt, disconnected or unnecessary transitions: if a transition
doesn't clarify where things went, use a quick fade or none.

## Dynamic content

Keep users oriented when data changes:

| Change | Approach |
|---|---|
| Counters and totals | animate the number briefly (≤ ~600 ms) with tabular figures; skip the animation on rapid repeated updates |
| Charts | interpolate from old values to new; draw on first view only |
| Progress updates | smooth between real values; never run ahead of reality |
| Filtering and sorting | items move to their new positions; removed items fade; keep the user's place |
| List and table updates | highlight changed rows briefly; insert without shifting what the user is reading — if new items arrive above the viewport, show "N new" instead of jumping |
| Live data refresh | update in place quietly; no full-screen reload flashes |
| Notifications | enter from a consistent edge, stack predictably, auto-dismiss only non-critical ones, pause on hover/focus |

Respect the user's reading position and current interaction: never move a
target while it's being pointed at, typed into or read.

## Interruption

Every transition can be interrupted: clicking back mid-transition reverses
from the current state; a second open replaces the first. Never queue
animations the user has to wait through.
