# AGENTS.md

## Purpose

`@corbits/react-ui` is the React component library for agent and workflow
surfaces: chat, runs, artifacts, charts, layout and controls, with a Tailwind v4
theme. It owns the components, hooks, theme tokens and the prebuilt stylesheet.
It does not fetch data, talk to a backend, or import server-side packages; data
arrives as props.

## Layout

- `src/ui/`: components.
- `src/blocks/`: composed screens (login form, auth layout).
- `src/hooks/`: shared hooks (controllable state, popovers, list selection,
  reduced motion).
- `src/test/`: test helpers.
- `src/lib/`: internal helpers; not exported unless listed in `src/index.ts`.
- `src/index.ts`: the hand-written root barrel.
- `src/theme.css`, `src/styles.css`: tokens and keyframes; the prebuilt sheet
  entry.
- `stories/`: Ladle stories, kept out of `src/` so they never ship in `dist/`.
- `scripts/dep-guard.mjs`, `scripts/contrast-test.mjs`: the CI gates.
- `scripts/test-dom-setup.ts`: happy-dom preload for unit tests (`bunfig.toml`).
- `e2e/`: checks against the built package.

## Rules

- Sibling imports are relative and end in `.js`; there is no path alias.
- Public API goes in `src/index.ts`. A public module that statically imports an
  optional peer stays out of the barrel and gets its own `exports` entry.
  `dep-guard` fails if one reaches the barrel.
- No `@workbench/*` imports, and no server-side packages in a component.
- A `ui/` or `blocks/` module that calls a hook, creates a context, defines an
  inline handler or imports an optional peer starts with `"use client"`;
  stateless components and `hooks/`/`lib/` stay unmarked. `dep-guard` checks
  both ways.
- A framework-level library the consumer already has is a peer; adding a peer is
  a breaking change.
- Accessibility is a merge requirement: full keyboard operation, visible focus
  that returns to the opener when an overlay closes, real elements over roles,
  an accessible name on every control, colour never the only channel, and
  `prefers-reduced-motion` respected.
- Generic names only (agent, workflow, artifact, ...); no product brands in a
  module, prop, type or fixture.
- No `any` without a comment explaining why the type system leaves no
  alternative.

## Local development

```sh
bun install
bun run check
```
