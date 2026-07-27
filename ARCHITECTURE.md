# Architecture

`@corbits/react-ui` is an **installed npm component library**. It was previously a
shadcn source registry served by a Next.js app; that app and the registry JSON are
gone. Everything below describes the package.

## The package is a library, not a source distributor

The code lives in the consumer's `node_modules`, they import it, and we keep
ownership: a bug is fixed upstream and picked up by a version bump. Three
consequences shape the layout:

1. **The public surface is a semver commitment.** Every subpath in `exports` is
   something we have promised not to break casually. That is why the map is
   *generated* from a triage list in `scripts/generate-exports.mjs` rather than
   hand-written — the cheap direction is to keep a module internal, and only the
   modules a consumer genuinely needs are exported. `lib/chart-geometry` and
   `lib/chart-palette` are internal: they are rendering machinery for the chart
   components and their names appear in no public prop type.
2. **Tree-shaking is a requirement, not a hope.** Output is per-file ESM — one
   `.js` and one `.d.ts` per source file, no bundling — and the package declares
   `sideEffects` as CSS-only. The root entry is re-exports only, so importing from
   the root and importing by subpath produce identical bundles — with one
   deliberate exception, below.
3. **Abstraction has to earn its place.** A wrapper that only forwards props is dead
   weight. The rule in this repo is "the minimum that works": no config indirection,
   no speculative extension points, no plugin framework. There is no CLI, no
   component generator and no docs site, and that is deliberate.

### The build

`npm run build` is four steps and a gate, in order:

| Step | Tool | Output |
| --- | --- | --- |
| `generate` | `scripts/generate-exports.mjs` | `src/index.ts` and the `exports` map in `package.json` |
| `build:js` | SWC | `dist/**/*.js`, one per source file |
| `build:types` | `tsc --emitDeclarationOnly` | `dist/**/*.d.ts` |
| `build:css` | Tailwind v4 CLI | `dist/styles.css`, plus `dist/theme.css` copied from source |
| `contrast-test` | `scripts/contrast-test.mjs` | the gate — reads `dist/styles.css` |

SWC does the JavaScript because it is fast and per-file; `tsc` does the declarations
because SWC does not emit them. Nothing bundles, so nothing can accidentally merge
two modules into one chunk and defeat point 2 above.

Source imports are **relative and carry `.js` extensions**. There is no path alias
and therefore no alias-resolution step in the build — the emitted files are valid
ESM for Node as well as for every bundler.

### No `"use client"`

The package ships no client-boundary directives. A React Server Components consumer
marks its own boundary by re-exporting the interactive components from a file it
owns (see README). The alternative — baking one framework's convention into a
hundred published files — makes the package's correctness depend on a build step no
plain-React consumer runs, and hides the boundary where the consumer cannot see it.

## Naming

Components are named for **the job**, never for a product. Agent, workflow,
analytics, mail, schedule, artifact, activity. A consumer importing
`activity-timeline` gets a timeline of activity; they should not have to learn a
product's vocabulary to guess what something does.

## The `DataPort` seam

Components in this package **never fetch**, and never import a `@corbits/*` backend
core. This is the hardest boundary in the repo, and it is not stylistic.

A component that fetches is a component that has chosen the consumer's data layer
for them. A component that imports `@corbits/mailbox-core` is worse: the cores are
backend packages that pull in `drizzle-orm`, `postgres` and a database handle. An
`import` of one into a file that lands in a browser bundle is not a dependency
mistake, it is a category error, and it would drag a server-only tree into a client
build. `npm run dep-guard` exists to make the whole class of leak fail loudly rather
than quietly (see CONTRIBUTING.md).

So data arrives one of two ways: as **props**, or through a `DataPort`.

```ts
type DataPort = {
  readonly useCollection: <T>(request: CollectionRequest<T>) => CollectionResult<T>;
};
```

