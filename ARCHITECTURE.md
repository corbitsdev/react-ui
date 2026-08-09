# Architecture

`@corbits/react-ui` is an installed npm component library: the code lives in the
consumer's `node_modules` and is picked up by a version bump. Three properties shape
the layout.

**The public surface is a semver commitment.** Every subpath in `exports` is something
we have promised not to break casually, so the map is *generated* from a triage list in
`scripts/generate-exports.mjs` rather than hand-written — keeping a module internal is
the cheap direction. `lib/chart-geometry` is internal: it is rendering machinery whose
names appear in no public prop type. `lib/chart-palette` is public — a consumer painting
its own data marks needs the same ramp, in the same order, under the same rules.

**Tree-shaking is a requirement.** Output is per-file ESM — one `.js` and one `.d.ts`
per source file, no bundling — and `sideEffects` is declared CSS-only. The root entry is
re-exports only, so importing from the root and importing by subpath both bundle just
what you used. They are not guaranteed byte-for-byte identical — a bundler may order or
name things differently depending on the entry — but neither drags in a component you did
not reference. One module is deliberately excluded from the root entry; see below.

**Abstraction has to earn its place.** No config indirection, no speculative extension
points. There is no CLI, no component generator and no docs site, and that is deliberate.

## The build

`bun run build` is four steps and a gate, joined by `&&`, in order:

| Step | Tool | Output |
| --- | --- | --- |
| `generate` | `scripts/generate-exports.mjs` | `src/index.ts` and the `exports` map in `package.json` |
| `build:js` | SWC | `dist/**/*.js`, one per source file |
| `build:types` | `tsc -p tsconfig.build.json` | `dist/**/*.d.ts` |
| `build:css` | Tailwind v4 CLI | `dist/styles.css`, plus `dist/theme.css` copied from source |
| `contrast-test` | `scripts/contrast-test.mjs` | the gate — reads `dist/styles.css` |

SWC does the JavaScript because it is fast and per-file; `tsc` does the declarations
because SWC does not emit them. Nothing bundles, so nothing can merge two modules into
one chunk. `prepack` runs the whole thing, so a failing gate cannot be packed or
published.

Source imports are relative and carry `.js` extensions. There is no path alias, so the
emitted files are valid ESM for Node as well as for every bundler.

The package ships no `"use client"` directives; a React Server Components consumer marks
its own boundary (see README). Baking one framework's convention into a hundred
published files would make correctness depend on a build step no plain-React consumer
runs, and hide the boundary where the consumer cannot see it.

## The `DataPort` seam

Components in this package **never fetch**, and never import a server-side package. A
component that fetches has chosen the consumer's data layer for them; a component that
imports a server package drags a database tree into a browser bundle.

Data arrives one of two ways: as props, or through a `DataPort`.

```ts
type DataPort = {
  readonly useCollection: <T>(request: CollectionRequest<T>) => CollectionResult<T>;
};
```

A component declares *what* it needs — a stable cache key plus a `fetch` thunk that takes
`{ signal, offset, pageSize }` and returns `{ items, nextOffset }` — and learns nothing
about how the result is cached, deduped or revalidated. The port is resolved from React
context (`DataPortProvider` / `useDataPort`), and `useDataPort` throws with a wiring
message rather than returning `null`.

Three details in `CollectionResult` are load-bearing:

- **`isLoading` and `isFetching` are separate.** `isLoading` means there is nothing to
  show yet; `isFetching` means a request is in flight, including a background refetch
  over rows already on screen. Only `isFetching` is an honest input to `aria-busy`.
- **Pagination costs one field, not a second code path.** A source that returns
  everything at once reports `nextOffset: null`. There is no paginated variant of any
  component.
- **Collections only.** There is deliberately no `useRecord` and no `useMutation` — a
  mutation shape invented before its first consumer is a shape that will be wrong.

`createTanstackDataPort()` (`lib/tanstack-data-port`) implements `DataPort` over TanStack
Query's infinite-query API. It is a separate module on purpose: the seam is the type, the
adapter is one implementation, and that separation is what lets `@tanstack/react-query`
stay an **optional** peer. A consumer on SWR, a websocket cache or a fixture port swaps
the provider value and changes no component.

