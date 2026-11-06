# Design tokens

## Two layers

- **Primitive tokens** — the raw palette and scales (`--blue-600`,
  `--space-4`, `--radius-2`). Defined once; components never use them
  directly.
- **Semantic tokens** — roles (`--color-surface`, `--color-text-muted`,
  `--color-action`, `--space-stack-md`, `--radius-control`,
  `--shadow-overlay`, `--duration-quick`). Components use only these, so a
  theme or rebrand changes one file.

Add a component layer (`--button-padding-x`) only when a component truly
needs tuning beyond the semantic set.

## Categories

| Category | Typical semantic tokens |
|---|---|
| Colour | background, surface (1–3 levels), text, text-muted, border, action (+hover/pressed), accent, focus, success, warning, danger, info, data series |
| Typography | font families, sizes (scale), weights, line heights, letter-spacing for display sizes |
| Spacing | a scale (often a 4 px base) + named gaps for stacks, insets, sections |
| Sizing | control heights, icon sizes, touch targets, content max-widths |
| Radius | control, card/container, pill, none — by role |
| Shadow / elevation | 2–3 levels (flat, raised, overlay), each a layered, hue-tinted shadow (contact + ambient), not one grey blur; higher = more temporary/important |
| Border | widths and colours by role |
| Layering | z-index scale: base, sticky, dropdown, overlay, modal, toast |
| Motion | durations, easings, springs (from `arkar-ui-motion-design`) |
| Breakpoints | the project's real breakpoints (from `arkar-ui-responsive-design`) |

## Where tokens live, per stack

| Stack | Source of truth |
|---|---|
| Plain CSS / any web | CSS custom properties on `:root` (+ theme selectors) |
| Tailwind v4 | `@theme { --color-…; --font-…; --spacing-…; }` in the main CSS; utilities generated from it |
| Tailwind v3 | `theme.extend` in `tailwind.config.js`, pointing at CSS variables |
| Laravel Blade / Livewire / Inertia | the CSS above, built with Vite |
| Django templates / htmx | a `tokens.css` in static files |
| React / Next / Vue / Svelte / Angular | CSS variables (or the framework's theme object only if the project already uses one) |
| Flutter | `ThemeData` (`ColorScheme`, `TextTheme`) + `ThemeExtension` classes for spacing, radii, semantic extras |
| React Native | a typed theme object provided by context |
| Android Compose | `MaterialTheme` (colours, typography, shapes) + `CompositionLocal` for extras |

## Naming

- Name by role, not appearance: `--color-danger`, not `--red`.
- Consistent order: `--{category}-{role}-{variant}-{state}`
  (`--color-action-secondary-hover`).
- Document each semantic token's use in `DESIGN.md` (a short table).

## Cleaning up an existing product

1. Collect the values actually used (grep colours, font sizes, spacing,
   radii, shadows).
2. Cluster near-duplicates into a scale; map each old value to a token.
3. Replace in the screens in scope; propose the rest as 🟢 SAFE cleanup.