A component declares *what* it needs — a stable cache key plus a `fetch` thunk that
takes `{ signal, offset, pageSize }` and returns `{ items, nextOffset }` — and learns
nothing about how the result is cached, deduped or revalidated. The port is resolved
from React context (`DataPortProvider` / `useDataPort`), and `useDataPort` throws with
a wiring message rather than returning `null`, because a missing provider is a
programming error the developer should meet immediately.

Three details in `CollectionResult` are load-bearing:

- **`isLoading` and `isFetching` are separate.** `isLoading` means there is nothing
  to show yet; `isFetching` means a request is in flight, including a background
  refetch over rows already on screen. Only `isFetching` is an honest input to
  `aria-busy` — announcing "busy" over a fully rendered table because it is
  revalidating is noise, and announcing nothing during a first load is a lie.
- **Pagination costs one field, not a second code path.** A source that returns
  everything at once reports `nextOffset: null` and never grows a second page. There
  is no paginated variant of any component.
- **Collections only.** There is deliberately no `useRecord` and no `useMutation`.
  Nothing in the package has a caller for them, and a mutation shape invented before
  its first consumer is a shape that will be wrong. They get added when a real
  consumer lands — and adding them then is a smaller change than unpicking a guess.

### The TanStack adapter is a default, not the seam

`createTanstackDataPort()` (`lib/tanstack-data-port.ts`) implements `DataPort` over
TanStack Query's infinite-query API, and it is the default because most consumers
already have TanStack in the tree. It is a *separate module* from `data-port` on
purpose: the seam is the type, the adapter is one implementation of it.

That separation is what lets `@tanstack/react-query` be an **optional** peer
dependency. A consumer on SWR, on a websocket cache, or on a hand-written fixture
port installs neither the adapter's import nor its package, swaps the provider value,
and changes no component.

### The adapter is subpath-only, and that is load-bearing

`lib/tanstack-data-port` is the one public module **excluded from the root barrel**
(`BARREL_EXCLUDED` in `scripts/generate-exports.mjs`). The reason is the exception to
point 2 at the top of this document, and it is not a style preference.

`src/index.ts` is a single module. A bundler can tree-shake *bindings* out of it, but
the module graph is still walked and every module it re-exports is still resolved. So
re-exporting the adapter from the barrel makes `import { Button } from
"@corbits/react-ui"` fail outright for any consumer who did not install the optional
peer — `ERR_MODULE_NOT_FOUND` under Node, an unresolved-export error under Vite. The
optional peer becomes mandatory, which is precisely the thing the seam exists to
prevent.

This is worth stating plainly because it is **bundler-dependent**: Next's Turbopack
compiles it without complaint. A change verified only against a server-components
consumer will look fine and ship broken. `dep-guard` therefore walks the relative
import graph from `src/index.ts` and fails if anything reachable from it imports an
optional peer — the property that actually matters, checked independently of the
generator that is supposed to maintain it.

A `DataPort` is a plain record of functions minted by a factory. Not a class, not a
hierarchy, not a plugin system. That is what makes a fixture port a ten-line object
rather than a subclass.

**The seam is gated, not just asserted.** `npm run dep-guard` fails if anything
outside `lib/tanstack-data-port.ts` imports `@tanstack/react-query`, and separately
if anything reachable from the root barrel imports it. Both routes to turning the
optional peer into a required one are closed.

## `use-collection-state`

Every collection surface — a table, a list, a grid, a step rail — has the same four
states: loading, error, empty, ready. `useCollectionState(request)` collapses a
`CollectionResult` into exactly that discriminated union and **renders nothing**.

```ts
type CollectionState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "empty" }
  | { status: "ready"; items: readonly T[] };
```

The ordering is the whole machine: `isLoading` wins, then `error`, then an empty
`items`, then ready. Getting that order wrong is how a surface renders "no results"
during a first load, or renders an empty state over a failed request and tells the
user their data does not exist when in fact the request failed. Deriving it once,
here, is what stops three surfaces from each deriving it slightly differently.

