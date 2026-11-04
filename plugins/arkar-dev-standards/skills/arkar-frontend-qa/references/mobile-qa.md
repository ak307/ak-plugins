# Mobile apps (Flutter, native Android): UI standards and QA

The quality floor for Flutter and native Android apps — the mobile
counterpart of the web checklist. (This replaces the old `design-standards`
skill's Flutter and Android guidance.) A mobile app's look still comes from
its own identity: a `DESIGN.md` with the same structure as for web
(`arkar-frontend-design/references/design-md-template.md`), applied through
the theme.

## Contents
1. Hard floor
2. Tokens and theming
3. Every state
4. Accessibility and text size
5. Language
6. Layout and structure
7. Testing and checking
8. Running safely (Rule 0)

## 1. Hard floor

Same as the web, adapted to touch:

- Text contrast ≥ 4.5:1 (3:1 for large text); component boundaries ≥ 3:1.
- Touch targets ≥ 48×48 dp (Android/Flutter), 44×44 pt (iOS), with space
  between them.
- Layouts survive the system text size at 200%: nothing essential
  truncated or overlapping.
- Icon-only buttons and meaningful images have semantic labels.
- Destructive actions confirm first (naming what's affected) or offer undo.
- No crashes or red error screens on the main journeys, including with no
  network.

## 2. Tokens and theming

**Flutter**
- All tokens in `ThemeData`: colours via `ColorScheme`, text via
  `TextTheme`, extra tokens (spacing, radii, semantic colours) via
  `ThemeExtension` classes. Use the brand colour from `DESIGN.md`; CBM red
  only when AK asks for CBM branding.
- Light and dark: provide `theme:` and `darkTheme:` when `DESIGN.md` says
  the app supports both, with `ThemeMode.system` unless the project decides
  otherwise.
- Read tokens through `Theme.of(context)` / context extensions.
  `Colors.blue`, inline `TextStyle(fontSize: 13)`, raw hex and
  `EdgeInsets.all(13)` at the point of use are defects; spacing comes from one
  spacing class.

**Native Android**
- Compose: tokens through `MaterialTheme` (`ColorScheme` light + dark,
  `Typography`, `Shapes`) plus a `CompositionLocal` for project extras.
  Views/XML: `res/values` (`colors.xml`, `dimens.xml`, `styles.xml`) with
  theme attributes and `values-night/` for dark mode.
- **dp for sizes, sp for text — always.** Hard-coded `Color(0xFF…)` or
  `16.sp` at call sites are defects.

## 3. Every state

Every screen and data-bearing component handles loading, empty, error,
offline and success:

- **Model screen state explicitly** — Flutter: `AsyncValue` from Riverpod
  (the template's default) or a `sealed class` / freezed union, switched over
  exhaustively; Android: a sealed interface exposed from the ViewModel as
  `StateFlow`. Never `data == null ? spinner : list`.
- **Loading:** skeletons for content areas; a progress indicator only for
  actions or small regions. Never a blank screen.
- **Empty:** says why and offers the next action.
- **Error:** a human message (no exception text) and a retry, through one
  reusable error widget; errors are mapped to messages in the
  notifier/ViewModel, never shown raw.
- **Offline:** if the app needs the network, show cached data marked as
  possibly out of date, or a message that it's the connection — distinct
  from a general failure.
- **Feedback:** every tap answers within ~100 ms (ripple, state change,
  snackbar).

## 4. Accessibility and text size

- Flutter: custom `GestureDetector`/`InkWell` areas get a minimum 48×48 via
  `ConstrainedBox` or padding; `MaterialTapTargetSize.shrinkWrap` only with a
  reason. Compose: `Modifier.minimumInteractiveComponentSize()` on custom
  `clickable`s.
- Text size: never override `MediaQuery.textScaler` to stop users enlarging
  text; no `SizedBox(height: …)` / `height()` around text — use minimum
  heights and scrolling (assume any screen can overflow at 200%).
- Semantics: `Semantics` labels / `tooltip` on icon-only buttons; decorative
  images `excludeFromSemantics: true`; Compose `contentDescription` (null for
  decorative) and merged semantics on composite rows.

## 5. Language

- Flutter: `flutter_localizations` + `intl` with `.arb` files; every string
  through `AppLocalizations`; plurals and genders with ICU syntax. Android:
  `strings.xml` per locale, `<plurals>`, locale-aware `java.time` /
  `android.icu` formatting.
- No sentences built by joining strings; layouts tolerate text 30–50%
  longer than English.
- **Tall scripts (Burmese, Thai, Tamil):** set a generous line `height` in
  the theme's `TextTheme` (not per widget), use fonts that cover the script
  (Noto Sans Myanmar / Padauk), test with real Burmese text.
- RTL-ready: `start`/`end` padding, never `left`/`right`
  (`EdgeInsetsDirectional`, Android `supportsRtl`).

## 6. Layout and structure

- Adaptive: `LayoutBuilder` / `MediaQuery.sizeOf` breakpoints, no fixed
  screen-width assumptions; phones and tablets in portrait and landscape
  where the app supports them.
- `SafeArea` / edge-to-edge insets (`WindowInsets`,
  `Modifier.safeDrawingPadding()`) on screen roots.
- Screens stay thin: notifiers (Riverpod) / ViewModels hold logic and state;
  widgets render and send events. Widget classes over builder methods for
  reused or complex subtrees; `const` constructors wherever possible.
- Configuration changes and process death handled by state hoisting, not by
  blocking recreation.
- **Motion** designed for the project as in `arkar-frontend-design`'s
  `motion.md` and recorded in `DESIGN.md`; with
  `MediaQuery.disableAnimationsOf` true, shorten or skip. Run it at 60 fps in profile mode on a real device or
  emulator when the motion is heavy.

## 7. Testing and checking

- **Notifier/ViewModel tests** for every state and transition (fakes for
  repositories — see `flutter.md`).
- **Widget tests** for each screen's states: loading, empty, error, data,
  and with `textScaler` 2.0 (`tester.platformDispatcher.textScaleFactorTestValue = 2.0`
  or wrapping in `MediaQuery`) to catch overflow.
- **Golden tests** for key screens in light and dark (and large text) once
  the design settles (`matchesGoldenFile`, or `alchemist`).
- **Integration tests** (`integration_test`) for the 3–5 critical journeys,
  against the Firebase emulator or a local API.
- **Look at it:** run on an emulator/simulator (or `flutter run -d chrome`
  for a quick visual check) at a small phone, a large phone and a tablet
  size; take screenshots and actually look at them. If no device or emulator
  is available, say exactly what wasn't checked.
- Android: `@Preview` for light, dark and `fontScale = 2f` variants of
  non-trivial composables.
- `dart format`, `flutter analyze` (with `flutter_lints` + `riverpod_lint`)
  and `flutter test` pass.
- **Crash reporting** in release builds (`sentry_flutter` to GlitchTip /
  Sentry, or Firebase Crashlytics), no personal data in reports.

## 8. Running safely (Rule 0)

A debug run talks to whatever `env/<env>.json` and `firebase_options.dart`
point at. Run and test only against `env/dev.json` with a local API or the
Firebase Emulator Suite / a dev Firebase project — never the production
backend. Never send real push notifications or SMS while testing.
