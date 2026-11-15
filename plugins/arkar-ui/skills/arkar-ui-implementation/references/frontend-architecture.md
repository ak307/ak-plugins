# Frontend architecture — by stack

Follow the project's existing structure first. These are the conventions to
use when a project has none, or when adding to one that follows them. New
full-stack projects use `arkar-project-structure`'s templates.

## Inspect first

| File | Tells you |
|---|---|
| `package.json` | framework + version, state libs, UI libs, animation libs, scripts (`dev`, `build`, `lint`, `test`, `typecheck`) |
| `tsconfig.json`, `eslint.config.*` | strictness, path aliases, lint rules |
| `vite.config.*`, `next.config.*`, `nuxt.config.*`, `svelte.config.*`, `angular.json`, `astro.config.*` | build and routing setup |
| `composer.json`, `resources/js`, `resources/views` | Laravel front end (Blade, Livewire, Inertia + React/Vue) |
| `templates/`, `static/` | Django templates / htmx |
| `pubspec.yaml`, `lib/` | Flutter (state management, routing) |

## Conventions per stack

| Stack | Structure | State | Notes |
|---|---|---|---|
| React (Vite) | `src/components`, `src/features/<feature>`, `src/hooks`, `src/lib` | local state + context; the project's server-state library (TanStack Query, SWR) for fetched data | function components, hooks |
| Next.js (App Router) | `app/` routes, `components/`, server components by default, `"use client"` only where needed | server data via server components/actions; client state minimal | keep animation/interactive parts in small client components |
| Vue 3 / Nuxt | `components/`, `composables/`, `pages/` (Nuxt) | composables, Pinia for shared state | `<script setup>`, `<Transition>` |
| Svelte 5 / SvelteKit | `src/lib/components`, `src/routes` | runes (`$state`, `$derived`), stores where shared | `load` functions for data |
| Angular | feature folders, standalone components | signals, services | native CSS animations (`animate.enter/leave`); `@angular/animations` deprecated since v20.2 |
| Astro | `src/pages`, `src/components`, islands only where interactive | minimal client JS | view transitions built in |
| Plain HTML/CSS/JS | `index.html`, `css/` (tokens, base, components), `js/` modules | small modules, no global soup | progressive enhancement |
| Tailwind | theme tokens in `@theme` (v4) or `tailwind.config` (v3); components extracted for repeated patterns | — | no arbitrary values (`p-[13px]`, `text-[#3a3a3a]`) |
| Laravel Blade / Livewire | `resources/views/components`, Livewire components per feature | Livewire properties; Alpine for small client state | `wire:navigate`, `wire:transition` (v4 view transitions) |
| Laravel Inertia (React/Vue) | `resources/js/Pages`, `Components`, `Layouts` | props from controllers (via Resources); local state | Inertia `Link` with `viewTransition` (v2+) |
| Django templates / htmx | `templates/<app>/`, partials for htmx swaps, `static/` | server state; htmx attributes | `hx-swap … transition:true` |
| React Native | `src/screens`, `src/components`, `src/navigation` | the project's choice (Zustand, Redux, Query) | Reanimated 4, Gesture Handler v3, safe-area-context |
| Flutter | `lib/features/<feature>/{data,domain,presentation}` or the project's layout | Riverpod (`AsyncValue`) or the project's choice | `ThemeData` + `ThemeExtension`; `const` widgets |

## Rules

- Don't introduce a new framework, state library, CSS approach or component
  library into an existing project without AK's approval.
- One styling approach per project; don't mix Tailwind, CSS modules and
  inline styles arbitrarily.
- Keep server/client boundaries intentional (Next.js, Nuxt, SvelteKit,
  Astro): ship JavaScript only where interaction needs it.
