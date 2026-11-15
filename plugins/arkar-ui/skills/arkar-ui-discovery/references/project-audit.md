# Project audit (existing products)

Spend minutes, not hours: enough to make good decisions for the scope in
hand.

## 1. Stack and how it runs

| Look at | To learn |
|---|---|
| `package.json`, `composer.json`, `pyproject.toml`, `pubspec.yaml`, `build.gradle` | framework, UI libraries, animation libraries, build tooling, versions |
| `tailwind.config.*`, `@theme` blocks, CSS variables, `theme.ts`, `ThemeData` | tokens already in use |
| `components/`, `resources/views/`, `templates/`, `lib/widgets/` | component architecture and reuse |
| README, `docker-compose.yml`, `.env.example` | how to run it locally |
| `phpunit.xml`, `.env.testing`, settings, `firebase_options.dart` | where it points — local or production (don't run against production) |
| `DESIGN.md`, `ARCHITECTURE.md` | recorded identity, decisions and open proposals |

## 2. Map the screens in scope

For each screen: route/URL, template or component file, main data shown,
primary action, components used, and which other screens share them.
Shared components mean a change ripples — note it.

## 3. Follow the important workflows

Trace the two or three journeys that matter most (e.g. submit → approve →
notify) through routes, controllers/views and components. Note every state
the user can meet (loading, empty, error, success, permission denied,
offline) and whether it's designed.

## 4. Technical limits

Old framework versions, no build step, server-rendered HTML in Python
strings, a CSS framework that fights tokens, missing tests, inaccessible
custom controls, heavy dependencies. These shape what's realistic.

## 5. Write it down

Use the brief format in `SKILL.md`. Keep facts separate from opinions, and
problems separate from proposals beyond the request.
