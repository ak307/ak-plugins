# Motion — making the interface feel alive

Every project gets **rich, designed motion**: pages that flow into each other,
content that arrives with intent, controls that answer the hand, and one
memorable moment per main screen. A static page that works is not finished.

Motion is part of the identity. Its character comes from `DESIGN.md`
(crisp and mechanical, soft and settling, springy and playful …) and is used
the same way on every screen. What makes motion feel cheap is not the amount
of it — it's **generic, identical motion** (the same fade-up on everything)
and motion that makes people wait.

## 1. The layers — build all six

| Layer | What it means | Examples |
|---|---|---|
| **Navigation** | Moving between pages, tabs and steps feels continuous, never a hard cut | cross-fade with a slight slide; a list card expanding into its detail page (shared element); wizard steps sliding forward/back by direction |
| **Entrance** | A screen builds in a choreographed order the first time it appears | header, then key figures, then the list with a short stagger; a chart drawing its lines; numbers counting up to their value |
| **Scroll** (public pages) | Sections reveal and respond as they enter view | staggered reveal per section; a subtle parallax layer; a progress line that follows reading |
| **Micro-interactions** | Every control answers hover, press, focus, success and error | buttons that press in; toggles that slide with a small overshoot; a check mark that draws itself; a field that shakes once on error; a copied/saved confirmation that morphs from the button |
| **Layout changes** | Things that are added, removed, reordered, filtered, expanded or opened move to their new place instead of jumping | list items animating in and out; cards re-flowing on filter; accordions growing; modals and drawers opening from the element that was clicked |
| **Waiting** | Loading feels alive and shows the shape of what's coming | skeletons with a soft shimmer in the layout of the real content; progress that moves; optimistic updates that settle when the server answers |

Plus **one signature moment per main screen**, drawn from the project's world
and recorded in `DESIGN.md`: the occupancy gauge sweeping to today's value, a
ticket "printing" when a request is submitted, the approval stamp landing on
the claim. Make it excellent; it's what people remember.

## 2. Timing and feel

Record these as tokens in `DESIGN.md` and use them everywhere:

| Token | Typical value | For |
|---|---|---|
| `--duration-instant` | 100–150 ms | hover, press, focus, toggles |
| `--duration-quick` | 180–250 ms | menus, tooltips, list item in/out, tab content |
| `--duration-moderate` | 300–450 ms | page transitions, modals, drawers, layout re-flow |
| `--duration-expressive` | 500–900 ms | first-view entrance sequence, the signature moment |
| `--ease-out` | e.g. `cubic-bezier(0.22, 1, 0.36, 1)` | things arriving |
| `--ease-in-out` | e.g. `cubic-bezier(0.65, 0, 0.35, 1)` | things moving across the screen |
| spring | stiffness/damping per character | toggles, drag, playful identities |
| stagger | 30–60 ms per item, **max ~8 items** then the rest together | lists, card grids |

Things arriving ease out; things leaving are faster than things arriving;
nothing moves linearly except progress and shimmer.

## 3. Business apps: rich, but never in the way

Internal systems (dashboards, forms, approvals, lists) get the same rich
motion, tuned for people who use them all day:

- **Repeated actions stay fast:** anything a user does many times a day
  (saving, approving, switching tabs, filtering) uses `instant`/`quick`
  durations. The expressive entrance is for the first view of a screen, not
  every refresh, poll or filter.
- **Never block or delay the user:** content is clickable while it animates;
  no animation holds back data that has already loaded; no forced waits for
  an intro to finish.
- **Motion carries meaning:** a card moving to the "Approved" column, a
  number ticking to its new total, a row highlighting after it's saved — so
  the user sees *what changed*.
- **Large tables:** animate the container and the changed rows, not every
  row of a 200-row table.

Public pages (landing, marketing, kiosks) can go further: scroll-driven
storytelling, bigger entrances, ambient motion in the signature visual.

## 4. How to build it, per stack

Use the platform first; add a library when it clearly makes the motion
better or the code simpler. Write down the choice in `DESIGN.md`.

**Any web page (CSS):** transitions and `@keyframes` on `transform`,
`opacity`, `filter`, `clip-path`; tokens as CSS variables.

```css
:root {
  --duration-quick: 200ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
.reveal { opacity: 0; transform: translateY(12px); }
.reveal.is-visible {
  opacity: 1; transform: none;
  transition: opacity var(--duration-quick) var(--ease-out),
              transform var(--duration-quick) var(--ease-out);
  transition-delay: calc(var(--index, 0) * 40ms);
}
```

