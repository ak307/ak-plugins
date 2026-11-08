# Frontend performance

Balance visual quality with speed. Measure where you can; never report
numbers you didn't measure.

## Targets (web)

Core Web Vitals, "good" at the 75th percentile: **LCP ≤ 2.5 s**,
**INP ≤ 200 ms**, **CLS ≤ 0.1** (INP replaced FID in March 2024).
Measure with Lighthouse / Chrome DevTools Performance locally, or the
`web-vitals` library in the app.

## Loading

- **Images:** modern formats (AVIF/WebP), responsive `srcset`/`sizes`,
  explicit `width`/`height` or `aspect-ratio`, `loading="lazy"` below the
  fold, `fetchpriority="high"` on the LCP image; framework image components
  (`next/image`, Astro `<Image>`, Nuxt Image) where the project uses them.
- **Fonts:** bundled, subset where possible, `woff2`, `font-display: swap`,
  preload only the one or two used above the fold, few weights; metric
  overrides (`size-adjust`) to reduce shift.
- **JavaScript:** route-level code splitting, lazy-load heavy components
  (charts, editors, maps) when needed, avoid shipping server-only code,
  tree-shakable imports.
- **Dependency cost:** check a library's size before adding it; prefer the
  platform (CSS, View Transitions, `Intl`) to a dependency.
- **Data:** skeletons and progressive rendering instead of blocking spinners;
  paginate or virtualise long lists.

## Rendering

- Avoid unnecessary re-renders: stable props, memoisation only where
  measured to help (`memo`, `useMemo`, `computed`), state kept local,
  selectors for shared stores.
- Virtualise long lists/tables (hundreds of rows).
- Debounce input-driven work (search, resize); move heavy work off the main
  thread or split it so interactions stay under ~200 ms.
- Avoid layout thrashing (reading layout then writing styles in loops).
- `content-visibility: auto` for long off-screen sections.

## Layout stability

Reserve space for images, ads/embeds, async content and fonts; no content
inserted above what the user is reading; skeletons the size of the real
content.

## Animation performance

- Animate `transform` and `opacity`; avoid animating layout properties,
  large `filter: blur()`, `backdrop-filter`, and box-shadows directly.
- `will-change` only around an animation, not permanently.
- No continuous animation without purpose; pause off-screen and in hidden
  tabs; respect reduced motion.

## Mobile

- Memory: dispose controllers, listeners and subscriptions (Flutter
  `dispose`, React effects cleanup); avoid huge images in memory.
- Battery: fewer continuous animations, timers and polling; batch network
  calls.
- Flutter: `const` constructors, avoid rebuilding large subtrees, `ListView.builder`
  for long lists, profile in profile mode with DevTools.
- React Native: avoid JS-thread animations (Reanimated runs on the UI
  thread), `FlatList` tuned for long lists.

## When AK says "it's slow"

1. Reproduce and measure (what's slow: load, interaction, scrolling,
   animation; on which device).
2. Find the cause with the profiler, not by guessing.
3. Fix the biggest cause; measure again; report before/after numbers.