It renders nothing because the markup is the surface's. A list is not a table with
different CSS, and a hook that returned JSX would force one of them to fight it.
`isFetching`, `refetch`, `hasNextPage` and `fetchNextPage` pass through unchanged, so
a surface that wants a background-refresh affordance has one without reaching back
through to the port.

## The theme layer

`src/theme.css` ships the design tokens **and** a base layer — the default border
color, the ground, the type, the reduced-motion opt-out, the component keyframes, and
one `:focus-visible` ring for the whole app. Primitives do not declare their own focus
ring. One ring, defined once, is what makes keyboard focus look like a system rather
than eighty independent decisions.

### One CSS source, two artifacts

`src/theme.css` is the only place any of it is written. The build produces two
things from it, and neither is maintained by hand:

- **`dist/styles.css`** — Tailwind compiles `src/styles.css` (which is two `@import`
  lines: Tailwind, then the theme) into a standalone sheet. A consumer imports this
  and needs no Tailwind and no build configuration.
- **`dist/theme.css`** — a byte copy of `src/theme.css`, for a consumer who already
  runs Tailwind v4 and wants the utilities generated by their own build.

The second path costs the consumer a single `@import` because the theme carries its
own `@source "./"`. Tailwind resolves `@source` relative to the file containing it,
so that one line means `src/` when we build the standalone sheet and `dist/` when a
consumer imports it out of `node_modules` — pointing, either way, at the code that
uses the classes. That is why the keyframes and the tokens cannot drift between the
two artifacts: there is only one file.

Dark mode is opt-in through a `dark` class on an ancestor. The host owns theme
switching; a component library that shipped its own theme toggle would be shipping an
opinion about where state lives in someone else's app.

### The token derivation

The brand supplies a palette; it does not supply a UI theme. The derivation from one
to the other is the interesting part, and the two rules that produced it are:

**The ground is decided first.** Backgrounds are White in light and pure Black in
dark — never cream. Cream is an *element* color: it carries text, borders and
surfaces on dark grounds only, and gray carries them on light grounds. The two
element neutrals never cross over. Fixing the ground first is what makes everything
downstream measurable instead of negotiable, and it is why the brand's dark orange
`#bf6b20` ships uncorrected: on black it measures 5.34:1, so there is nothing to fix.

**A role that fails its measurement gets a new token, never a nudged hex.** The fill
orange `#e98428` is 2.44:1 on white — legal as a fill behind a dark label, and not
legal as an *outline*, which needs 3:1 as a UI component and 4.5:1 as text. Rather
than darken the brand orange until it passes both jobs (which would have made it a
worse fill and an off-brand hue), the theme carries `--primary` for fills and
`--primary-emphasis` for rings, borders and orange-on-ground text. The same
reasoning separates `--border` (decorative: card edges, dividers) from `--input` (the
control boundary, and the only one of the two that clears 3:1 against both the page
and a card).

`--accent` and `--secondary` currently hold the same value in each mode, because the
brand defines exactly one Summit Blue step per mode and both shadcn roles land on it.
They are kept as two names because shadcn components reference them for different
jobs; the right follow-up is to collapse them, not to invent an off-brand hex to tell
them apart. `--destructive` is derived — the brand palette carries no error color.

### The contrast test gates the build

`contrast-test` is the last step of `npm run build`, joined by `&&`, and `prepack`
runs `build` — so a theme that fails cannot be packed or published. The test parses
`dist/styles.css` for the `:root` and `.dark` custom properties: the **built**
artifact a consumer actually receives, not a copy of the token table.

The pairs are derived from token **names**, never listed by hex. Six rules:

1. every `X-foreground` must clear 4.5:1 on its own `X`;
2. `foreground` and `muted-foreground` must clear 4.5:1 on every surface they can
   land on (`background`, `card`, `popover`, `muted`);
3. `primary-emphasis` must clear 4.5:1 on `background` and `card`, because it is
   used as text and as a border;
4. `input` and `ring` must clear the 3:1 UI-component threshold on both surfaces;
5. every `chart-N` must clear 3:1 against both surfaces — a series that only clears
   one of them is invisible on the other;
