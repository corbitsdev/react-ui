# Changelog

All notable changes to `@corbits/react-ui` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Until 1.0, a minor bump may contain a breaking change; breaking changes are always
called out under their own heading.

Every subpath in the package's `exports` map is part of that contract. Modules that
are not exported are internal and may change in any release.

## [Unreleased]

### 0.1.0 — first release

Initial release. Nothing has been published to npm before this, so everything is new;
the list below is what the surface consists of rather than what changed.

Before this release the same source was a **shadcn registry** served by a Next.js app,
installed by copying files with `shadcn add`. That was never published. It is now an
installed package: the Next.js app, the registry manifest and the generated registry
JSON are gone, and the components are imported from `node_modules` instead of copied.

- **A component library of ~106 public modules** — 89 UI components, 2 blocks, 1 hook
  and the per-domain `lib` modules — importable by subpath
  (`@corbits/react-ui/ui/button`) or from the root. Output is per-file ESM with
  matching declarations; the package is side-effect free apart from its CSS, so
  either import style bundles only what you used.
- **A prebuilt stylesheet** — `@corbits/react-ui/styles.css` carries the tokens, the
  base layer, the component keyframes and every utility the components use. A
  consumer needs no Tailwind and no build configuration. Consumers already on
  Tailwind v4 import `@corbits/react-ui/theme.css` instead, a single directive that
  points Tailwind at the package's own class names. Both are generated from one
  source, `src/theme.css`.
- **The theme** — brand color, radius and type tokens for light and dark, plus a base
  layer carrying the ground, the default border color, the type and one
  `:focus-visible` ring for the whole app. Dark mode is opt-in via a `dark` class on
  an ancestor; the host owns theme switching.
- **The `DataPort` seam** — components never fetch and never import a `@corbits/*`
  backend core. `lib/data-port` declares the type, `lib/tanstack-data-port` is the
  default implementation over TanStack Query, and any object satisfying `DataPort`
  drops in with no component changes. Collections only: single-record reads and
  mutations are deliberately absent until a real consumer needs them.
- **`use-collection-state`** — collapses a collection into
  `loading | error | empty | ready` and renders nothing, so a table, list, grid or
  step rail branches on the same thing.
- **Component families** — base primitives (`button` `input` `card` `dialog` `table`
  `tabs` `badge` `switch` `command` `toast` `skeleton`), collection surfaces
  (`data-table` `sortable-table` `managed-list` `list-detail` `pagination`), shells
  (`page-shell` `chat-shell` `sidebar` `top-bar` `dashboard`), and the chat,
  workflow, schedule, artifact, analytics/chart, mail and activity families.
- **A validated chart palette** — five fixed-order series tokens whose steps and
  ordering were selected by running the data-visualisation standard's palette
  validator, with `seriesDash` as the mandatory second, non-colour channel and
  `foldSeries` past five series.
- **Gates** — `npm run build` ends in a WCAG contrast test over the built
  `dist/styles.css`, deriving its pairs from token names in both modes, and `prepack`
  runs the build, so a failing theme cannot be published. `dep-guard` fails on an
  import from the forbidden unpublished scope, and on any import of
  `@tanstack/react-query` outside the adapter that is allowed to have it.
- **Peer dependencies** — React 18 or 19, `react-dom`, `lucide-react` (0.545 or 1.x),
  `sonner`, `@radix-ui/react-dialog` and `@radix-ui/react-slot`.
  **`@tanstack/react-query` is optional** — needed only for the TanStack adapter.

#### Notes

- The package ships **no `"use client"` directives**. A React Server Components
  consumer marks its own client boundary; see the README.
- `lib/chart-geometry` and `lib/chart-palette` are internal and deliberately not
  exported. They are rendering machinery for the chart components.

[Unreleased]: https://github.com/corbitsdev/react-ui
