# Materials — Liquid Glass and solid surfaces

Apple's Liquid Glass (iOS/macOS 26) is a **material for the control layer**:
tab bars, toolbars, sidebars, sheets, menus, popovers, floating buttons and
the command palette float above the content as glass that bends and lights
what passes beneath. The content itself stays solid and readable. Treat it
as one material choice per product, made in art direction — not a default
look, and never a reason for products to resemble iOS or each other.

## When it fits

- Consumer, AI-native, premium, booking, onboarding and media products,
  where rich content (imagery, colour, a map, a visual) scrolls under
  floating controls — glass shows that content and keeps people oriented.
- Overlays that must keep context: sheets, popovers, a palette, toasts.

## When it doesn't

- Dense work tools: tables, forms and dashboards gain nothing from glass on
  content; at most the top bar or a floating action uses it.
- Over flat, empty backgrounds (glass over nothing is just grey).
- Kiosks or low-end devices where blur would cost frame rate.

## Rules

1. **Glass floats; working surfaces are solid.** Glass suits controls and
   floating panels over a visual canvas — a map, floor plan, site view,
   schedule or imagery — where seeing the canvas through the panel keeps
   people oriented. AK rated exactly that premium: a full-screen site map
   with tinted glass panels for work orders, KPIs, alerts and crew. Content
   panels on glass need a stronger tint so text stays crisp. Over plain page
   backgrounds, tables and forms stay solid. Never glass on glass (a glass
   menu over a glass bar becomes a solid surface).
2. **Legibility first.** Text and icons on glass meet WCAG AA against the
   worst content that can pass beneath: add a tint (light or dark) strong
   enough, a subtle inner shadow or vibrancy for text, and test it over the
   busiest part of the page — not only over white.
3. **Respect the system:** `prefers-reduced-transparency: reduce` and
   `prefers-contrast: more` → solid tinted surface; no
   `backdrop-filter` support → solid fallback (`@supports`).
4. **Shape and light, not only blur:** concentric radii that follow the
   container, a specular edge (a 1px inner highlight, brighter at the top),
   a soft shadow that separates it from content, and a tint that adapts to
   light/dark. Blur alone reads as 2015 "glassmorphism".
5. **Motion makes it liquid:** controls morph between states (a tab bar
   shrinks on scroll, a button expands into its menu, a sheet rises from the
   control that opened it) with well-damped springs; under reduced motion
   these become fades.
6. **Performance budget:** a few glass surfaces per screen, blur radius
   moderate, no animated blur radius; check scrolling stays smooth on a
   phone-sized viewport.

## Web recipe (adapt; tokens, not raw values in components)

```css
.glass {
  background: color-mix(in oklab, var(--glass-tint) 55%, transparent);
  backdrop-filter: blur(var(--glass-blur)) saturate(1.6);
  border-radius: var(--radius-control);
  box-shadow: inset 0 1px 0 var(--glass-highlight), 0 8px 24px var(--glass-shadow);
}
@supports not (backdrop-filter: blur(1px)) { .glass { background: var(--surface-raised); } }
@media (prefers-reduced-transparency: reduce) { .glass { background: var(--surface-raised); backdrop-filter: none; } }
```

True refraction (an SVG `feDisplacementMap` used as a backdrop filter) only
works in Chromium; treat it as an enhancement with the recipe above as the
base, and only on one hero control.

Flutter: `BackdropFilter` + `ClipRRect` with a tinted container, or the
platform's glass widgets where available; SwiftUI: the system
`.glassEffect()` materials.

## Record it

In `DESIGN.md` (Shape and depth section): which surfaces are glass, the
tint per theme, blur, highlight, fallbacks — or why the product uses solid
materials instead.
