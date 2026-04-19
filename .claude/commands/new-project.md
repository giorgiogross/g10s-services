---
description: Scaffold a new demo SPA project under src/projects and src/pages
argument-hint: <kebab-case-project-name>
---

Scaffold a new demo SPA project named `$ARGUMENTS`, mirroring the structure of the reference project at [src/projects/1-800-demo/](src/projects/1-800-demo/) and its route at [src/pages/1-800-demo/index.astro](src/pages/1-800-demo/index.astro).

## Inputs

- Project name (kebab-case, may begin with digits): `$ARGUMENTS`
- If `$ARGUMENTS` is empty, ask the user for the project name and stop.
- Validate the name matches `^[a-z0-9]+(-[a-z0-9]+)*$`. If not, ask the user to fix it and stop.
- If [src/projects/$ARGUMENTS/](src/projects/), [src/pages/$ARGUMENTS/](src/pages/), or [public/$ARGUMENTS/](public/) already exists, stop and tell the user — do not overwrite.

## Derived identifiers

From the kebab-case name, derive:

- **PascalCase** for the React component name (e.g. `1-800-demo` → `App1800Demo`, `cool-thing` → `AppCoolThing`). Always prefix with `App` so the identifier is valid even when the name starts with a digit.
- **camelCase store hook name** prefixed with `use` and suffixed with `Store` (e.g. `1-800-demo` → `use1800DemoStore`, `cool-thing` → `useCoolThingStore`). Same digit-prefix safety: the `use` prefix guarantees a valid identifier.
- **State interface name** as `State` + the PascalCase suffix (e.g. `State1800Demo`).

## Files to create

Create exactly these files. Use the existing 1-800-demo files as the template — match formatting, imports, and style.

1. `src/projects/$ARGUMENTS/index.tsx` — default-exported React component that renders a centered fullscreen `<div>` containing the project name string. Use the same inline-style fixed-inset flex-center pattern as the reference.
2. `src/projects/$ARGUMENTS/store/$ARGUMENTS-store.ts` — empty zustand store. Import `create` from `zustand`, declare an empty `State<Pascal>` interface, and export the `use<Pascal>Store` hook with `create<State<Pascal>>(() => ({}))`.
3. `src/projects/$ARGUMENTS/hooks/.gitkeep` — empty.
4. `src/projects/$ARGUMENTS/services/.gitkeep` — empty.
5. `src/pages/$ARGUMENTS/index.astro` — minimal Astro page that imports the React entry and mounts it with `client:only="react"`. Use the same head/body/global-style pattern as the reference page; set `<title>` to the project name.
6. `public/$ARGUMENTS/.gitkeep` — empty. This is where the project's static assets (images, fonts, etc.) live, served at `/$ARGUMENTS/<asset>`.

## After scaffolding

- Tell the user the route is available at `/$ARGUMENTS` once `npm run dev` is running.
- Do not run the dev server, install dependencies, or commit — leave that to the user.
