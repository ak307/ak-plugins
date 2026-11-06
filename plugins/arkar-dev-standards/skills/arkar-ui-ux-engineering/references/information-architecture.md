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

| Situation | Pattern |
|---|---|
| Few top-level areas, used constantly | persistent top bar or sidebar |
| Many areas, desktop-heavy admin | collapsible sidebar with groups |
| Mobile web | top bar with a menu, or a bottom bar for 3–5 primary destinations |
| Native mobile | the platform's tab bar / navigation bar conventions (see `arkar-ui-responsive-design`) |
| Multi-step task | a stepper with clear progress, back without data loss |
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
