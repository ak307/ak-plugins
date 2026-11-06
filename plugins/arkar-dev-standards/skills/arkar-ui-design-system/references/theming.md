# Theming

## Decide per product

Light, dark or both — decided from the users and setting (control rooms and
night shifts favour dark; public sites and forms usually light; tools used
all day often benefit from both) and recorded in `DESIGN.md` under
"Themes".

## Web

- Semantic tokens defined on `:root`; dark values under
  `@media (prefers-color-scheme: dark)` and, if the app offers a toggle, also
  under a `[data-theme="dark"]` attribute (with `[data-theme="light"]`
  winning over the media query).
- Persist a user's explicit choice; default to the system setting.
- Set `color-scheme: light dark` so form controls and scrollbars match.
- Avoid a flash of the wrong theme: set the attribute before first paint
  (inline script in `<head>` or server-rendered).
- Tailwind v4: define tokens in `@theme`, override the variables in the dark
  selector; use `dark:` variants only when a component truly needs it.
- `prefers-contrast: more` can strengthen borders and text where cheap;
  `prefers-reduced-transparency` is Chrome-only — treat it as an enhancement.

## Flutter

- `theme:` and `darkTheme:` on `MaterialApp`, `ThemeMode.system` by default.
- `ColorScheme` for colours, `TextTheme` for type, `ThemeExtension` for
  spacing, radii and extra semantic colours (with `lerp` so theme changes
  animate).
- Read through `Theme.of(context)` / extensions; raw `Colors.*`, hex and
  inline `TextStyle(fontSize: …)` at call sites are defects.

## React Native

- A typed theme object (light/dark) provided by context; read
  `useColorScheme()`; components use the theme, never raw values.

## Android (Compose / Views)

- Compose: `MaterialTheme` with light and dark `ColorScheme`s, `Typography`,
  `Shapes`; extras via `CompositionLocal`.
- Views: theme attributes in `res/values` and `values-night`.

## Checking

Every screen in scope is checked in each supported theme: contrast, images,
charts, focus rings, borders, skeletons.
