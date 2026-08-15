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

## Small-stateless-components audit

A survey of `src/ui` (150 components) and `src/blocks` (3 block modules)
against five smells, done ahead of a fix pass (CL-5633). It is not a
line-by-line review of every file; it is a targeted grep-and-read over the
patterns below, cross-checked against what similar components in the
library already do.

Every surveyed module is re-exported from the package root (`src/index.ts`),
so "public surface" doesn't distinguish findings the way it might in an app —
everything here is public. Blast radius instead counts how many other
non-test, non-story modules under `src/` import the component directly; it
is a proxy for "how many places a change here could be felt," not a measure
of downstream (workbench) usage, which this repo can't see.

### (a) Internal state that should be controlled

The convention already exists: `Sidebar`/`StepSidebar` take `collapsed` +
`onToggle`, `Dialog`/`CommandPalette` take `open` + `onOpenChange`. Both
families hold zero layout state internally — the parent owns it, full stop.
The components below didn't follow either shape; they held `open`/`expanded`
in `useState` with no way for a parent to read or drive it.

| Component | Path | Blast radius | Status |
| --- | --- | --- | --- |
| `ToolNarrative` | `src/ui/tool-narrative.tsx` | 3 importers | **Fixed** — added optional `open`/`onOpenChange` |
| `ToolBlock` | `src/ui/tool-block.tsx` | 2 importers | **Fixed** — added optional `open`/`onOpenChange` |
| `NotificationsBell` | `src/ui/notifications-bell.tsx` | 1 importer | **Fixed** — added optional `open`/`onOpenChange` |
| `TenantSelector` | `src/ui/tenant-selector.tsx` | 1 importer | **Fixed** — added optional `open`/`onOpenChange` |
| `ThreadSwitcher` | `src/ui/thread-switcher.tsx` | 1 importer | **Fixed** — added optional `open`/`onOpenChange` |
| `SubagentDock` (per-row disclosure) | `src/ui/subagent-dock.tsx` | 1 importer | Deferred — lifting it means a parent tracking one open flag per subagent row (a map, not a boolean); a bigger surface change than this pass covers |

All five fixes are additive: `open`/`onOpenChange` are optional, and the
component still manages its own state when they're omitted, so nothing that
calls these components today changes behavior.

A few more components hold local `open`/`expanded`-shaped state and were
checked against the same bar, but don't belong on the fix list:
`ActivityBlock` is backed by a native `<details>` on purpose (see its own
doc comment) — the browser supplies the disclosure semantics, keyboard
behavior and find-in-page expansion, which making it controlled would mean
re-deriving by hand. `ApprovalCard`'s per-detail "show more" is a text
truncation toggle, not a layout region — nobody outside the row has a reason
to know or set it. `ConfirmButton`'s `armed` state is already documented as
deliberately uncontrolled (`defaultArmed` only seeds the initial value).
`SidebarItemRow`'s `mounted` flag, `FileInput`'s `dragging` and
`LibrarySearchInput`'s `focused` are transient, self-contained UI state with
no parent-relevant meaning. `Command`'s `query`/`activeIndex` and
`TenantSelector`'s `activeIndex` are listbox/combobox navigation state,
which is what `use-command-palette-navigation` already exists to
encapsulate for the one case (`CommandPalette`) that needed it shared.

### (b) Config-object props vs. children/slots

Audited every array-of-object prop in `src/ui`/`src/blocks`
(`actor-summary`, `token-mosaic`, `intake-form`, `add-artifact-dialog`,
`kind-picker`, `toggle-list`, `filter-bar`, `workflow-catalog`,
`kind-card-grid`, `progress-checklist`, `step-list`, `horizontal-stepper`,
and others). **No findings.** Every one of these is a collection-rendering
component — a table row set, a step rail, a filter list — consistent with
the `DataPort`/`use-collection-state` architecture above, where components
render data the host doesn't have pre-built React elements for (it has
domain objects: a `Tenant`, a `WorkflowStep`, a `FilterSpec`). Slots are
used elsewhere in the library exactly where the content genuinely is
caller-arbitrary markup (`NotificationsBell`'s `children`, `AuthLayout`'s
`panel`). Swapping a config-array prop for children in a collection
component would mean the host hand-building list markup the component
exists to standardize — a regression, not a cleanup.

