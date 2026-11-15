# Implementation quality

## Preserve and contain

- Functionality, data, URLs, APIs and workflows keep working; existing
  business rules don't change unless AK approved it.
- Change only what the task needs. Cleanup, refactors, dependency upgrades
  and fixes you notice go into the change workflow's approval list.
- Keep diffs reviewable: no mass reformatting, no renaming outside scope.

## Dependencies

- Reuse what's installed. A new dependency needs a reason (it does something
  the platform/existing deps can't, or makes the code materially simpler),
  a check of its size and maintenance, and a mention in the final message.
- Never add a second library for the same job (two animation libraries, two
  component libraries, two icon sets).
- Pin versions the way the project does; update lockfiles with the project's
  package manager.

## Build correctness

Run the project's own checks before calling it done, as available:

| Check | Typical command |
|---|---|
| Build | `npm run build`, `vite build`, `next build`, `flutter build web` |
| Types | `tsc --noEmit`, `vue-tsc`, `svelte-check`, `flutter analyze` |
| Lint / format | `npm run lint`, `eslint`, `prettier --check`, `dart format` |
| Tests | `npm test`, `vitest`, `jest`, `php artisan test`, `pytest`, `flutter test` |
| Accessibility | `@axe-core/playwright`, `eslint-plugin-jsx-a11y` |

Only run tests that touch data against a confirmed local/test database
(always-on rules, section 0).

## Code standards

The always-on rules apply to UI code too: readable names, small functions,
one way to do one job, comments that explain why, no hard-coded staff names,
no secrets in front-end code (anything shipped to the browser is public).
