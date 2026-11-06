# Motion testing

Don't claim an animation works without seeing it run.

## How

- **Screenshot script:** `--motion` — counts animations on load and while
  scrolling (CSS transitions, CSS animations and Web Animations, which Motion
  uses), saves a mid-entrance frame to look at, re-runs with
  `reducedMotion: "reduce"`, and lists text left invisible (a reveal that
  never fired). It doesn't see interactions.
- **Interactions:** with Claude in Chrome or Playwright, trigger the motion
  (open the dialog, move the card, filter the list) and check
  `document.getAnimations()` while it runs; take a screenshot mid-transition
  when the look matters.
- **Reduced motion:** emulate it (Playwright `reducedMotion: "reduce"`,
  DevTools rendering panel) and repeat the key interactions.
- **Mobile:** run on an emulator/device; toggle the system "remove
  animations"/Reduce Motion setting and check the app still works.

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