### (c) Imperative logic that belongs in a hook

| Finding | Components | Blast radius | Status |
| --- | --- | --- | --- |
| Outside-click + Escape dismissal, hand-rolled three times | `NotificationsBell`, `TenantSelector`, `ThreadSwitcher` | 3 components, 3 importers combined | **Fixed** — extracted `useDismissablePopover` (`src/hooks/use-dismissable-popover.ts`) |
| `matchMedia("(prefers-reduced-motion: reduce)")`, read once and never re-checked, duplicated three times | `AnimatedNumber`, `DitherCanvas`, `use-scroll-current-into-view` | 3 components/hooks, 5 importers combined | **Fixed** — extracted `usePrefersReducedMotion` (`src/hooks/use-prefers-reduced-motion.ts`), now reactive via `useSyncExternalStore` |
| Spotlight measurement (`getBoundingClientRect`, `scrollIntoView`, resize/scroll listeners) | `OnboardingTour` | 1 importer | Deferred — tightly coupled to tour-step semantics (target selectors, centering a step with no target); low reuse value elsewhere today |

`CommandPalette`'s keyboard/query navigation already lives in
`use-command-palette-navigation.ts` — this is the pattern the fixes above
extend, not a gap. `DitherBackground`'s pointer-driven canvas loop is
self-contained and has no sibling that needs the same behavior.

### (d) Colors not sourced from theme tokens

Grepped every `.tsx`/`.css` file under `src/ui`/`src/blocks` for hex/rgb/
named-color literals and for Tailwind's fixed `text-white`/`bg-black`-style
utilities.

`DitherCanvas`'s ink fallback (`src/ui/dither-canvas.tsx`) hardcoded
`#e98428` — the **light**-theme value of `--primary` — used unconditionally
as the fallback for the instant before the CSS custom property can be read.
`--primary` is `#bf6b20` in dark mode, so this fallback rendered the wrong
orange under dark. **Fixed**: it now falls back to the canvas's own computed
`color`, which the theme's base layer already ties to `--foreground`, for
whichever theme is active.

Two other `bg-black/*` uses (`Dialog`'s overlay, `OnboardingTour`'s scrim)
were checked and are fine: a modal/spotlight overlay is conventionally black
at a fixed opacity in both themes — it's dimming the page behind it, not
carrying theme-tinted content, so there's no light/dark pair for it to be
inconsistent with.

### (e) Missing `prefers-reduced-motion` support

The theme's base layer already collapses every CSS `animation`/`transition`
duration to near-zero globally under `prefers-reduced-motion: reduce` (see
"The theme layer" above) — opt-out at the foundation, not per-component — so
the ~50 components using Tailwind's `transition-*`/`animate-*` utilities
inherit it for free and were not re-checked individually.

The gap is JS-driven motion, which that CSS rule cannot reach:
`requestAnimationFrame` loops and imperative `scrollIntoView` calls. All
four such call sites were audited:

| Component | Path | Before | Status |
| --- | --- | --- | --- |
| `AnimatedNumber` | `src/ui/animated-number.tsx` | One-shot `matchMedia` check per count-up | **Fixed** — now uses `usePrefersReducedMotion`, re-runs if the OS preference flips mid-count |
| `DitherCanvas` | `src/ui/dither-canvas.tsx` | One-shot `matchMedia` check per mount | **Fixed** — same |
| `use-scroll-current-into-view` | `src/hooks/use-scroll-current-into-view.ts` | One-shot `matchMedia` check per scroll | **Fixed** — same |
| `DitherBackground` | `src/ui/dither-background.tsx` | Already listens for `change` on its own `MediaQueryList` | Reviewed, no change — already the correct, live-reactive pattern |

### Summary

- **150 components surveyed** across `src/ui` and `src/blocks`.
- (a) 6 components reviewed as controlled-state candidates; 5 fixed, 1
  deferred, 7 more reviewed and confirmed as legitimately internal.
- (b) 12 config-object props reviewed; 0 findings.
- (c) 3 duplicated-imperative-logic findings; 2 fixed (covering 6
  components), 1 deferred.
