# Architecture

`@corbits/react-ui` is a **shadcn registry**. That single fact decides almost
everything else in this document, so it is worth stating precisely before anything
about components.

## The registry is a source distributor, not a library

A library is installed. Its code lives in `node_modules`, the consumer imports it,
and the author keeps ownership: a bug is fixed upstream and picked up by a version
bump.

A registry is different. `npx shadcn add @corbits/data-table` **copies the source
file into the consumer's repository** — into their `components/ui/`, under their
lint rules, their formatter, their type configuration and their git history. From
that moment the consumer owns it. There is no upgrade path back to us, no
`node_modules` copy to patch, and no way to reach a file after it has been copied.

Four consequences follow, and every design decision here is downstream of one of
them:

1. **A file must stand alone.** An item may depend on npm packages (declared in
   `registry.json` as `dependencies`) and on other registry items (declared as
   `registryDependencies`, which the CLI resolves and copies too). It may depend on
   nothing else. There is no private helper module the consumer does not get.
2. **A file must be readable.** It is going to be *read and edited* by whoever
   installs it, on their worst day, with no author to ask. Comments explain the
   decisions the code cannot; a clever abstraction that saves us ten lines costs
   every consumer an hour.
3. **Abstraction has to earn its place twice.** A wrapper that only forwards props
   is dead weight in a library and a landmine in a registry — the consumer has to
   read through it to reach the thing that does the work. The rule in this repo is
   "the minimum that works": no config indirection, no speculative extension
   points, no plugin framework.
4. **A breaking change is not a major version, it is a diff.** There is no semver
   contract that can protect an already-copied file. What we can do is keep the
   seams small enough that a consumer diffing an old copy against a new one can see
   the change.

`registry.json` is the manifest of record: 108 items, one entry each, naming the
files, the npm dependencies and the registry dependencies. `npm run registry:build`
runs `shadcn build`, which emits one JSON per item into `public/r/`. Those files are
the published surface; the Next.js app in `app/` exists to serve them and to render
every item in light and dark.

## Naming

Items are named for **the job**, never for a product. Agent, workflow, analytics,
mail, schedule, artifact, activity. A consumer installing `activity-timeline` gets a
timeline of activity; they should not have to learn a product's vocabulary to guess
what an item does, and a product name copied into a hundred consumer repositories is
a name we can never take back.

## The `DataPort` seam

Components in this registry **never fetch**, and never import a `@corbits/*` backend
core. This is the hardest boundary in the repo, and it is not stylistic.

A component that fetches is a component that has chosen the consumer's data layer
for them. A component that imports `@corbits/mailbox-core` is worse: the cores are
backend packages that pull in `drizzle-orm`, `postgres` and a database handle. An
`import` of one into a file that gets copied into a browser bundle is not a
dependency mistake, it is a category error, and it would drag a server-only tree
into a client build. `npm run dep-guard` exists to make the whole class of leak
fail loudly rather than quietly (see CONTRIBUTING.md).

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
  Nothing in the registry has a caller for them, and a mutation shape invented before
  its first consumer is a shape that will be wrong. They get added when a real
  consumer lands — and adding them then is a smaller change than unpicking a guess.

### The TanStack adapter is a default, not the seam

`createTanstackDataPort()` (`lib/tanstack-data-port.ts`) implements `DataPort` over
TanStack Query's infinite-query API, and it is the default because most consumers
already have TanStack in the tree. It is a *separate registry item* from `data-port`
on purpose: the seam is the type, the adapter is one implementation of it.

`data-table` declares both as registry dependencies, so the default path works on the
first `shadcn add` with no separate step to go and find an adapter — but a consumer
on SWR, on a websocket cache, or on a hand-written fixture port swaps the provider
value and changes no component.

A `DataPort` is a plain record of functions minted by a factory. Not a class, not a
hierarchy, not a plugin system. That is what makes a fixture port a ten-line object
rather than a subclass.

**The proof is a page, not a claim.** `app/fixture/page.tsx` renders `DataTable`
through a hand-written `DataPort` with no TanStack anywhere in it. If a component
ever reaches past the seam, that page stops compiling or stops rendering — which is
why it is a gate rather than a demo.

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

`corbits-theme` is a `registry:theme` item: it ships the design tokens **and** a base
layer — the default border color, the ground, the type, and one `:focus-visible` ring
for the whole app. Primitives do not declare their own focus ring. One ring, defined
once, is what makes keyboard focus look like a system rather than like eighty
independent decisions, and it is what stops a consumer having to override the same
property in eighty copied files.

Dark mode is opt-in through a `.dark` class on an ancestor. The host owns theme
switching; a registry that shipped its own theme toggle would be shipping an opinion
about where state lives in someone else's app.

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

### The contrast test gates `registry:build`

`registry:build` is `shadcn build && node scripts/contrast-test.mjs`, in that order
and joined by `&&`. The test reads `public/r/corbits-theme.json` — the **built**
artifact, not a copy of the token table — so it checks the tokens that would actually
ship. A theme that fails does not get published, because the build exits non-zero
before anything else runs.

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
this registry ships a legend, direct labels and a data table rather than treating
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
mountable backend modules. This registry is deliberately **independent of all three**,
in both directions:

- A component never imports one. It is a server-side package tree, and a copied file
  that imports it does not work in a browser bundle.
- A component never assumes one is the backend. `DataTable` does not know whether its
  rows came from `@corbits/analytics-core`, from a REST endpoint, from a GraphQL
  gateway or from a fixture — it knows a `DataPort`.

The shared vocabulary between this registry and the cores is *shape*, not code: the
per-domain `lib/` modules (`workflow-run`, `schedule`, `artifact`, `activity`,
`chat-message`) declare the types a component renders, hand-written here. A consumer
whose backend is one of the cores maps its JSON onto those types at their own seam.
A consumer whose backend is something else does exactly the same work. That is the
property worth protecting: the registry is usable by a team that has never heard of
the cores.

## Layout

| | |
| --- | --- |
| `registry.json` | The manifest of record. One entry per item: files, npm deps, registry deps. |
| `registry/corbits/ui/` | Components. Primitives, collection surfaces, shells, and the domain families. |
| `registry/corbits/lib/` | Non-component source: `utils`, the `DataPort` seam and its adapter, the chart palette and geometry, and the per-domain shapes. |
| `registry/corbits/hooks/` | `use-collection-state`. |
| `registry/corbits/blocks/` | Multi-file compositions (`login`, `access-notice`). |
| `app/page.tsx` | Every item rendered in light and dark. The visual review surface. |
| `app/fixture/page.tsx` | `DataTable` on a hand-written `DataPort`. The pluggability gate. |
| `scripts/contrast-test.mjs` | The theme gate, run by `registry:build`. |
| `scripts/dep-guard.mjs` | The forbidden-scope gate. |
| `public/r/` | Build output. Generated, not committed. |

## Known limits

- **`DataPort` covers collections only.** Single-record reads and mutations are
  absent by decision, not by oversight — see above.
- **No visual regression testing.** `app/page.tsx` is reviewed by eye. The
  measurable half of appearance (contrast, in both modes) is gated; layout is not.
- **The registry is not versioned per item.** A consumer who copied a file cannot ask
  which revision they have. Git history is the only record.
- **`corbits-theme` assumes Tailwind v4 CSS variables.** The tokens are emitted as
  `cssVars`; a consumer on a Tailwind config-object setup has to translate them.
