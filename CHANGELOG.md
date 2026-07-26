# Changelog

All notable changes to `@corbits/react-ui` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this registry follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Until 1.0, a minor bump may contain a breaking change; breaking changes are always
called out under their own heading.

One caveat specific to a **source registry**: a version here describes the state of
`registry.json` and the files it names, not an artifact you have installed. Items are
copied into your repository by `shadcn add` and owned by you from that moment, so a
release does not reach an already-copied file. Read a breaking change as "the source
you would copy today differs from the source you copied then" and take the diff.

## [Unreleased]

### 0.1.0 — first release

Initial release. Nothing has been published before this, so everything is new; the
list below is what the surface consists of rather than what changed.

- **A shadcn registry of 108 items** — 1 theme, 16 lib modules, 1 hook, 89 UI
  components and 2 blocks — served as `public/r/{name}.json` and installed with
  `npx shadcn add @corbits/<name>`. Transitive registry dependencies resolve
  automatically.
- **`corbits-theme`** — brand color, radius and type tokens for light and dark, plus
  a base layer carrying the ground, the default border color, the type and one
  `:focus-visible` ring for the whole app. Dark mode is opt-in via a `.dark` class;
  the host owns theme switching.
- **The `DataPort` seam** — components never fetch and never import a `@corbits/*`
  backend core. `data-port` declares the type, `tanstack-data-port` is the default
  implementation over TanStack Query, and any object satisfying `DataPort` drops in
  with no component changes. Collections only: single-record reads and mutations are
  deliberately absent until a real consumer needs them.
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
- **Gates** — `registry:build` runs `shadcn build` and then a WCAG contrast test over
  the built theme, deriving its pairs from token names in both modes; `dep-guard`
  fails on an import from the forbidden unpublished scope; `app/fixture/page.tsx`
  renders `DataTable` through a hand-written `DataPort` with no TanStack in it, as
  the pluggability regression gate.
- Requires React 19, Next 16 (for the docs app) and Tailwind v4 CSS variables.

[Unreleased]: https://github.com/corbitsdev/react-ui
