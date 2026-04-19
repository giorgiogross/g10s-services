# Repository layout

This repo is an Astro site that hosts multiple standalone SPA demo projects, each mounted under its own pathname. Each demo is a self-contained React app with its own hooks, services, store, and components. Astro is only used for routing and for mounting the React entry — all project logic lives in React.

## Per-project directory structure

A project named `<name>` (kebab-case, may start with digits, e.g. `1-800-demo`) is split across three top-level locations:

```
src/projects/<name>/      # all project code (entry, components, hooks, services, store)
  index.tsx               # default-exported React entry component
  hooks/                  # React hooks scoped to this project
  services/               # API clients, business logic, side-effect modules
  store/<name>-store.ts   # zustand store for this project
src/pages/<name>/         # routing only — thin Astro entry, no logic
  index.astro             # imports <name>/index.tsx and mounts with client:only="react"
public/<name>/            # static assets for this project, served at /<name>/<asset>
```

### Why the split

- `src/projects/<name>/` is the real home of the project. All hooks, services, components, and state live here. New files for a project go here unless they are an Astro page or a static asset.
- `src/pages/<name>/index.astro` exists only because Astro's file-based router needs it. Keep it minimal — it should only import the React entry and mount it. No business logic, no inline React.
- `public/<name>/` is where images, fonts, and other static assets for the project go. Reference them from React code as `/<name>/<file>`.

## State management

Every project uses [zustand](https://github.com/pmndrs/zustand). One store per project, co-located at `src/projects/<name>/store/<name>-store.ts`. Export conventions:

- Hook: `use<Pascal>Store` — always prefixed with `use` and suffixed with `Store` so the identifier is valid even when the project name begins with a digit (e.g. `1-800-demo` → `use1800DemoStore`).
- State interface: `State<Pascal>` (e.g. `State1800Demo`).

## Reference project

See [src/projects/1-800-demo/](src/projects/1-800-demo/) and [src/pages/1-800-demo/index.astro](src/pages/1-800-demo/index.astro) for the canonical layout. New projects should mirror it exactly.

## Scaffolding a new project

Use the `/new-project <kebab-case-name>` slash command defined in [.claude/commands/new-project.md](.claude/commands/new-project.md). It creates all three directories (`src/projects/`, `src/pages/`, `public/`) and wires up a centered fullscreen placeholder React component backed by an empty zustand store.

## Package manager

This repo uses **npm**. Only `package-lock.json` is committed. Do not introduce pnpm/yarn lockfiles.

## Landing page

The root path `/` is the g10s landing page and is not a project — it uses [src/layouts/Base.astro](src/layouts/Base.astro) and the components under [src/components/](src/components/). Those components are landing-page-specific and should not be imported by project code.
