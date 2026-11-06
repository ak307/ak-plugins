# Platform conventions

Respect each platform; don't force one platform's behaviour onto another.

## iOS / iPadOS (SwiftUI, Flutter Cupertino, React Native)

- Navigation: navigation bar with back; tab bar for top-level destinations;
  sheets for focused tasks; swipe-back gesture must keep working.
- Safe areas around the notch, Dynamic Island and home indicator.
- Dynamic Type: text scales with the user's setting.
- Touch targets ≥ 44×44 pt; haptics for meaningful feedback (sparingly).
- Motion: brief, purposeful, following the gesture; respect Reduce Motion.

## Android (Compose, Views, Flutter Material, React Native)

- Material 3 patterns: top app bar, navigation bar/rail/drawer by width,
  bottom sheets, FAB for the primary action where it fits.
- System back (and predictive back) must work everywhere.
- Edge-to-edge with insets (`WindowInsets`, `safeDrawingPadding`).
- Touch targets ≥ 48×48 dp; `dp` for sizes, `sp` for text.
- Motion: Material motion; framework animations follow the system's
  animation-scale setting.

## Flutter

- Choose Material, Cupertino or a custom design deliberately; adapt
  navigation per platform where it matters (back behaviour, tab bars).
- `SafeArea` / `MediaQuery.paddingOf` on screen roots; `LayoutBuilder` /
  `MediaQuery.sizeOf` for adaptive layouts (phone, tablet, desktop/web).
- Never override `MediaQuery.textScaler` to stop users enlarging text; no
  fixed heights around text.
- `Semantics` for custom widgets; 48×48 minimum tap areas.
- `MediaQuery.disableAnimationsOf(context)` for reduced motion.

## React Native

- Platform-appropriate navigation (native stack, tabs); `SafeAreaView` /
  `react-native-safe-area-context`.
- Gesture Handler for gestures; Reanimated for gesture-following motion.
- `accessibilityLabel`/`accessibilityRole`; respect font scaling.

## Desktop apps (Electron, Tauri, native, Flutter desktop)

- Pointer and keyboard first: hover states, right-click where expected,
  keyboard shortcuts for frequent actions, resizable windows with sensible
  minimums.
- Platform window conventions (title bar, menus) per OS.
- Denser layouts are acceptable; text stays readable.

## Web on mobile

- Behaves like a good mobile site, not a fake native app: real links, the
  browser back button works, no blocked zoom (`user-scalable=no` is a
  defect).
