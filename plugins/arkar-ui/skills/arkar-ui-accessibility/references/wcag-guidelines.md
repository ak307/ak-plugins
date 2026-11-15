# WCAG 2.2 AA — what it means in practice

Source: https://www.w3.org/TR/WCAG22/ (WCAG 3 is still a draft; 2.2 AA is
the working target). Criteria most relevant to UI work, grouped by area.

## Perceivable

| Criterion | In practice |
|---|---|
| 1.1.1 Non-text content (A) | meaningful images have alt text; decorative `alt=""`; icon buttons named |
| 1.3.1 Info and relationships (A) | headings, lists, tables, labels and landmarks in markup, not just visuals |
| 1.3.2 Meaningful sequence (A) | DOM order matches reading order |
| 1.3.4 Orientation (AA) | works in portrait and landscape unless essential |
| 1.3.5 Identify input purpose (AA) | `autocomplete` on personal-data fields |
| 1.4.1 Use of colour (A) | colour never the only signal |
| 1.4.3 Contrast minimum (AA) | text 4.5:1, large text 3:1 |
| 1.4.4 Resize text (AA) | 200% without loss |
| 1.4.10 Reflow (AA) | no 2-D scrolling at 320 CSS px width (except data tables, maps) |
| 1.4.11 Non-text contrast (AA) | UI components, focus indicators, meaningful graphics 3:1 |
| 1.4.12 Text spacing (AA) | survives increased line/letter/word spacing |
| 1.4.13 Content on hover or focus (AA) | tooltips dismissible, hoverable, persistent |

## Operable

| Criterion | In practice |
|---|---|
| 2.1.1 Keyboard (A), 2.1.2 No keyboard trap (A) | everything operable by keyboard; Escape/Tab never trap |
| 2.2.2 Pause, stop, hide (A) | moving/auto-updating content over 5 s can be paused |
| 2.3.1 Three flashes (A) | no flashing over 3 per second |
| 2.4.1 Bypass blocks (A) | skip link or landmarks |
| 2.4.2 Page titled (A), 2.4.6 Headings and labels (AA) | descriptive titles, headings, labels |
| 2.4.3 Focus order (A), 2.4.7 Focus visible (AA) | logical order, always visible focus |
| **2.4.11 Focus not obscured (minimum) (AA) — new in 2.2** | focused element not completely hidden by sticky headers, banners, overlays |
| **2.5.7 Dragging movements (AA) — new in 2.2** | anything done by dragging also works with single clicks/taps |
| **2.5.8 Target size (minimum) (AA) — new in 2.2** | targets ≥ 24×24 CSS px, or enough spacing (exceptions: inline links, essential) |
| 2.5.3 Label in name (A) | the visible label is part of the accessible name |

## Understandable

| Criterion | In practice |
|---|---|
| 3.1.1 / 3.1.2 Language (A/AA) | `lang` on the page and on passages in other languages |
| 3.2.1 / 3.2.2 On focus / on input (A) | no surprise context changes |
| 3.2.3 / 3.2.4 Consistent navigation / identification (AA) | same things in the same places with the same names |
| **3.2.6 Consistent help (A) — new in 2.2** | help/contact mechanisms in the same relative place across pages |
| 3.3.1 Error identification (A), 3.3.3 Error suggestion (AA) | errors named in text with how to fix |
| 3.3.2 Labels or instructions (A) | visible labels and needed instructions |
| 3.3.4 Error prevention (AA) | legal/financial/data submissions reversible, checked or confirmed |
| **3.3.7 Redundant entry (A) — new in 2.2** | don't ask again for information already given in the process |
| **3.3.8 Accessible authentication (minimum) (AA) — new in 2.2** | no cognitive tests (remembering, puzzles) to log in without an alternative; allow paste and password managers |

## Robust

| Criterion | In practice |
|---|---|
| 4.1.2 Name, role, value (A) | custom controls expose role, name, state |
| 4.1.3 Status messages (AA) | status updates announced (`role="status"`, `aria-live="polite"`) without moving focus |

(4.1.1 Parsing was removed in WCAG 2.2.)

## Motion-related (AAA, but follow where practical)

2.3.3 Animation from interactions: motion triggered by interaction can be
disabled — honour `prefers-reduced-motion`.
