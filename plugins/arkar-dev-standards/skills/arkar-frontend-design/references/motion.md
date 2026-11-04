# Motion — invented for each project

Every project gets **rich, designed motion** that makes it feel alive,
interactive and beautiful. A static page that works is not finished.

This file deliberately contains **no motion recipes**. What moves, how, when
and in what order is a design decision you make fresh for each project, the
same way you choose its palette and type. A fixed pattern applied everywhere
would make every product feel the same. What stays fixed is the **quality
bar** and the **limits** below.

## 1. Invent the motion from the project

Motion grows out of the identity in `DESIGN.md`:

- **Ask what movement means in this project's world.** How do the real
  things it represents behave — weight, speed, rhythm, material? How should
  the users feel while they work: calm, quick, confident, delighted? Let that
  set the motion's character and its vocabulary.
- **Explore it with the directions.** Each design direction you consider
  (see `creative-process.md`) has its own motion idea. Choose it together
  with the rest of the direction.
- **Decide, for this project, how it handles each moment** — and leave a
  moment still when that serves it better:
  - moving between screens, tabs and steps;
  - a screen arriving for the first time;
  - answering what the user does (hover, press, focus, success, error);
  - things appearing, disappearing, moving, re-ordering, expanding;
  - waiting for data or an action;
  - the one moment per main screen that people remember.
- **Check against defaults:** if the motion you planned would fit any project
  — or is what you used last time — it's a default, not a decision. Rethink
  it from the project's world.
- **Record it in `DESIGN.md`:** the motion concept in a sentence, the timing
  and easing tokens you defined, how each moment above is handled, the
  signature moments, the tools, and what reduced motion does.

## 2. The quality bar: beautiful, premium, professional

Rich means *complete and considered*, never *busy*. Whatever the concept,
the motion must feel like a top-tier product:

- **Purposeful:** every animation helps the user understand something —
  where they are, what changed, what's happening, what they can do.
- **Refined:** restrained distances, smooth easing, no hard stops; physics
  (if used) well damped.
- **Choreographed:** a clear lead and a considered order; things that belong
  together move together; never several unrelated things competing.
- **Spatially consistent:** the same kind of change always moves the same
  way, and motion reflects where things come from and go.
- **Still at rest:** once a screen has arrived, it settles. Any ambient
  motion is slow, small, and paused when not visible.
- **One system:** the same tokens and character on every screen.

## 3. Limits — never confusing or annoying

- Never hold content back: data appears as soon as it loads, reveals are
  brief and start as soon as the element is visible, nothing waits for an
  intro.
- Never take control from the user: no scroll-jacking (changing scroll speed
  or direction, forced snapping, pinned sections that can't be passed
  quickly), no stealing focus, no moving or shifting a target while it's
  being pointed at.
- Nothing moves on its own while people read or work (auto-advancing
  carousels, pulsing or looping attention-grabbers) unless it carries live
  information they need.
- No gimmicks that draw attention to themselves rather than the content.
- **Everyday screens** (anything people use many times a day): interactions
  answer instantly and stay quick; the first-view moment doesn't replay on
  every visit, refresh, poll or filter; a large list or table animates what
  changed, not every row.
- A first-view sequence finishes within about a second in total.
- **The fiftieth-time test:** imagine seeing each animation for the fiftieth
  time today. If it would feel slow, distracting or unclear, make it shorter,
  smaller, or remove it.

## 4. Hard rules: performance and accessibility

- Animate compositor-friendly properties (`transform`, `opacity`, `filter`,
  `clip-path`), not `width`, `height`, `top`, `left` or margins. Reserve
  space so nothing shifts.
- Smooth on a mid-range phone; nothing animates off-screen; `will-change`
  only briefly.
- **Reduced motion** (`prefers-reduced-motion`, Flutter
  `MediaQuery.disableAnimationsOf`): movement becomes a quick fade or an
  instant change; the interface still works and still shows what changed;
  nothing that starts hidden for an animation stays hidden.
- No flashing more than three times a second.
- Focus lands correctly after animated navigation, dialogs and drawers.

## 5. Tools — choose what fits the stack and the idea

Prefer what the platform already offers; add a library when it clearly makes
the motion better or the code simpler, and note the choice in `DESIGN.md`.
These are options, not a default:

- **Web platform:** CSS transitions and keyframes; the View Transitions API
  (`document.startViewTransition`, and `@view-transition { navigation: auto; }`
  for multi-page apps — shared elements via matching `view-transition-name`,
  unique on each page); `IntersectionObserver` for anything tied to
  visibility (never `scroll` listeners).
- **`motion`** (npm `motion`): `motion/react` for React/Inertia (including
  layout and exit animations, and `MotionConfig reducedMotion="user"`), or
  the plain `motion` package for vanilla JS.
- **Inertia 2+:** `viewTransition` on `Link` and visits, or as a default in
  `createInertiaApp`.
- **Livewire:** the version matters — in Livewire 4, `wire:transition` uses
  native view transitions (`.navigate` for `wire:navigate` visits); in
  Livewire 3 it is a simpler Alpine-based show/hide. Alpine `x-transition`
  for small show/hide. Follow the installed version's docs.
- **htmx:** view-transition swaps (`transition:true`,
  `htmx.config.globalViewTransitions`) and its settle classes.
- **Flutter:** implicit animations, `Hero`, custom route transitions,
  explicit `AnimationController`s, or `flutter_animate`.
- **GSAP / Lottie:** only when a signature moment truly needs a timeline or a
  designer-made animation.

## 6. Check it

`arkar-frontend-qa` checks that the motion actually runs in a real browser,
stays quick on everyday actions, and respects reduced motion. Don't claim an
animation works without seeing it run.
