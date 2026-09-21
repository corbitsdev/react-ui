# Changelog

All notable changes to `@corbits/react-ui` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Until 1.0, a minor bump may contain a breaking change; breaking changes are always called
out under their own heading. Every subpath in the package's `exports` map is part of that
contract — modules that are not exported are internal and may change in any release.

## [Unreleased]

### Breaking changes since 0.1.0

- **84 modules removed — every module no known consumer imports.** A usage audit across
  the workbench, portal, scout and solutions-builder codebases showed these surfaces were
  unreachable from any consumer, so they were deleted rather than carried as semver
  promises. The removed clusters: the entire `DataPort` seam (`lib/data-port`,
  `lib/tanstack-data-port`, `hooks/use-collection-state`) and its dependents
  (`data-table`, `thread-list`, `command-queue`); the now-inbox surfaces (`mail-detail`,
  `triage-pane`, `context-strip`, `activity-timeline`, `moment-walker`, `actor-summary`);
  all scheduling (`schedule-*`, `run-once-flow`,
  `recurrence-input`); the workflow registry (`workflow-registry-*`, `workflow-catalog`,
  `workflow-dock`, `workflow-status-badge`); step-graph visualization (`step-graph`,
  `step-graph-node`, `step-sidebar`, `step-primitives`, `lib/step-graph-layout`);
  `subagent-dock`, `chat-dock` and `message-list`; the canvas/artifact-host surfaces
  (`access-notice`, `canvas-host`, `canvas-host-chrome`, `generative-block-view`,
  `artifact-detail`, `artifact-gallery`, `add-artifact-dialog`); and the unused
  primitives and screens (`dial`, `pagination`, `radio-group`, `pulsing-ring`,
  `dashboard`, `dashboard-section`, `whats-new`, `onboarding-tour`,
  `reconnecting-overlay`, `stat-tile`, `delta-badge`, `count-table`, `heatmap`,
  `kind-picker`, `toggle-list`, `managed-list`, `tenant-selector`, `thread-switcher`,
  `section-nav`, `sidebar-rail`, `sidebar-section`, `read-block`, `render-rail`,
  `failed-run-notice`, `live-run-header`, `live-run-inspector`, `time-range-control`,
  `library-search-input`, `catalog-glyph`, `command`, `lib/command-registry`,
  `dither-background`, and the hooks that only served them). `agent-turn` and
  `activity-block` stayed — `chat-thread` uses them. The package is now 113
  public modules. **`@tanstack/react-query` is no longer a peer dependency** —
  nothing in the package imports it.
- **`AuthLayout` no longer defaults its decorative panel to `DitherCanvas`.** The panel is
  now an explicit `panel` slot with no fallback — pass `<DitherCanvas />` or any other
  content. A caller that omitted `panel` to get the dither canvas for free now gets a
  bare panel instead. (`DitherBackground` was among the removed modules.)
- **`ui/command` is removed.** `Command` was a second, weaker inline command surface next
  to `CommandPaletteInline` — index-based keyboard navigation (which loses the highlighted
  row when the list re-sorts under a keystroke) and self-filtering, where the palette
  family deliberately leaves matching to the caller. `commandMatches` is gone
  with the component. The `./ui/command` subpath is gone. `lib/command-registry`
  (and `CommandAction`) is also in the unconsumed prune above.
- **A classless root now follows `prefers-color-scheme`.** Under
  `@media (prefers-color-scheme: dark)`, `:root` receives the dark tokens when neither
  `.dark` nor `.light` is present — a host that toggled dark mode by adding and removing
  `.dark` must now also add `.light` to `documentElement` for explicit light, or dark-OS
  users will see dark anyway. `dark:` utilities still require a real `.dark` ancestor.
  `ThemeProvider` writes `.light` for resolved-light mode, so hosts on the provider need
  no change.

## [0.1.0] - 2026-09-17

Nothing has been published before this, so the list below is what the surface consists of
rather than what changed.

- **197 public modules** — 152 UI components, 5 block modules, 16 hooks and 24 `lib` modules,
  importable by subpath (`@corbits/react-ui/ui/button`) or from the root. Output is
  per-file ESM with matching declarations; the package is side-effect free apart from its
  CSS, so either import style bundles only what you used.
- **A prebuilt stylesheet** — `@corbits/react-ui/styles.css` carries the tokens, the base
  layer, the component keyframes and every utility the components use, so a consumer needs
  no Tailwind and no build configuration. Consumers already on Tailwind v4 import
  `@corbits/react-ui/theme.css` instead. Both are generated from one source,
  `src/theme.css`.
- **The theme** — brand color, radius and type tokens for light and dark, plus a base
  layer carrying the ground, the default border color, the type and one `:focus-visible`
  ring. Dark mode is opt-in via a `dark` class on an ancestor; the host owns switching.
- **The `DataPort` seam** — components never fetch. `lib/data-port` declares the type,
  `lib/tanstack-data-port` is the default implementation over TanStack Query, and any
  object satisfying `DataPort` drops in with no component changes. Collections only.
- **`use-collection-state`** — collapses a collection into
  `loading | error | empty | ready` and renders nothing, so a table, list, grid or step
  rail branches on the same thing.
- **Component families** — base primitives (`button` `input` `card` `dialog` `table`
  `tabs` `badge` `switch` `command` `toast` `skeleton`), collection surfaces (`data-table`
  `sortable-table` `managed-list` `list-detail` `pagination`), shells (`page-shell`
  `chat-shell` `sidebar` `top-bar` `dashboard`), and the chat, workflow, schedule,
  artifact, analytics/chart, mail and activity families.
- **A validated chart palette** — five fixed-order series tokens, with `seriesDash` as the
  mandatory second, non-colour channel and `foldSeries` past five series.
- **Gates** — `bun run build` ends in a WCAG contrast test over the built `dist/styles.css`
  and `prepack` runs the build, so a failing theme cannot be published. `dep-guard` fails
  on an import from a forbidden unpublished scope, on any import of
  `@tanstack/react-query` outside the adapter, and on anything reachable from the root
  barrel importing an optional peer.
- **Peer dependencies** — React 18 or 19, `react-dom`, `lucide-react` (0.545 or 1.x),
  `sonner`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`,
  `@radix-ui/react-slot` and `@radix-ui/react-tooltip`.
  **`@tanstack/react-query` is optional** — needed only for the TanStack adapter, which is
  why that adapter is importable by subpath but absent from the root entry.

#### Notes

- The package ships **no `"use client"` directives**. A React Server Components consumer
  marks its own client boundary; see the README.
- `lib/chart-geometry` and `lib/chart-palette` are internal and deliberately not exported.

[Unreleased]: https://github.com/corbitsdev/react-ui/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/corbitsdev/react-ui/releases/tag/v0.1.0
