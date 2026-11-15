# Component guidelines

## States every interactive component has

| Component | States |
|---|---|
| Button / icon button | default, hover, focus-visible, pressed, disabled (with reason where possible), loading |
| Input / select / textarea | empty, filled, focus, error (with message), disabled, read-only |
| Checkbox / radio / toggle | off, on, (indeterminate), focus, disabled |
| Link | default, hover, focus-visible, visited where useful |
| Menu / dropdown / popover | closed, open, item hover/focus, selected |
| Tabs / segmented control | selected, unselected, focus, disabled |
| Dialog / drawer / sheet | opening, open (focus trapped), closing, focus returned |
| List / table row | default, hover, selected, focus, updated (briefly highlighted) |
| Navigation item | default, hover, current, focus |
| Toast / alert | info, success, warning, error; entering, dismissing |

## Variants

- A small, named set per component (e.g. button: primary, secondary,
  ghost, danger; sizes sm/md/lg) — not a variant per screen.
- Variants change tokens, not structure.
- One icon family, one stroke width; icon buttons have accessible names.

## Abstraction

- Extract a component when a pattern repeats (three times) or a render
  function no longer fits on a screen; name by role (`LeaveBalanceCard`),
  not appearance (`BlueBox`).
- Don't build a generic mega-component with dozens of props for one use.
- Presentation separate from data: components take data and callbacks;
  fetching and business rules live in hooks, loaders, props or the backend.
- Shared empty, error, loading (skeleton) components, reused everywhere.

## Component libraries

- Reuse the library the project already has for behaviour and accessibility
  (shadcn/ui and Radix, Headless UI, Filament, Livewire Flux, Material,
  Flutter Material/Cupertino, Compose Material 3). Don't add a second one.
- Restyle it through the project's tokens; never ship the library's default
  look as the design.
- For accessible behaviour of custom widgets (menus, comboboxes, dialogs),
  prefer a headless library the project has (e.g. Radix) over hand-rolled
  ARIA.

## Clickable things look clickable

Pointer cursor on web, a hover state, a visible focus ring, a pressed state
that doesn't shift layout; disabled is visibly different (and explains why
when possible).
