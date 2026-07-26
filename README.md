# @corbits/react-ui

The Corbits **shadcn registry**. Components are copied into your app by the shadcn CLI —
you own the source. Generic naming throughout (agent / workflow / analytics / mail); no
product-brand names in the public API.

This is a registry, not an npm package: there is nothing to `npm install`, and
`@corbits/react-ui` is not published to npm. The name is the registry namespace the
shadcn CLI resolves.

Licensed LGPL-2.1-only (see `LICENSE`).

## Install a component

Point your app's `components.json` at the registry, then add items by namespace:

```jsonc
// components.json
"registries": { "@corbits": "https://ui.corbits.dev/r/{name}.json" }
```

```bash
npx shadcn@latest add @corbits/corbits-theme @corbits/button @corbits/data-table
```

Transitive registry dependencies install automatically. `data-table` pulls `table`,
`data-port`, `use-collection-state` **and `tanstack-data-port`**, so the default path
works on first run — there is no separate step to go and find an adapter.

## What ships today

`registry.json` is the list of record — 108 items. By type:

| Type | Count | The load-bearing ones |
| --- | --- | --- |
| theme | 1 | `corbits-theme` — brand color, radius and type tokens plus a base layer; light + dark |
| lib | 16 | `utils` (`cn()`), `data-port`, `tanstack-data-port`, `chart-palette`, `chart-geometry`, `command-registry`, and the per-domain shapes (`workflow-run`, `schedule`, `artifact`, `activity`, `chat-message`, `now-item`, `time-range`, `relative-time`, `csv`) |
| hook | 1 | `use-collection-state` — loading / error / empty / ready, for any collection surface |
| ui | 89 | Primitives (`button` `input` `card` `dialog` `table` `tabs` `badge` `switch` `command` `toast` `skeleton`), collection surfaces (`data-table` `sortable-table` `managed-list` `list-detail` `pagination`), shells (`page-shell` `chat-shell` `sidebar` `top-bar` `dashboard`), and the domain families — chat, workflow, schedule, artifact, analytics/chart, mail, activity |
| block | 2 | `login`, `access-notice` |

Run `npm run dev` to see every item rendered in light and dark on one page; that page
is also the pluggability and regression gate described below.

## Data ports

Components never fetch, and never import a `@corbits/*` backend core. They declare *what*
they need through a `DataPort` and the host decides how it is fetched:

```ts
type DataPort = {
  useCollection: <T>(request: CollectionRequest<T>) => CollectionResult<T>;
};
```

`createTanstackDataPort()` is the default. Any object satisfying `DataPort` — SWR, a
websocket cache, a test fixture — drops in with no component changes:

```tsx
<DataPortProvider value={createTanstackDataPort()}>
  <DataTable
    request={{
      key: ["runs"],
      pageSize: 50,
      fetch: ({ signal, offset, pageSize }) => api.runs({ signal, offset, pageSize }),
    }}
    …
  />
</DataPortProvider>
```

A `fetch` returns `{ items, nextOffset }`. A source that returns everything at once
reports `nextOffset: null` and never grows a second page — pagination costs one field,
not a second code path. `CollectionResult` distinguishes `isLoading` (nothing to show
yet) from `isFetching` (a background refetch over cached rows), because only the second
one is the honest input to `aria-busy`.

`useCollectionState(request)` collapses a collection into `loading | error | empty |
ready` without rendering anything, so a list, grid or step rail branches on the same
thing `data-table` does instead of copying its `<TableBody>` logic. `app/fixture/page.tsx`
renders `DataTable` through a hand-written `DataPort` with no TanStack in it at all —
that page is the pluggability regression gate.

Single-record reads and mutations are **not** in `DataPort` yet: nothing has a caller for
them, and inventing a mutation shape now would bake in the wrong one.

A `DataPort` is a plain record of functions minted by a factory and resolved at the seam —
no class hierarchy, and not a plugin framework.

## Tokens

**Backgrounds are White in light and pure Black in dark — never cream.** Cream is an
*element* color: it carries text, borders and surfaces on dark grounds only, and gray
carries them on light grounds. The two element neutrals never cross over.

Because the ground is right, the orange needs no correction. Brand dark orange `#bf6b20`
measures **5.34:1 on black** and ships as-is.

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `#ffffff` | `#000000` |
| `--foreground` | `#2b2627` gray — 14.90:1 | `#e4d5bc` cream — 14.54:1 |
| `--card` (elevation) | `#f2f4f5` Paper White | `#2b2627` — 1.41:1 off black |
| `--primary` (fill) | `#e98428` — ink label 5.53:1 | `#bf6b20` — black label 5.34:1 |
| `--primary-active` (hover/press) | `#d4791f` — ink label 4.65:1 | `#d4791f` — black label 6.55:1 |
| `--primary-emphasis` (ring, border, orange text) | `#9a5416` — 5.75:1 on white | `#e98428` — 7.80:1 on black |
| `--accent` / `--secondary` (Summit Blue) | `#c5d2de` — ink 9.68:1 | `#2d455c` — cream 6.87:1 |
| `--success` (Ridge Green) | `#c1d1be` — ink 9.32:1 | `#425a3d` — cream 5.27:1 |
| `--border` (decorative) | `#dfe3e6` | `#423a3b` |
| `--input` (control boundary) | `#8a8080` — 3.83:1 on white | `#8a8080` — 5.48:1 on black |

`--primary-active` is one hex serving both modes: darker than `#e98428` in light,
brighter than `#bf6b20` in dark. `#d4791f` is no longer a primary anywhere.

`--primary-emphasis` exists because the fill orange is not a legal *outline* color —
`#e98428` on white is 2.44:1, below even the 3:1 UI-component threshold. Use `--primary`
for fills and `--primary-emphasis` for rings, borders and orange-on-ground text.

`--border` and `--input` are **not** interchangeable. `--border` is decorative (card
edges, dividers). `--input` is the control boundary and is the only one that clears 3:1
against both the page and the card, so inputs and outline buttons must use it.

`--accent` and `--secondary` currently hold the same value in each mode: the brand
defines exactly one Summit Blue step per mode, so both shadcn roles land on it. They are
kept as two names because shadcn components reference them for different jobs; the right
follow-up is to collapse them, not to invent an off-brand hex to tell them apart.

`--destructive` is derived (the brand palette carries no error color). Type is Red Hat
Display with Space Mono for data readouts; Belwe and Tratex are licensed brand faces and
are not shipped here.

Dark mode is opt-in via a `.dark` class on an ancestor — the host owns theme switching.

`@corbits/corbits-theme` ships a **base layer** as well as the tokens: the default border
color, the ground, the type, and one `:focus-visible` ring for the whole app. Primitives
do not declare their own focus ring.

Every pair in the table is enforced by `scripts/contrast-test.mjs`, which runs as part of
`npm run registry:build` and reads the built `corbits-theme.json` — so a token added
later is covered without touching the test.

## Development

```bash
npm run dev            # docs app on :3333, primitives in light and dark
npm run registry:build # emit public/r/*.json, then gate on the contrast test
npm run typecheck
npm run lint
npm run dep-guard      # fails on an import from the forbidden unpublished scope
```

To install from a local build: `npm run registry:build && npm start`, then point a
consumer's `components.json` at `http://localhost:3333/r/{name}.json`.
