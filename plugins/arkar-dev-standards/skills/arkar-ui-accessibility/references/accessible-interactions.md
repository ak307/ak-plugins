# Accessible interactions

## Semantics first

- Use the right element: `button` for actions, `a href` for navigation,
  `label` for fields, `fieldset`/`legend` for groups, `table` with `th` for
  data, `nav`/`main`/`header`/`footer` landmarks, headings in order.
- ARIA only to fill gaps native elements can't (and wrong ARIA is worse than
  none). Prefer a headless accessible library the project already has
  (Radix, Headless UI, Material) for complex widgets.

## Keyboard

- Tab order follows the visual order; no positive `tabindex`.
- Enter/Space activate; Escape closes overlays; arrow keys move within
  composite widgets (menus, tabs, radio groups, listboxes, grids) with a
  roving `tabindex`.
- Visible focus on everything (`:focus-visible`), never removed with
  `outline: none` without a replacement; ≥ 3:1 contrast.
- Focus not obscured: sticky headers/footers use `scroll-padding` so the
  focused element stays visible.

## Common widgets

| Widget | Must do |
|---|---|
| Dialog / modal | `dialog` element or `role="dialog"` + `aria-modal`, labelled; focus moves in, is trapped, Escape closes, focus returns to the trigger; background inert |
| Drawer / sheet | same as dialog when modal |
| Menu / dropdown | button with `aria-expanded` + `aria-controls`; arrow-key navigation; Escape closes and returns focus |
| Tabs | `tablist`/`tab`/`tabpanel`, `aria-selected`, arrow keys switch tabs |
| Accordion | buttons with `aria-expanded` controlling regions |
| Combobox / autocomplete | follow the ARIA APG combobox pattern (or a library) — announce result counts |
| Toast / status | `role="status"`/`aria-live="polite"` (assertive only for urgent errors); doesn't steal focus; stays long enough or is persistent |
| Tooltip | on hover **and** focus, dismissible with Escape, not the only place for essential info |
| Data table | `caption` or label, `th` with `scope`, sort state via `aria-sort` |
| Carousel | no auto-advance, or pause control; previous/next buttons; slide position announced |
| Drag and drop | a non-drag alternative (move buttons, menus) |
| Forms | `label for`, errors via `aria-describedby` and `aria-invalid`, an error summary for long forms with links to fields, focus moved to the summary or first error on submit |
| Loading | `aria-busy` on the region; a status message when content arrives |
| AI streaming | status changes announced politely; not every token |

## Focus management in SPAs

- After route changes, move focus to the new page's heading or main region
  and update the document title.
- After deleting an item, move focus to a sensible neighbour.
- After closing an overlay, return focus to its trigger.

## Native platforms

- Flutter: `Semantics` labels, `ExcludeSemantics` for decoration,
  `MergeSemantics` for composite rows; test with `meetsGuideline`
  (`androidTapTargetGuideline`, `textContrastGuideline`, `labeledTapTargetGuideline`).
- React Native: `accessibilityRole`, `accessibilityLabel`,
  `accessibilityState`, `accessible` grouping.
- Android: `contentDescription`, merged semantics in Compose.
- iOS: VoiceOver labels, traits, Dynamic Type.

## Testing

- Automated: axe (e.g. `@axe-core/playwright` or the browser extension),
  Lighthouse accessibility, framework lints (`eslint-plugin-jsx-a11y`,
  `eslint-plugin-vuejs-accessibility`), Flutter guideline tests.
- Manual: a full keyboard pass of the flows in scope; zoom to 200%; reduced
  motion on; a screen reader spot-check (VoiceOver/NVDA/TalkBack) when
  available.
- Report exactly which of these were done.
