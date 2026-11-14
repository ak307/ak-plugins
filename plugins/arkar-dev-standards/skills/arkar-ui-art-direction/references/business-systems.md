# Premium business systems

AK's main work is business software: dashboards, management systems,
workflow applications and operational tools used all day by staff. Premium
here means what Linear, Stripe's dashboard or a well-made operations
console feel like: fast, calm, dense without clutter, and obviously made
for *this* job. These are principles to compose from, not a layout to copy
— every system still gets its own composition from its users and data.

## What makes a business screen premium

1. **It answers the user's first question in a sentence.** The top of the
   screen states the situation ("6 work orders are overdue — 4 at Harbour
   Tower"), with the one to three numbers that matter set large and the
   rest as a quiet ledger. Never a grid of equal KPI tiles.
2. **Rows that read at a glance.** Lists and tables carry their meaning
   visually: status tracks, inline bars, sparklines, SLA countdowns, avatars,
   relative-size marks, a mini timeline — aligned on a strong grid with
   tabular figures. A row is a designed object, not spreadsheet cells.
3. **Work happens in place.** Select a row → its detail opens beside it (a
   panel that keeps the list in view) or grows from it; edit inline; act on
   many at once with a bulk bar that appears where the selection is.
   Destructive actions confirm with what will happen and offer undo.
   **The detail is where the work is done, so it is the most designed
   surface, not the plainest:** the same identity as the list, a hero for
   the decision it serves (the amount against its budget and history, the
   journey as a track with "you are here", the deadline as a countdown),
   and the action bar designed as the moment of decision. A detail that
   reads like a printed form or invoice fails, however tidy. Calm means no
   noise — never plain.
4. **Built for the fiftieth hour, not the first minute.** Keyboard
   shortcuts and a command palette for frequent actions, saved views and
   filters that persist, density that suits daily users (compact rows,
   readable 14px minimum), no decorative motion — feedback motion only,
   short and spatial.
5. **Status is a system.** One semantic colour language (critical, warning,
   on track, done, inactive) used identically in chips, rows, charts and
   the summary, always paired with an icon or label — never colour alone.
6. **Character without noise.** A distinctive type pairing and a palette
   with conviction (one confident accent plus the status colours, a deep
   surface for the hero area or navigation, light working surfaces), crafted
   headers and empty states. Bland white-and-grey admin is a failure; so is
   a marketing-style page pretending to be a tool.
7. **Every state is designed:** first run, loading (content-shaped
   skeletons), empty (with the next action), no results, error with retry,
   partial data, permission denied, long-running work with progress and
   cancel.
8. **Each page composed for its job.** An overview is a briefing, a list is
   a triage surface, a detail is a record with its history, a schedule is a
   time grid, a report is a story with charts — one design language, never
   the same banner-plus-table skeleton re-filled on every page.
9. **Dense, not crammed — focus first, everything on demand.** Lead with
   the screen's job (the 44 gaps to fill, the 6 overdue jobs), not with
   every cell at once. Show the whole picture at a glanceable level (a
   heat strip, a summary per site) and open the full detail for the one
   place being worked on. Each number appears once in the main view (not in
   the header pills, the hero and a side tile). Marks must carry meaning on
   their own — a wall of initials or icons that needs a legend and hover to
   decode is noise. AK judged a complete but tightly packed rostering grid
   "too complex, information too tight".
10. **Phones get the field version.** Staff on site need the top actions and
   the record they're standing at, not a squeezed desktop table: cards with
   the two or three fields that matter, big targets, the key panel kept.

## Liquid Glass is AK's default material for business systems

AK consistently prefers Apple's Liquid Glass. He rated a glass operations
map "premium" and asked for glass on a solid-surfaced system he otherwise
called "mostly premium". So, unless the product's brand or context argues
against it (record why in DESIGN.md), his business systems use Liquid
Glass (`arkar-ui-design-system/references/materials-glass.md`):

- glass for the whole floating layer: the sidebar, toolbars and filter
  bars, tab bars, bulk-action bars, detail sheets and side panels,
  popovers, menus, the command palette, toasts — and the header, which is
  plain page at rest and frosted glass once content scrolls under it;
- floating glass content panels wherever the screen has a visual canvas
  (a site map, skyline, floor plan, schedule or time grid, a hero chart):
  the canvas fills the space and the queue, alerts or crew float over it;
- a rich, deep background beneath (gradient field, the canvas itself), so
  the glass has something to refract — glass over flat white is grey;
- working surfaces people read for long — dense tables, forms, long text
  — stay solid, or sit on a strongly tinted glass panel that reads as solid.

Legibility, reduced-transparency and no-backdrop-filter fallbacks are not
optional.

**Build it with the material kit:** copy
`arkar-ui-design-system/assets/liquid-glass.css` and use its surfaces —
`.lg-bar` (sidebar, tab and filter bars floating over a canvas),
`.lg-scroll-edge` or `.lg-cap` (whatever stays at the top while the page
scrolls), `.lg-panel` (floating content over a canvas), `.lg-sheet` (detail
sheets, dialogs), `.lg-control` and `.lg-segmented` (controls and tabs on
glass, with a sliding indicator), `.lg-pill` — over `.lg-field` or the
product's real canvas, themed through its tokens. The kit is a material,
not a layout: what the navigation is and what the header holds are
designed for each product
(`arkar-ui-ux-engineering/references/navigation-and-header.md`) — the
same floating bar on every product is the template look in glass. AK looked at a rebuild with one glass panel
and a solid sidebar and top bar and said "it is not using Liquid Glass":
the whole floating layer must visibly be glass, not one card.

## Every view behind a tab is designed — and the tabs themselves

AK judged an approvals queue "not bad, but the design inside the tab is
too simple and boring — not innovative". He means the view that appears
when a tab, segment or navigation item is clicked ("Sent back",
"Decided", "My requests", "History", a settings page, a widget's other
mode): builds pour their ideas into the first view and fill every other
view with the same plain list. Every reachable view is composed for its
own job with the same ambition as the first: "Decided" might be a
timeline of what you approved this week with amounts adding up; "Sent
back" a set of cards showing what each requester must fix and how long
they've had; "My requests" each request travelling along its route.
Rows inside any view are rich objects that show their meaning visually,
details are designed records, and each view's main action has its own
moment.

The tab controls are designed too (AK: "of course the tab background is
also simple"): a crafted segmented control or tab bar — glass where
Liquid Glass is used — with counts, a selection indicator that slides to
the chosen tab, and the content changing with spatial continuity, not a
row of plain text links with an underline.

When the critic reviews, it is shown every tab's view and scores each as
its own section.

## Materials and motion in business tools

Glass follows the default above: the whole floating layer is glass, plus
floating content panels when the screen is built around a visual canvas
such as a site map or floor plan. Tables, forms and working grids stay
solid for legibility. The signature motion moment is tied to the core
action — a work order sliding into "Done", an approval stamping, a roster
gap filling as an officer is assigned — fast enough to enjoy the fiftieth
time.
