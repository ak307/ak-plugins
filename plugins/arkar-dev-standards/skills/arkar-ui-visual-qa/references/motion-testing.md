# Motion testing

Don't claim an animation works without seeing it run.

## How

- **Screenshot script:** `--motion` — counts animations on load and while
  scrolling (CSS transitions, CSS animations and Web Animations, which Motion
  uses), saves a mid-entrance frame to look at, re-runs with
  `reducedMotion: "reduce"`, and lists text left invisible (a reveal that
  never fired). It doesn't see interactions.
- **Filmstrips (look at the motion):** `scripts/interaction-probe.cjs`
  films the first load and every safe click; `scripts/film.cjs` films the
  flows you name (`click=`, `hover=`, `press=`, `type=`, `wait=` steps,
  `--span=3000` for longer sequences, `--reduced` with reduced motion).
  Animations **and** page timers are slowed 5× while filming, so each frame
  is labelled with its real time. Open every strip and judge it against the
  table below — the counts alone never tell you whether motion feels
  premium.
- **Interactions:** with Claude in Chrome or Playwright, trigger the motion
  (open the dialog, move the card, filter the list) and check
  `document.getAnimations()` while it runs; take a screenshot mid-transition
  when the look matters.
- **Reduced motion:** emulate it (Playwright `reducedMotion: "reduce"`,
  DevTools rendering panel) and repeat the key interactions.
- **Mobile:** run on an emulator/device; toggle the system "remove
  animations"/Reduce Motion setting and check the app still works.

## The six motion areas — test the ones the product has

Judge each by eye on film and video, and measure it with
`scripts/motion-metrics.cjs` (real interactions):

1. **Micro-interactions** — press, hover, focus, toggles, input focus,
   validation feedback, dropdowns, tooltips: response ≤ 100 ms, 100–200 ms,
   nothing instant where a state changes, focus always visible.
2. **Transitions** — screens, dialogs and sheets, shared elements,
   expanding cards, navigation: each change shows where things came from
   and went; enter and exit both designed; 200–400 ms; no pop-in or vanish.
3. **Transactions** — submit, processing, success, failure, balance or
   count updates, the new item arriving in history, confirmation: the busy
   state appears at once and holds the button's size; success and failure
   are distinct moments; numbers count to their new value; the new item
   slides into place, not appears.
4. **Loading and async** — skeleton to content (crossfade, no layout
   jump), progress, slow responses (`?latency=slow`), optimistic updates
   and their rollback, cancel, retry.
5. **Data and layout** — charts, counters, sort, filter, insert, delete,
   reorder, expand: items move to their new place (FLIP or layout
   animation) instead of re-rendering in place; no layout shift.
6. **Gesture and physics** — swipe, drag, pull to refresh, scroll,
   springs, momentum: follows the finger, can be interrupted and reversed
   mid-way (`<step>@<ms>`) without a snap, settles naturally.

Every area: interruptible without jumps; `--reduced` replaces movement
with fades or instant changes; nothing moves just to decorate.

## Check against the motion acceptance criteria

| Criterion | Look for |
|---|---|
| Purpose | each animation explains something; nothing decorative on business screens |
| Natural movement | eases/springs, no linear slides, no abrupt stops, no wobble |
| Spatial continuity | things move from where they were; shared elements connect |
| Timing | frequent interactions quick (≈100–200 ms); first-view sequence within ~1 s; nothing to wait for |
| Easing | arriving decelerates, leaving is quicker |
| Consistency | the same change moves the same way on every screen; tokens from `DESIGN.md` |
| Responsiveness | input works during animations; interruptions reverse smoothly |
| Performance | no jank; transforms/opacity; nothing animating off-screen; loops paused when hidden |
| Accessibility | reduced motion respected; nothing flashes; no content stuck invisible |
| Platform | matches the platform's conventions (iOS, Android, web) |

## Defects

- Content hidden until an animation finishes, or stuck invisible.
- Scroll-jacking, auto-advancing carousels, looping attention-grabbers.
- Layout shift caused by animation; animating `width`/`top`.
- Fake progress or fake AI activity.
- A new or redesigned screen with no motion where the motion language calls
  for it; or motion far above the level the task needs.
