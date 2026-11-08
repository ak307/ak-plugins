# Adaptive layouts

How common elements re-compose across sizes.

| Element | Phone | Tablet | Desktop |
|---|---|---|---|
| Primary navigation | top bar + menu, or bottom bar (3–5 destinations) | collapsible sidebar or rail | persistent sidebar or top navigation |
| Secondary navigation / filters | sheet or drawer, active filters as chips | side panel or drawer | persistent side panel |
| Tables | priority columns as cards, or the table scrolling inside its own container with the key column sticky | fewer columns, horizontal scroll if needed | full table, sticky header |
| Dashboards | key numbers first, one chart per row, details on tap | 2-column grid | multi-column grid, details beside |
| Forms | one column, sticky submit | one column, constrained width | one column (rarely two for short related fields), constrained width |
| List → detail | separate screens with a back transition | split view in landscape | split view (master–detail) |
| Dialogs | full-screen sheet or bottom sheet | centred dialog | centred dialog |
| Wide content (code, charts) | own horizontal scroll, never the page | | |
| Hero / marketing sections | message and call to action first, imagery cropped for the small frame | | full composition |

## Orientation

- Phones in landscape: keep critical actions visible; avoid fixed headers
  that eat the short height.
- Tablets: design both portrait and landscape when the app supports them;
  split views shine in landscape.

## Animation per size

- Smaller travel distances and shorter durations on phones.
- Drawers and sheets follow the finger on touch.
- Shared-element transitions where they clarify navigation between list and
  detail on phones.
- Reduce simultaneous animations and effects on small/low-power devices.

## Large and ultra-wide screens

Content max-widths or deliberate multi-column layouts; nothing stretched
edge to edge without purpose; type that doesn't become tiny relative to the
canvas.
