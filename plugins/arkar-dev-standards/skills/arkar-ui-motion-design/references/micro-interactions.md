# Micro-interactions

Level 1–2 motion. These happen hundreds of times a day — they must be
immediate, subtle and consistent, never distracting.

| Control | Feedback |
|---|---|
| Buttons | hover tint/elevation change (~150 ms); press: slight scale (~0.97) or darken instantly, release springs back; loading: label → spinner/progress inside the button, width stable |
| Icon buttons | same as buttons; a subtle background on hover/press; tooltips after a short delay |
| Navigation | the active indicator slides between items; hover underline/background grows from its origin |
| Toggles | the thumb moves with a well-damped spring; the track colour changes in step |
| Checkboxes and radios | the check draws or scales in quickly (~150 ms); indeterminate state clear |
| Inputs | focus ring appears instantly (never animated slowly); label/border transition ~150 ms; error: border and message appear together, an optional single small nudge — no repeated shaking |
| Dropdowns and menus | open from their trigger (scale 0.96→1 + fade, ~150–200 ms); close faster; keyboard focus moves with the open state |
| Tabs | indicator slides; content changes without layout jump |
| Cards | hover only if the card is clickable: small elevation/border change; press feedback; no lifting cards that aren't interactive |
| Tooltips | appear after ~300–500 ms hover delay, instant on keyboard focus, fade quickly |
| Notifications / toasts | enter from a consistent edge, exit faster; don't cover primary actions |
| Form submission | button shows progress; success confirms in place (check, message) and moves focus sensibly; errors appear next to fields |
| Progress indicators | move smoothly between real values |
| Success and error states | success: a brief, calm confirmation; error: clear and calm (colour + icon + text), never alarming animation |

Rules:

- Focus states are always visible and never depend on animation.
- No hover-only information on touch devices.
- High-frequency interactions get the shortest, quietest feedback; avoid
  motion on interactions that happen constantly when a state change alone is
  clear.
- Pressed states must not shift surrounding layout.