Reveal on scroll with `IntersectionObserver` (never a `scroll` event
listener), adding `is-visible` once and then disconnecting.

**Page transitions in multi-page apps** (Blade, Django templates, plain
HTML): cross-document view transitions — on both pages:

```css
@view-transition { navigation: auto; }
@keyframes fade-out { to { opacity: 0; } }
@keyframes fade-in-up { from { opacity: 0; transform: translateY(8px); } }
::view-transition-old(root) { animation: 160ms var(--ease-out) both fade-out; }
::view-transition-new(root) { animation: 260ms var(--ease-out) both fade-in-up; }
```

For a shared-element morph, give the clicked list card and the detail page's
header the same name — set inline per record (e.g. `style="view-transition-name:
claim-412"` on the card in the list and on the header of claim 412's page).
A name must be unique on each page. Browsers without support just navigate.
In-page changes: `document.startViewTransition(() => updateTheDom())`.

**React / Inertia:** the `motion` package (`npm i motion`, imports from
`motion/react`): `motion.div` with `initial`/`animate`/`exit`,
`AnimatePresence` for items leaving, `layout` for re-flow and shared
elements (`layoutId`), `whileHover`/`whileTap` for controls, `useInView` for
scroll reveals, `MotionConfig reducedMotion="user"` at the app root. Inertia
2+ page transitions: `<Link href="…" viewTransition>` or
`defaults.visitOptions` returning `{ viewTransition: true }` in
`createInertiaApp`.

```jsx
<MotionConfig reducedMotion="user">
  <AnimatePresence initial={false}>
    {claims.map((claim) => (
      <motion.li key={claim.id} layout
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
        <ClaimRow claim={claim} />
      </motion.li>
    ))}
  </AnimatePresence>
</MotionConfig>
```

**Laravel Livewire / Alpine:** Livewire 4's `wire:transition` animates
elements added, removed or changed by an update using native view
transitions (named regions styled with `::view-transition-*`; direction with
`#[Transition(type: 'forward')]`), and `wire:transition.navigate` animates
`wire:navigate` page visits. On Livewire 3, `wire:transition` is a simpler
Alpine-based show/hide — check the installed version. Alpine `x-transition`
(with enter/leave classes) for menus, modals and toasts. Respect the
installed version's docs over this summary.

**htmx (Django and others):** `hx-swap="innerHTML transition:true"` or
`htmx.config.globalViewTransitions = true`, plus the view-transition CSS
above; `htmx-added` / `htmx-settling` classes for item-level motion.

**Vanilla JS for richer sequences:** `motion` (`import { animate, inView,
stagger } from "motion"`) — e.g. `animate(".kpi", { opacity: [0, 1], y: [12,
0] }, { delay: stagger(0.05) })`, or number count-ups. Prefer it over GSAP;
use GSAP or Lottie only for a signature moment that truly needs a timeline or
a designer-made animation, and say why in `DESIGN.md`.

**Flutter:** implicit animations first (`AnimatedContainer`,
`AnimatedOpacity`, `AnimatedSwitcher`, `AnimatedList`, `TweenAnimationBuilder`),
`Hero` for shared elements, custom route transitions (`PageRouteBuilder`, or
`CustomTransitionPage` with go_router), explicit `AnimationController` for
the signature moment. `flutter_animate` (`flutter pub add flutter_animate`)
for readable entrance sequences: `.animate().fadeIn(duration: 250.ms)
.slideY(begin: 0.1)` with `interval` for stagger. Reduced motion:
`MediaQuery.disableAnimationsOf(context)` → shorten or skip.

## 5. Performance and accessibility (hard rules)

- Animate `transform`, `opacity`, `filter`, `clip-path`; never `width`,
  `height`, `top`, `left`, `margin` (use `layout` animations / FLIP instead).
- No layout shift: space for animated content is reserved before it arrives.
- `will-change` only on elements about to animate, removed afterwards.
- Smooth on a mid-range phone; nothing animates off-screen; ambient loops
  pause when not visible.
- **Reduced motion:** when the user asks for it (`prefers-reduced-motion:
  reduce`, `MotionConfig reducedMotion="user"`, Flutter
  `disableAnimationsOf`), replace movement with a quick fade or an instant
  change — the interface still works and still shows what changed.
- No flashing more than three times a second.
- Focus moves correctly after animated navigation, modals and drawers, and
  never lands on an element that is still hidden.

## 6. Check it

`arkar-frontend-qa` checks that the motion actually runs in a real browser,
stays quick on repeated actions, and respects reduced motion. Don't claim
an animation works without seeing it run.
