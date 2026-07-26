# Build brief — @corbits/react-ui (shadcn registry)

This repository is a shadcn registry, not a component library. Every item here is
source that gets **copied into a consumer's repo** and owned by them from that point
on. Read `ARCHITECTURE.md` before changing the seams; read `CONTRIBUTING.md` before
opening a change.

## Rules

- **Generic names only.** Name an item for the job it does — agent, workflow,
  analytics, mail. No product-brand names in the public API, in a file name, or in
  a fixture.
- **No backend coupling.** Components never import a `@corbits/*` core and never
  fetch. Data arrives via props or a `DataPort`
  (`registry/corbits/lib/data-port.ts`).
- **Zero `@workbench` imports.** `npm run dep-guard` enforces it; run it before
  commit.
- **Minimum that works.** No wrapper components that only forward props, no config
  indirection, no speculative abstraction.

## Adding a registry item

1. Write the file under `registry/corbits/{ui,lib,hooks,blocks}/`.
2. Add an entry to `registry.json` — `dependencies` for npm packages,
   `registryDependencies` for other items (`@corbits/<name>`).
3. Render it in `app/page.tsx` so it is exercised in light and dark.
4. `npm run registry:build && npm run typecheck && npm run lint && npm run dep-guard`.
