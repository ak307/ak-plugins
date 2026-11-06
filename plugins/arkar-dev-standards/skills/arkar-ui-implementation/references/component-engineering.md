# Component engineering

## Structure

- Small and focused: one component, one job its name describes. Split when a
  render function no longer fits on a screen or a subtree repeats.
- Name by role (`ClaimStatusBadge`, `LeaveBalanceCard`), not appearance.
- Composition over configuration: slots/children rather than a boolean prop
  for every variation.
- Presentation separate from data: components receive data and callbacks;
  fetching, business rules and formatting of domain data live in hooks,
  composables, loaders, Inertia props, notifiers/ViewModels or the backend.

## State

- Model UI states explicitly: a status union/enum (`idle | loading | empty |
  error | success`), `AsyncValue` in Flutter — not inferred from
  `data && !error`.
- Keep state as local as possible; lift only what's shared; derive instead
  of duplicating.
- Server state through the project's data layer (TanStack Query, SWR,
  Inertia props, Livewire properties), with loading and error states wired to
  the skeleton and error components.
- Forms: one source of truth per form; validation schema shared with the
  backend where the stack allows; never lose input on error.

## Markup

- Semantic elements (`button`, `a`, `nav`, `main`, `label`, `table`) and
  correct heading order; accessible names for icon-only controls.
- Interactive elements are real controls — no clickable `div`s.
- Visible focus; keyboard handlers for custom widgets (or a headless
  accessible library).

## Styling

- Semantic tokens only (CSS variables, Tailwind theme, `ThemeData`); no raw
  hex, one-off pixel values or arbitrary Tailwind values.
- Motion through the motion tokens; reduced motion handled once (global
  media query, `MotionConfig`, `disableAnimationsOf`), not per component.
- Reserve space for async content (`aspect-ratio`, min-heights, skeletons).

## Reuse

- Shared skeleton, empty, error and loading components across screens.
- Before writing a new component, search for an existing one that does the
  job; extend it with a variant instead of duplicating.
