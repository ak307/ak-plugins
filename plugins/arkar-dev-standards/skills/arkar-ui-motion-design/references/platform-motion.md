# Platform motion — tools and performance

Use what the project already has; prefer the platform's own capabilities;
add a library only when it clearly improves the motion or simplifies the
code, and record the choice in `DESIGN.md`. Check the installed version's
docs before relying on an API.

## Web platform

- **CSS transitions and `@keyframes`** for most level 1–2 motion; motion
  tokens as CSS variables.
- **`@starting-style`** for entry animations of elements appearing (dialogs,
  popovers) where supported; `transition-behavior: allow-discrete` for
  animating `display`.
- **View Transitions API** — same-document (`document.startViewTransition`)
  is in Chrome, Safari 18+ and Firefox 144+; cross-document
  (`@view-transition { navigation: auto; }`) in Chrome 126+ and Safari 18.2+,
  not Firefox — treat it as progressive enhancement. Shared elements via
  matching `view-transition-name` (unique on each page).
- **Web Animations API** (`element.animate`) for scripted sequences and
  interruptible animations.
- **`IntersectionObserver`** for anything tied to visibility (never `scroll`
  listeners); scroll-driven animations (`animation-timeline: view()`) as an
  enhancement.
- Reduced motion: `@media (prefers-reduced-motion: reduce)`.

## React and Next.js

- **Motion** (`motion` package, v14; `import { motion, AnimatePresence } from
  "motion/react"`): `initial`/`animate`/`exit`, `AnimatePresence` for exits,
  `layout` and `layoutId` for re-flow and shared elements, `whileHover`/
  `whileTap`, springs via `type: "spring"` with `visualDuration` + `bounce`
  (or stiffness/damping/mass), `MotionConfig reducedMotion="user"` at the
  root (disables transform/layout animation, keeps opacity/colour),
  `useReducedMotion()` for custom cases.
- CSS for simple hover/press states; Motion where exits, layout or gestures
  matter. Don't animate with React state per frame.
- Next.js App Router: view transitions or Motion for route changes; keep
  server components server-side (motion components are client components).

## Vue / Nuxt, Svelte / SvelteKit, Angular, Astro

- **Vue 3:** `<Transition>` (name, mode, appear) and `<TransitionGroup>`
  (keyed children, move class for FLIP); Nuxt page/layout transitions.
- **Svelte 5:** `transition:`/`in:`/`out:` from `svelte/transition`,
  `animate:flip` from `svelte/animate`, local by default (`|global` when
  needed); SvelteKit `onNavigate` + view transitions.
- **Angular:** `@angular/animations` is deprecated since v20.2 — use native
  CSS animations with `animate.enter` / `animate.leave`.
- **Astro:** built-in view transitions (`<ClientRouter />`) with `transition:name`.

## Laravel, Django and server-rendered HTML

- Livewire 4: `wire:transition` (native view transitions; `.navigate` for
  `wire:navigate`); Livewire 3: Alpine-based show/hide — check the version.
  Alpine `x-transition` for small show/hide.
- Inertia 2+: `viewTransition` on `Link`/visits or as a default.
- htmx: `hx-swap="… transition:true"` or `htmx.config.globalViewTransitions`,
  settle classes for item motion.

## React Native

- **Reanimated 4**: CSS-style animations and transitions, layout animations
  (`entering`/`exiting` with `.springify()`), shared values on the UI
  thread; `ReduceMotion.System` respects the OS setting by default.
- **Gesture Handler** (v3 introduced a hook API — `usePanGesture`,
  `useTapGesture`; older projects use `Gesture.Pan()`) for gesture-following
  motion. Reanimated 4 needs React Native's New Architecture; on older
  projects use the installed Reanimated version's API.
- Native stack transitions for navigation; don't re-implement platform
  transitions in JS.

## Flutter

- Implicit animations first (`AnimatedContainer`, `AnimatedOpacity`,
  `AnimatedSwitcher`, `AnimatedList`), then `TweenAnimationBuilder`, then
  built-in explicit transitions, then `AnimatedBuilder`; `SpringSimulation`
  for physics; `Hero` for shared elements; route transitions via
  `PageRouteBuilder` / go_router `CustomTransitionPage`.
- `flutter_animate` for readable sequences if the project uses or accepts it.
- `MediaQuery.disableAnimationsOf(context)` → shorten or skip.
- Follow Material motion on Android and Cupertino conventions on iOS when
  the app uses them.

## Apple platforms (SwiftUI) and Android native

- SwiftUI: `withAnimation`, `.spring()`, `matchedGeometryEffect`,
  `@Environment(\.accessibilityReduceMotion)`; follow the HIG.
- Compose: `animate*AsState`, `AnimatedVisibility`, `AnimatedContent`,
  shared element transitions, Material 3 motion scheme; framework
  animations follow the system's animation-scale setting (users can turn
  animations off), so don't hard-code timing around it.

## Performance

- Animate `transform` and `opacity`; avoid `width`, `height`, `top`, `left`,
  `margin` (use FLIP/layout animations instead).
- `will-change` only just before and during an animation.
- Limit simultaneous animations, large blurs, `backdrop-filter`, shadows
  animated directly (animate an overlay's opacity instead).
- Run nothing off-screen; pause loops when the tab or element is hidden.
- Keep the main thread free during interactions (INP ≤ 200 ms); on mobile,
  watch battery — no continuous animation without purpose.
- Profile heavy motion (browser Performance panel, Flutter DevTools in
  profile mode, React Native perf monitor).
