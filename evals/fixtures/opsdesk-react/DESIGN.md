# Ops Desk — design system

## Identity
Enterprise professional, calm and dense. Deep slate surfaces for navigation,
warm paper for working areas, one amber accent for what needs attention.
Type: Inter (system fallback) at a compact 14px base for dense tables.

## Tokens
All values live in `src/styles/tokens.css` — components use only these.
- Colour roles: --surface-nav, --surface-page, --surface-card, --text, --text-muted,
  --border, --accent (amber), --success, --warning, --danger, --info.
- Radius: --radius-sm 6px, --radius-md 10px, --radius-lg 16px.
- Space: --space-1 … --space-8 (4px steps up to 32px).
- Shadow: --shadow-card, --shadow-pop.
- Motion: --motion-fast 140ms, --motion-base 220ms, --ease-out.

## Components (`src/components/ui`)
Button (primary · secondary · ghost · danger; sm · md; busy), Badge (tone),
Card, Field (label, hint, error), Select, Table (columns, row click, selected
row, loading skeleton, empty), Modal (dialog, focus return), Toast (provider,
anchored message, undo), Tabs (URL-driven), EmptyState, Skeleton.
New screens are composed from these; extend them rather than adding look-alikes.
