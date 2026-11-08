# Skeleton loading and progress

## When to use what

| Wait | Use |
|---|---|
| < ~300 ms | nothing (avoid a flash of loading UI); delay showing indicators ~200–300 ms |
| Content area loading (page, card, table, chart, profile, feed) | a **content-aware skeleton** |
| A user action (save, submit, send) | inline indicator on the control (button spinner/label change), not a page overlay |
| Known duration or measurable progress (upload, export, import) | **determinate** progress with real values and a cancel where possible |
| Unknown duration | indeterminate indicator with a specific label ("Checking availability…"); switch to determinate once progress is known |

Never fake percentages, never show progress where nothing is happening, and
don't block the whole page when only part of it is loading.

## Mock data and prototypes

When data is mocked or the backend is simulated, still design and show the
loading states: simulate realistic latency (a few hundred milliseconds to a
couple of seconds) for initial loads, history, search and results, and show
the skeletons and progress the real product will need. Instant mock data
hides the states users will actually see.

## Content-aware skeletons

- Mirror the real layout: same grid, same component dimensions, the same
  number of rows the real content usually has (or that fit the viewport).
- Shapes for the real elements: text lines of realistic, varied widths;
  avatars as circles; images with the real `aspect-ratio`; chart areas with
  axes; table rows with the real columns.
- Reserve exact space so nothing shifts when content arrives (CLS).
- Built as **reusable components** from the design system (skeleton text,
  block, avatar, table row, card, chart), using surface tokens so they work
  in every theme.

| Type | Shape it after |
|---|---|
| Page | header + the main region's real blocks; navigation stays real (not skeleton) |
| Dashboard | the KPI row, chart frames with axes, the table header + a few rows |
| Card | the card's real media ratio, title line, two text lines, action area |
| Table | real column headers (text, not skeleton), rows with column-width bars; numeric columns right-aligned |
| Image | a block at the image's `aspect-ratio`, optionally the dominant colour/blur-up |
| Avatar | a circle at the real size, with name lines beside it |
| Chart | the axes and gridlines drawn, the plot area empty or a faint baseline — never a fake chart line |
| AI response | a short "waiting" line until the first tokens, then real streamed text (see `ai-interaction-motion.md`) |
| Profile | avatar, name, role lines, the real section headings |
| Mobile screen | the app bar and tab bar real; list rows at the platform's row height |

## Shimmer

- Refined and slow: a soft, low-contrast highlight sweeping ~1.2–2 s, linear,
  across the whole skeleton group (one gradient, not one per element).
- Or a gentle opacity pulse when shimmer doesn't suit the direction.
- Reduced motion: static skeleton, no shimmer.
- Stop animating skeletons that are off-screen.

## Into real content

- Cross-fade skeleton → content quickly (~150–250 ms); don't slide content
  in from elsewhere.
- Progressive rendering: show what's ready first (header, then the list as
  it streams) instead of waiting for everything.
- Keep the scroll position and focus stable when content replaces the
  skeleton.
- Errors replace the skeleton with the error state in the same space.

## AI responses

A short "waiting" state until the first tokens, then stream real text
(see `ai-interaction-motion.md`) — no long fake skeleton paragraphs.
