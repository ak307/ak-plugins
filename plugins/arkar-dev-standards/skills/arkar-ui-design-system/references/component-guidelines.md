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

## A component is a template

**The component defines how it looks and behaves. The product defines what
it says, what it does and when it appears.** A dialog, toast, picker or
empty state written with its wording, its two buttons or its width fixed
inside is a one-off, not a component.

| Decided by the product — never fixed in a component | How |
|---|---|
| Titles, messages, button labels, placeholders, names for screen readers | passed in, or from the message catalogue — a component holds no wording of its own, including its "small" words (Cancel, Try again, No matches, Saving…) |
| How many actions, what each does, which is primary or destructive | a list of actions with values or callbacks |
| Icons | named, from one configurable icon set |
| Whether it is critical, and when it appears | an option set by the caller — the component never decides severity |
| Language: wording, dates, numbers, plurals, first day of the week, digits, direction | the locale and the catalogue; logical properties so right-to-left needs no second stylesheet |
| Colour, radius, blur and opacity, width and spacing, light and dark | design tokens — sizes as a few named steps (small, medium, large), not a free number per call |
| Motion durations and curves | motion tokens, shared by CSS and script |

| Fixed inside the component — not configurable | Why |
|---|---|
| Success shown only after the server confirms; one press, one request; errors stay until dealt with | trust: a caller must not be able to switch these off |
| Focus handling, keyboard behaviour, roles and names; focus never starts on a destructive action | accessibility is part of the component, not an option |
| Reduced motion, reduced transparency, more contrast | the user's settings outrank the product's |
| Floors under the readability tokens (opacity of glass and solid surfaces, dimming, minimum sizes) | a theme can restyle, but can't make text unreadable |

Fewer knobs in tiers: tokens for the system, a handful of named variants
per component, per-call options only for content and actions. A test
proves it: replace every label and assert that none of the default
language is left anywhere a user reads or hears it.

Web builds get this from the working-surface kit: `configure({ locale,
labels, icons, calendar, digits })`, `dialog({ title, message, actions,
critical, icon, size })`, the `--ws-*` tokens, `plural()` and `number()`.

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
