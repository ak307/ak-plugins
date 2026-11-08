# Interaction testing

Try what users will do — focused on the scope of the change.

## Every changed control

- Hover, focus (keyboard), press, disabled, loading states look right.
- Clicking does what it says; feedback within ~100 ms.

## Forms

- Submit valid data → success state and next step.
- Submit invalid/empty data → messages next to the fields, focus moves to
  the first error, input kept.
- Double-click submit → only one submission.
- Server error (if it can be simulated locally) → message, input kept.

## Navigation and overlays

- Tab through the page: logical order, visible focus, nothing hidden behind
  sticky bars.
- Open/close menus, dialogs and drawers with mouse and keyboard; Escape
  closes; focus returns to the trigger.
- Browser back/forward and deep links work.

## States

- Trigger empty, loading (throttle the network or delay the mock), error and
  long-content states where possible.
- Destructive actions: confirmation names the thing, or undo works.

## Data views

- Sort, filter, search, paginate; returning from a detail view keeps them.
- Live updates don't move what the user is reading or about to click.

## AI interfaces

- Send a message: waiting → tool/status → streaming → completed, each shown
  truthfully; Stop works immediately; failure shows retry and keeps partial
  output; scrolling up while streaming isn't yanked down.

## Accessibility pass

- Keyboard-only run of the main flow.
- Automated check if available (`@axe-core/playwright`, Lighthouse).
- Screen reader spot-check when a reader is available; otherwise say it
  wasn't done.