The adapter is therefore the one public module excluded from the root barrel
(`BARREL_EXCLUDED` in `scripts/generate-exports.mjs`). `src/index.ts` is a single module:
a bundler tree-shakes *bindings* out of it, but still resolves every module it re-exports,
so re-exporting the adapter would make `import { Button } from "@corbits/react-ui"` fail
outright for anyone who did not install the optional peer. This is bundler-dependent —
Node and Vite fail, Turbopack compiles it — so `dep-guard` walks the relative import graph
from `src/index.ts` and fails if anything reachable from it imports an optional peer.

## `use-collection-state`

Every collection surface — a table, a list, a grid, a step rail — has the same four
states. `useCollectionState(request)` collapses a `CollectionResult` into exactly that
discriminated union and **renders nothing**.

```ts
type CollectionState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "empty" }
  | { status: "ready"; items: readonly T[] };
```

The ordering is the whole machine: `isLoading` wins, then `error`, then an empty `items`,
then ready. Getting it wrong is how a surface renders "no results" during a first load, or
an empty state over a failed request. It renders nothing because the markup belongs to the
surface; `isFetching`, `refetch`, `hasNextPage` and `fetchNextPage` pass through unchanged.

## `CommandPalette`

`CommandPalette` is a global-search overlay with no idea what it is searching. It takes
`groups: CommandPaletteGroup[]` — pre-matched, pre-ordered, pre-paginated — plus `loading`,
`error` and `hasMore`/`onLoadMore`, and renders the states every such surface needs:
grouped results, loading, empty, error, "load more". Matching, ranking, debouncing and the
data source are entirely the caller's; a consumer wiring in server-searched entities keeps
that fetch, its debounce, and its pagination cursor in its own state, not in this
component.

Only `item.title` and `item.subtitle` are ever rendered — never `item.id`. A consumer that
hands in a raw identifier as a title has nothing else to fall back on, but the component
itself never does that substitution for you.

Keyboard state lives in `useCommandPaletteNavigation`, a separate headless hook: it tracks
the active row by id rather than index, because the row a person is on has usually just
been resorted by a fresh keystroke, and an index would silently point at a different item
than the one they were looking at.

The dialog's fade is the existing `Dialog` opacity transition — no scale, no position — and
that transition already collapses under `prefers-reduced-motion` at the theme layer. A
palette a person opens dozens of times a day should not also compete with itself for
attention.

## The theme layer

`src/theme.css` is the only CSS source. It carries the design tokens **and** a base layer:
the default border color, the ground, the type, the reduced-motion opt-out, the component
keyframes, and one `:focus-visible` ring for the whole app. Primitives do not declare their
own focus ring.

The build produces two artifacts from it, neither maintained by hand:

- **`dist/styles.css`** — Tailwind compiles `src/styles.css` (two `@import` lines:
  Tailwind, then the theme) into a standalone sheet. The consumer needs no Tailwind.
- **`dist/theme.css`** — a byte copy of `src/theme.css`, for a consumer who already runs
  Tailwind v4 and wants the utilities generated by their own build.

That second path costs one `@import` because the theme carries its own `@source "./"`.
Tailwind resolves `@source` relative to the file containing it, so it means `src/` when we
build the standalone sheet and `dist/` when a consumer imports it out of `node_modules`.
Since there is only one file, the tokens and keyframes cannot drift between the two.

Dark mode is opt-in through a `dark` class on an ancestor. `ThemeProvider`
owns applying that class (and `data-theme` presets + `color-scheme`) and
persisting the choice; the host mounts the provider and keys storage per user.

### Contrast is gated

`contrast-test` is the last step of the build. It parses the **built** `dist/styles.css`
for the `:root` and `.dark` custom properties and derives its pairs from token *names*,
never from listed hexes, so a new `--warning` / `--warning-foreground` is covered on the
next run with no edit. Six rules:

1. every `X-foreground` clears 4.5:1 on its own `X`;
2. `foreground` and `muted-foreground` clear 4.5:1 on every surface they can land on
   (`background`, `card`, `popover`, `muted`);
3. `primary-emphasis` clears 4.5:1 on `background` and `card` — it is used as text and as
   a border;
4. `input` and `ring` clear the 3:1 UI-component threshold on both surfaces;
5. every `chart-N` clears 3:1 against both surfaces;
6. a card is separable from the page by at least 1.2:1, satisfied by *either* its fill or
   its border.

