# AK's UI standard (always on) — arkar-ui v4.0.0

This is the UI part of AK's coding standards; the rest is in the
`arkar-dev-standards` plugin, and its Rule 0 (production safety) comes before
everything here. If this points at a skill that doesn't exist, tell AK: an old
copy of a plugin is loaded, or `arkar-dev-standards` isn't switched on here.

## 2b. UI work: designed and checked for real

Whenever you build, change, style, animate or fix anything users see (web
or app) — **load
`arkar-ui-intelligence` first** (with `arkar-change-workflow` for existing
code). It picks the `arkar-ui-*` specialists and ends with
`arkar-ui-visual-qa`: the real UI checked on local or test data. Decide
freely within what AK asked; propose anything beyond it. Never claim checks
you didn't run. **Most important: premium, Apple-level polish in look and
behaviour — never accept UI just because it works.** Decide once, write the
build sheet, build once.
