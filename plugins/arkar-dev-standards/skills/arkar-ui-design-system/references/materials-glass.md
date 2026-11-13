# Materials — Liquid Glass and solid surfaces

Apple's Liquid Glass (iOS/macOS 26) is a **material for the control layer**:
tab bars, toolbars, sidebars, sheets, menus, popovers, floating buttons and
the command palette float above the content as glass that bends and lights
what passes beneath. Working content people read for long stays solid
and readable. **For AK's business systems it is the default material**
(see `arkar-ui-art-direction/references/business-systems.md` — he
consistently rates glass designs higher); for other products it is chosen
in art direction. Either way each product composes it in its own way — glass
is a material, never a reason for products to resemble iOS or each other.

## The material map — where glass belongs, and where it doesn't

AK's standard, in his words: *Apple-level design isn't about maximising
glass effects. It's about knowing exactly where glass belongs and where it
doesn't. When everything is glass, nothing feels special.*

| Element | Treatment |
|---|---|
| Background | Atmospheric and restrained: soft light in the product's colours |
| Main content | Solid or near-opaque — visually stable |
| Tables and lists | Solid surfaces (only a sticky header is glass) |
| Navigation, filter and tab bars | Translucent glass that content scrolls under |
| Floating panels: menus, pickers, the selection bar | Frosted glass |
| Dialogs and sheets | Layered glass: a frosted sheet, the page behind dimmed and slightly out of focus, solid fields and lists inside |
| Buttons | Subtle material depth, not glass |
| Text | High contrast, always |

- **Glass is for navigation and hierarchy, not for everything.**
- **Content stays visually stable:** solid or near-opaque wherever
  readability matters.
- **Glass responds to context:** it frosts (more tint, the same blur) when
  what is behind it is busy — a bar is clear over the calm page and frosted
  once rows scroll under it; glass over a map, photo or chart is frosted
  from the start.
- **Blur is intentional:** only on floating surfaces, navigation, overlays
  and contextual controls.
- **Depth is physical:** hairline borders, a lit top edge, layered shadows
  and layered translucency — not more blur.

The design system has three layers, each answering to the next:
**material** (solid, glass, light, depth) · **motion** (the material
responding — `arkar-ui-motion-design`) · **interaction** (feedback,
hierarchy, usability, accessibility). `assets/surface-kit.css` and
`assets/liquid-glass.css` build this map; theme them, don't re-derive it.

## When it fits

- Consumer, AI-native, premium, booking, onboarding and media products,
  where rich content (imagery, colour, a map, a visual) scrolls under
  floating controls — glass shows that content and keeps people oriented.
- Overlays that must keep context: sheets, popovers, a palette, toasts.

## When it doesn't

- On the working content of dense pages (the table, the form, long text):
  glass there gains nothing, so that content stays solid. This is about the
  content only — in AK's business systems the floating layer around it
  (sidebar, top bar, filter and tab bars, sheets, menus) is still glass,
  even on a table page (business-systems.md). A dashboard built around a
  map, floor plan or site view goes further — floating glass panels over
  it can be the whole idea.
- Over flat, empty backgrounds (glass over nothing is just grey): put a
  rich field beneath (`.lg-field` in the kit, or the product's canvas)
  rather than dropping the glass.
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

## Web: use the kit

`../assets/liquid-glass.css` is the tested material (tint, blur and
saturation, top-bright rim light, specular sheen, separating shadow,
light/dark tints, a sliding segmented control, and the fallbacks). Copy it
and theme it through its tokens; the recipe below shows the principle.

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