- (d) 1 single-theme color-literal finding; fixed.
- (e) 4 JS-driven motion call sites audited; 3 fixed, 1 already correct.

**8 components/hooks fixed in this pass**: `NotificationsBell`,
`TenantSelector`, `ThreadSwitcher`, `ToolBlock`, `ToolNarrative`,
`AnimatedNumber`, `DitherCanvas`, `use-scroll-current-into-view` — plus two
new shared hooks, `useDismissablePopover` and `usePrefersReducedMotion`.

**Deferred, with reasons**: `SubagentDock`'s per-row disclosure (needs
list-keyed controlled state — bigger surface change than this pass), and
`OnboardingTour`'s measurement logic (tour-specific, low reuse value as a
hook today).

## Standing pattern

The audit above isn't a one-off cleanup; the four rules below are the bar a
new component in this library is expected to clear. Each has exemplars
already in the tree.

**State that describes layout or visibility is controlled, not owned.** If a
piece of state answers "is this open/collapsed/expanded" and a reasonable
host might want to read or drive it — closing every other panel when one
opens, restoring a collapsed sidebar from a saved preference — it's a prop
pair: `open` + `onOpenChange`, or `collapsed` + `onToggle`. `Sidebar`,
`StepSidebar` and `CanvasHost` set this precedent; `Dialog` and
`CommandPalette` apply it to popups; `NotificationsBell`, `TenantSelector`,
`ThreadSwitcher`, `ToolBlock` and `ToolNarrative` now do too, all
uncontrolled-by-default so adding the pair is never a breaking change. The
exception is state a parent has no legitimate reason to want: `ActivityBlock`
stays a native `<details>`, and a text-truncation toggle stays local. If
you're unsure which side of that line something is on, ask "would a real
caller ever need to read or set this from outside" — not "could they."

**Arbitrary content is a slot; a domain collection is a data prop.** A
component whose job is to render caller-supplied content it has no opinion
about (`NotificationsBell`'s `children`, `AuthLayout`'s `panel`) takes
`children` or a named slot. A component whose job is to render a
*collection* of the library's own domain shapes (a list of `WorkflowStep`, a
list of `Tenant`) takes that collection as a data prop, the same way
`DataPort` and `use-collection-state` already assume — that's what makes a
table, a list and a step rail interchangeable consumers of one
loading/empty/error contract. Don't reach for a config-object prop as a
substitute for either of these; if you're tempted to add one, first check
whether the content is actually caller-arbitrary (make it `children`) or
actually a collection this library already has a shape for (use that
shape).

**Non-trivial imperative behavior lives in a headless hook, not the
component body.** Event listeners, focus management, measurement, timers,
keyboard handling — if two components would otherwise duplicate the same
`useEffect`, that's the hook boundary. `use-focus-trap`,
`use-command-palette-navigation`, `use-resizable-rail`,
`use-dismissable-popover` and `use-prefers-reduced-motion` are the existing
examples: each owns exactly the imperative part and returns refs/values, no
markup. Before writing a second `addEventListener` pair that looks like one
already in the tree, grep `src/hooks` first.

**Every color comes from a token, with no unconditional literal fallback.**
`src/theme.css` is the only place a hex, rgb or named color belongs. A
component that reads a CSS custom property at runtime (`DitherCanvas`
reading `--primary` for a canvas fill, since canvas can't use `var()`
directly) may need a fallback for the instant before styles are attached —
that fallback must resolve through the DOM (`getComputedStyle(...).color`,
tied to `--foreground` by the base layer), never a hardcoded hex, because a
literal is by construction correct in at most one theme.

**Motion outside CSS checks `prefers-reduced-motion`, live.** The theme's
global CSS rule handles every `transition-*`/`animate-*` utility for free —
don't re-implement that check for a component using only CSS transitions.
The rule doesn't reach `requestAnimationFrame` loops or imperative calls
like `scrollIntoView`; those call `usePrefersReducedMotion()` (or, for
something that needs its own live `MediaQueryList` listener mid-loop,
follow `DitherBackground`'s pattern) rather than a one-shot
`matchMedia(...).matches` read that goes stale the moment the OS setting
changes.

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
