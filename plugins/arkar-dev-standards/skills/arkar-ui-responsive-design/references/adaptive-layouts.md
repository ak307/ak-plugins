# Adaptive layouts

How common elements re-compose across sizes.

| Element | Phone | Tablet | Desktop |
|---|---|---|---|
| Primary navigation (by the number of destinations — `arkar-ui-ux-engineering/references/navigation-and-header.md`) | a bottom bar for the top 3–5 destinations and "More"; the top keeps only the context | collapsible rail | tabs in the header for 2–5, a side rail for more; none for a single-purpose tool |
| What stays pinned | 15% of the height or less, top and bottom together, inside the safe areas | | 64 px or less at the top; one band |
| Secondary navigation / filters | sheet or drawer, active filters as chips | side panel or drawer | persistent side panel |
| Tables | priority columns as cards, or the table scrolling inside its own container with the key column sticky | fewer columns, horizontal scroll if needed | full table, sticky header |
| Dashboards | key numbers first, one chart per row, details on tap | 2-column grid | multi-column grid, details beside |
| Forms | one column, sticky submit | one column, constrained width | one column (rarely two for short related fields), constrained width |
| List → detail | separate screens with a back transition | split view in landscape | split view (master–detail) |
| Dialogs | full-screen sheet or bottom sheet | centred dialog | centred dialog |
| Wide content (code, charts) | own horizontal scroll, never the page | | |
| Hero / marketing sections | message and call to action first, imagery cropped for the small frame | | full composition |

## Orientation

- Phones in landscape: keep critical actions visible; nothing stays
  pinned that eats the short height — the context bar unpins or shrinks.
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
