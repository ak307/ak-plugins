# Responsive and platform testing

## Web

- Check the target screens from `DESIGN.md`; otherwise 375×812, 768×1024 and
  1440×900 — plus 320 px wide for reflow when content is dense.
- Portrait and landscape on tablet-sized screens when the product supports
  them.
- 200% browser zoom (or larger default text): nothing essential clipped or
  overlapping.
- Touch: targets big enough and spaced; no hover-only information.
- Check each supported theme (light/dark).

## Flutter (Android/iOS), React Native, native Android

**Run safely first:** a debug run talks to whatever the env file and
`firebase_options.dart` point at — use the dev environment with a local API
or the Firebase Emulator Suite / a dev project, never the production
backend; never send real push notifications or SMS while testing.

- **Look at it:** run on an emulator/simulator (or `flutter run -d chrome`
  for a quick visual check) at a small phone, a large phone and a tablet;
  take screenshots and look at them. If no device or emulator is available,
  say exactly what wasn't checked.
- **Widget tests** for each screen's states (loading, empty, error, data)
  and with text scale 2.0 to catch overflow.
- **Golden tests** for key screens in light, dark and large text once the
  design settles (`matchesGoldenFile`).
- **Accessibility guidelines** in widget tests: `meetsGuideline(androidTapTargetGuideline)`,
  `iOSTapTargetGuideline`, `labeledTapTargetGuideline`, `textContrastGuideline`.
- **Integration tests** (`integration_test`) for the 3–5 critical journeys
  against a local API or the emulator.
- Motion at 60 fps in profile mode on a real device or emulator when it's
  heavy; with animations disabled in system settings, everything still works.
- `dart format`, `flutter analyze` and `flutter test` pass (React Native:
  the project's lint, type check and test commands).
- Android Compose: `@Preview` variants for light, dark and `fontScale = 2f`.

## Desktop apps

Smallest and largest supported window sizes, keyboard-only use, high-DPI
rendering.
