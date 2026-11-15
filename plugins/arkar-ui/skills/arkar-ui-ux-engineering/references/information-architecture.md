# Information architecture and navigation

## Structure from tasks, not from the database

- List the users' top tasks and group screens by them. A menu that mirrors
  tables (Users, Records, Settings2) forces users to know the data model.
- Keep the primary navigation short (about 5–7 top-level items); put rare
  tasks under a clear secondary place (settings, more).
- Name things in the users' words (what they call a claim, a job, a visit),
  consistently across navigation, headings, buttons and messages.

## Where am I, where can I go

- The current location is always visible: active navigation item, page
  title, breadcrumbs for deep hierarchies.
- Each screen's title says what it is; the browser tab title matches.
- Detail views show how to get back to the list and keep the list's filters
  and scroll position.
- Deep links work: every meaningful view has a URL (filters and tabs in the
  query string where sharing them is useful).

## Navigation patterns

Count the destinations first; the pattern follows. The full standard —
what may stay pinned, the header as a state of the page, the scroll edge,
material and size — is in `navigation-and-header.md`.

| Situation | Pattern |
|---|---|
| One destination (a single-purpose tool, a flow) | no navigation: the page's context and a way back or out |
| 2–5 parallel areas | tabs or a segmented control in the header |
| 6 or more areas, or grouped ones | a side rail with groups, collapsible |
| Mobile web | a bottom bar for the top 3–5 destinations (and "More"); the top keeps only the context |
| Native mobile | the platform's tab bar / navigation bar conventions (see `arkar-ui-responsive-design`) |
| Multi-step task | a stepper with clear progress, back without data loss; other navigation steps back |
| Within one record | tabs for parallel facets, sections for a long single view |

## Search and filters

- Search where users expect it, scoped and labelled ("Search claims").
- Filters near what they filter, showing active filters as removable chips,
  with a clear reset.
- Results update quickly and show the count; empty results suggest what to
  change.

## Permissions and roles

- Hide what users can never use; disable (with the reason) what they can't
  use right now.
- Make the consequences of role differences obvious (e.g. "Only finance can
  approve above S$5,000").
