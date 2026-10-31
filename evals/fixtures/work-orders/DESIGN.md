# Design identity — Work Orders dashboard

## Concept
Night Elevation: the six buildings are drawn as lit facades after dark. Every
lit window is an open work order, and a red window is an overdue one, so a
supervisor sees which building is in trouble before reading a single number.

Users and setting: facilities supervisors at a desk (two-monitor or laptop),
sometimes checking on a phone while walking the site.
Target screens: phone 375×812, tablet 768×1024, desktop 1440×900.
Primary job: see what is overdue and who is overloaded, then narrow to one building.
Tone: calm, precise, after-hours.

## Colour
| Token | Value | Use |
|---|---|---|
| --color-bg | #E4E9ED | page background (concrete) |
| --color-surface | #F6F8FA | panels, table |
| --color-facade | #15232F | building facades, header band |
| --color-window-off | #263A4C | window with no open order |
| --color-window-lit | #F3C65A | window = open order |
| --color-window-overdue | #FF5C49 | window = overdue order |
| --color-ink | #101B25 | main text |
| --color-ink-muted | #4A5A68 | secondary text |
| --color-primary | #0B6A8A | selected filter, focus ring |
| --color-overdue | #B3261E | overdue text/marks on light surfaces |
| --color-warning | #8A5A00 | due soon text on light surfaces |
| --color-ok | #1D6B4A | on-track text |

## Type
- Display: Barlow Semi Condensed 600/700 — signage lettering, fits a facilities world.
- Text: IBM Plex Sans 400/500/600, tabular numbers for dates and counts.
- Scale: 14 / 15 / 17 / 22 / 32 / 44
- Fonts are bundled in `fonts/` (not linked from Google).

## Shape, space and depth
- Radius: 2px on windows, 6px on panels and chips, 999px on pills.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48
- Elevation: none; panels are separated by 1px borders. Facades are flat dark.
- Grid: 12-column on desktop, 24px gutters; single column on phone.

## Signature elements
- Building elevations (index.html `#building-strip`): SVG facades whose windows
  are the open orders. They are also the building filter.
- Workload bars: one segment per open order, capacity tick, overflow hatched.

## Motion
Crisp, 150ms. One orchestrated moment: windows switch on in a quick stagger on
load. Disabled under `prefers-reduced-motion`.

## Voice
Plain site language. Empty state: "No work orders match. Clear a filter to see
the rest."

## Deliberate deviations from the QA checklist
None.

## Directions considered
- Dispatch Board: dark split-flap departures board, mono type. Good for a
  control room, but harder to read as a dense table and less about buildings.
- Floor Plan: blueprint-blue map with pins. Needs real floor plans we don't have.
