# Inclusive design

## Language and scripts

- Plain language; short sentences; the users' own terms. Many users read in
  a second language.
- Translation-ready: every user-facing string through the project's message
  catalogue (Laravel `__()`, Django `gettext`, i18next/react-intl, Flutter
  `AppLocalizations`); no sentences built by joining strings; layouts
  tolerate text 30–50% longer than English; dates, numbers and plurals
  through locale formatting; correct `lang` attributes.
- **Tall scripts** (Myanmar/Burmese, Thai, Tamil, Devanagari): follow
  `arkar-ui-design-system/references/typography-system.md` (line height,
  no fixed-height boxes, fonts that cover the script) and test with real
  text.
- RTL-ready with logical properties (`margin-inline-start`) and
  `EdgeInsetsDirectional`; mirror by hand only what has no logical form
  (a switch's travel, "previous/next" arrows, where notices sit).
- **The browser may not know the language.** Chrome has no date or number
  data for some languages (Burmese and Khmer among them) and falls back to
  English without an error — a translated screen with an English calendar.
  Check `Intl.DateTimeFormat.supportedLocalesOf([locale])`; when it is
  empty, take month and weekday names, their order and the digits from the
  message catalogue (the surface kit: `configure({ calendar, digits })`).
- Never cut a word to abbreviate it (a weekday's first two letters): use
  the locale's own short or narrow form. No letter-spacing on joined
  scripts (Arabic, Persian, Urdu).

## Text size and zoom

- Sizes in `rem` (web) / `sp` (Android) / Dynamic Type (iOS) / unrestricted
  `textScaler` (Flutter).
- No fixed heights on text containers; buttons grow with their labels;
  nothing essential truncated at 200%.

## Vision

- Contrast per WCAG; don't rely on colour alone (icons, text, patterns in
  charts); colour-blind-safe data palettes.
- `prefers-contrast: more` can strengthen borders/text where cheap.
- Don't use thin, light-grey text for anything users must read.

## Motion sensitivity

- `prefers-reduced-motion`: replace movement with fades or instant changes;
  no parallax, zooms or large travel; skeletons static; autoplaying motion
  paused.
- Any moving content over five seconds can be paused.

## Motor

- Large, well-spaced targets; no precise drag requirements; generous time
  limits (or none); no hover-only actions; keyboard shortcuts don't hijack
  single keys without a way to turn them off.

## Cognitive

- One primary action per screen; consistent patterns and placement;
  progress shown in multi-step tasks; no memory tests (show information
  rather than ask users to remember it); errors prevented where possible
  (confirmation for consequential actions, undo).
- Avoid time pressure and surprise changes of context.
- Consistent help in the same place across pages (WCAG 3.2.6).

## Situational limits

Bright sunlight (contrast), one hand (thumb reach), noisy places (captions,
no audio-only information), slow networks (progressive loading, offline
states).