Both modes run every time, with dark treated as an override layer over light so a token
dark does not restate is still checked at its inherited value.

Two token decisions follow from this and are worth knowing before you edit the theme.
Backgrounds are white in light and pure black in dark — fixing the ground first is what
makes everything downstream measurable. And a role that fails its measurement gets a new
token, never a nudged hex: `--primary` is the fill orange, `--primary-emphasis` the darker
one legal for rings, borders and text; `--border` is decorative while `--input` is the
control boundary that must clear 3:1.

### The chart palette

The five `--chart-*` tokens are a **fixed order, not a pool**. Slot 1 is always the first
series in the data. Colour carries identity, so filtering a series out never repaints the
survivors.

Their steps and ordering — blue, orange, violet, green, red — were selected by running a
palette validator rather than by eye: each step sits inside its mode's lightness band,
clears the chroma floor, holds ≥3:1 against both the page and a card, and the order keeps
adjacent pairs separable under simulated protanopia and deuteranopia. Light mode clears the
ΔE 8 target (worst adjacent pair 10.5); dark mode lands at 7.2, which is legal **only**
alongside a second, non-colour channel.

That is why `seriesDash()` exists next to `seriesColor()`, and why every chart ships a
legend, direct labels and a data table rather than treating them as polish: the palette is
compliant *because* they are there. Past five series `seriesColor` returns the muted ink
rather than cycling or inventing a hue — use `foldSeries` so the label says "lumped
together" too. The contrast gate re-checks the 3:1 half on every build; the colour-vision
half cannot be re-derived from hex pairs, so if you re-step these tokens, re-run the
validator yourself.

## Pieces, then one wrapper

A composite surface — an inspector, a registry list, a step diagram — is built as small
stateless pieces plus at most one composition wrapper. Each piece is its own file and its
own export, takes everything through props, holds no state of its own, and renders on its
own (`StatusChip`, `ScopePill`, `StepList`, `LiveRunHeader`, `WorkflowRegistryRow`). The
wrapper (`LiveRunInspector`, `WorkflowRegistryList`) contains no markup the pieces do not
already carry: it only decides which pieces render and in what order, so replacing one
piece never means forking the wrapper.

Behaviour and arithmetic split out the same way: a reusable behaviour becomes a headless
hook in `src/hooks/` (`use-scroll-current-into-view` renders nothing and returns a ref),
and layout math becomes plain functions in `src/lib/` (`step-graph-layout`, like
`chart-geometry`, is numbers in and numbers out, checkable without rendering anything).

## Layout

| | |
| --- | --- |
| `src/ui/` | Components. Primitives, collection surfaces, shells, and the domain families. |
| `src/lib/` | Non-component source: `utils`, the `DataPort` seam and its adapter, the per-domain shapes, and the internal chart palette and geometry. |
| `src/hooks/` | `use-collection-state`. |
| `src/blocks/` | Multi-file compositions (`login`, `access-notice`). |
| `src/theme.css` | Tokens, keyframes, base layer. The only CSS source. |
| `src/styles.css` | Two `@import`s. The entry Tailwind compiles into `dist/styles.css`. |
| `src/index.ts` | The root barrel. **Generated** — do not edit. |
| `scripts/generate-exports.mjs` | Writes `src/index.ts` and the `exports` map. Holds the internal-module triage list. |
| `scripts/contrast-test.mjs` | The theme gate. Reads `dist/styles.css`. |
| `scripts/dep-guard.mjs` | The forbidden-import gates. |
| `dist/` | Build output. Generated, not committed; the only thing `files` publishes. |

## Known limits

- **`DataPort` covers collections only.** Single-record reads and mutations are absent by
  decision, not by oversight.
- **No tests.** There is no test runner in this repo. The measurable half of appearance
  (contrast, in both modes) is gated; layout and behaviour are not.
- **No rendering gallery.** Nothing in this repo renders the components; visual review
  means rendering the package inside a consumer app.
- **The prebuilt stylesheet restyles the consuming page** — it carries Tailwind's
  preflight and a base layer. See the README before importing it.
- **The theme assumes Tailwind v4 CSS variables.** A consumer on a Tailwind
  config-object setup has to translate them, or import `dist/styles.css` and ignore the
  theme layer entirely.