6. a card must be separable from the page by at least 1.2:1, satisfied by *either*
   the fill or the border. On black that separation comes from the fill; on white a
   raised surface has nowhere lighter to go, so it comes from the edge. What is not
   allowed is a card that reads as page in both.

Both modes are checked on every run, with dark treated as an override layer over
light so a token dark does not restate is still checked at its inherited value.
Name-derivation is the point: adding `--warning` / `--warning-foreground` to the
theme is covered by rule 1 on the next build with no edit to the test, and a sixth
chart series is covered by rule 5 the same way.

### The chart palette was validated, not eyeballed

The five `--chart-*` tokens are a **fixed order, not a pool**. Slot 1 is always the
first series in the data, slot 2 the second. Colour carries identity, so a chart
whose colours move when the legend changes destroys the only thing colour is doing;
filtering a series out never repaints the survivors.

The steps behind those tokens, and their *ordering* — blue, orange, violet, green,
red — were produced by **running the data-visualisation standard's palette
validator**, not by choosing what looked good. Each step sits inside its mode's
lightness band, clears the chroma floor, and holds ≥3:1 against both the page and a
card; the order was selected by enumerating orders and keeping the ones whose worst
neighbouring pair survives simulated protanopia and deuteranopia. Light mode clears
the ΔE 8 target outright (worst adjacent pair 10.5). Dark mode lands at 7.2, inside
the 6–8 floor band — which is legal **only** alongside a second, non-colour channel.

That is why `seriesDash()` exists next to `seriesColor()`, and why every chart in
this package ships a legend, direct labels and a data table rather than treating
them as polish: the palette is only compliant *because* they are there. Past five
series, `seriesColor` returns the muted ink rather than a sixth invented hue or slot
1 again — cycling would give two series the same colour, which is a silent misread,
and generating a hue would put an unvalidated colour on screen. Use `foldSeries` so
the label says "lumped together" too.

The contrast gate re-checks the 3:1 half of this on every build. The colour-vision
half cannot be re-derived from hex pairs, which is why it is not in the gate: if you
re-step these tokens, re-run the standard's validator.

## Components must not depend on the backend cores

`@corbits/mailbox-core`, `@corbits/artifact-core` and `@corbits/analytics-core` are
mountable backend modules. This package is deliberately **independent of all three**,
in both directions:

- A component never imports one. It is a server-side package tree, and a component
  that imports it does not work in a browser bundle.
- A component never assumes one is the backend. `DataTable` does not know whether its
  rows came from `@corbits/analytics-core`, from a REST endpoint, from a GraphQL
  gateway or from a fixture — it knows a `DataPort`.

The shared vocabulary between this package and the cores is *shape*, not code: the
per-domain `lib/` modules (`workflow-run`, `schedule`, `artifact`, `activity`,
`chat-message`) declare the types a component renders, hand-written here. A consumer
whose backend is one of the cores maps its JSON onto those types at their own seam.
A consumer whose backend is something else does exactly the same work. That is the
property worth protecting: the package is usable by a team that has never heard of
the cores.

## Layout

| | |
| --- | --- |
| `src/ui/` | Components. Primitives, collection surfaces, shells, and the domain families. |
| `src/lib/` | Non-component source: `utils`, the `DataPort` seam and its adapter, the chart palette and geometry, and the per-domain shapes. |
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

- **`DataPort` covers collections only.** Single-record reads and mutations are
  absent by decision, not by oversight — see above.
- **No tests and no visual regression testing.** The measurable half of appearance
  (contrast, in both modes) is gated; layout and behaviour are not. There is no test
  runner in the repo.
- **No rendering gallery.** The Next.js app that rendered every component in light
  and dark was deleted with the registry, and nothing replaced it. Visual review now
  means rendering the package in a consumer.
- **The theme assumes Tailwind v4 CSS variables.** A consumer on a Tailwind
  config-object setup has to translate them — though such a consumer can simply
  import `dist/styles.css` and ignore the theme layer entirely.
