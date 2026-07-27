# Contributing

Thanks for looking. This is an installed npm component library. Read
[ARCHITECTURE.md](./ARCHITECTURE.md) first — most of the rules below only make sense
once that is clear.

## Getting set up

```sh
npm install
npm run build
```

There is no database and no backend. If a change needs one, it belongs behind the
`DataPort` seam, not in a component.

## Running things

```sh
npm run build          # generate → SWC → tsc → Tailwind → the contrast gate
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run dep-guard      # forbidden-import checks over src/
```

All four must be clean before a change lands. `typecheck` is not negotiable and
`any` is not a way past it: the escapes that exist each carry a comment explaining
why the type system leaves no alternative, and a new one needs the same.

## The build and the contrast gate

`npm run build` runs, in order: `generate-exports` (writes `src/index.ts` and the
`exports` map), SWC for `dist/**/*.js`, `tsc` for `dist/**/*.d.ts`, Tailwind for
`dist/styles.css` and `dist/theme.css`, and finally the contrast test. Each step is
joined by `&&`, and `prepack` runs the whole thing — so a failing gate cannot be
packed or published.

The contrast test parses the **built** `dist/styles.css` for its `:root` and `.dark`
custom properties and measures every token pair it can derive by name, in light and
in dark. A failing pair prints as `FAIL <ratio>:1 (>=<floor>) <mode> <pair>` and
exits non-zero.

Two things follow for anyone touching the theme:

- **Change tokens in `src/theme.css`, then run `npm run build`.** Editing `dist/`
  directly changes nothing — it is generated output and is gitignored.
- **Do not add hex pairs to the test.** The pairs are derived from token *names*, so
  a new `--warning` / `--warning-foreground` or a sixth `--chart-6` is covered on the
  next run with no edit. If a token you added is *not* covered, the fix is a naming
  rule in `checksFor`, not a hardcoded pair.

The gate is the WCAG half of the story. The chart palette's other gates — lightness
band, chroma floor, colour-vision separation — come from the data-visualisation
standard and are checked with **its validator** when the steps are chosen; they
cannot be re-derived from hex pairs. If you re-step a `--chart-*` token, re-run that
validator and record the result in the change.

## The dep-guard

`scripts/dep-guard.mjs` walks every `.ts` / `.tsx` under `src/` and enforces two
rules. Both forbidden strings are named here deliberately — a guard whose forbidden
string is a secret is a guard nobody can comply with.

**No `@workbench/*`.** A published file that imports an unpublished scope is
uninstallable for everyone outside the project that defines it, and the failure lands
in the *consumer's* install, where they cannot fix it. This package is a clean
rewrite; one leaked import would drag the old package back in.

**Only `lib/tanstack-data-port.ts` imports `@tanstack/react-query`.** That is what
lets the query library be an *optional* peer dependency. A component importing it
directly would silently make it required for every consumer, and nothing else in the
build would notice.

The same rule, not currently machine-checked, applies to the `@corbits/*` backend
cores: a component must never import `@corbits/mailbox-core`,
`@corbits/artifact-core` or `@corbits/analytics-core`. They are server-side packages
carrying `drizzle-orm` and `postgres`, and pulling one into a browser bundle is a
category error, not a dependency mistake. Data reaches a component through props or
a `DataPort`.

Wanting to relax either rule is the signal to widen the `DataPort` or add a prop —
never to import your way around it.

## Adding a component

1. Write the file under `src/{ui,lib,hooks,blocks}/`. Imports of sibling modules are
   **relative and carry a `.js` extension** (`../lib/utils.js`) — there is no path
   alias.
2. Do not edit `src/index.ts` or the `exports` map in `package.json`. Both are
   generated; `npm run build` picks the new file up.
3. If the module is machinery rather than public API, add it to `INTERNAL` in
   `scripts/generate-exports.mjs`. Keeping something internal is cheap; taking a
   subpath back after it ships is not. If it is public but statically imports an
   *optional* peer dependency, add it to `BARREL_EXCLUDED` in the same file instead —
   it keeps its subpath but must stay out of the root barrel, or that peer becomes
   mandatory for every consumer. `dep-guard` fails if you forget.
4. Do not add `"use client"`. The package ships no client-boundary directives — see
   ARCHITECTURE.md.
5. If it needs a new npm package, decide deliberately: a framework-level library the
   consumer already has is a **peer** dependency, and a small implementation detail
   is a real dependency. Adding a peer is a breaking change for existing consumers.
6. `npm run build && npm run typecheck && npm run lint && npm run dep-guard`.
7. Verify a clean install (below).

## Verifying a clean install

A green build proves the package compiles. It does not prove it **installs and
renders**, and the failures that matter most — a dependency you have in this repo but
did not declare, a subpath missing from `exports`, a class the stylesheet does not
carry — are invisible until someone installs into a tree that does not already have
them.

So verify against **wiped scratch consumers**. `scratch/` is gitignored precisely so
it can be thrown away and rebuilt:

```sh
npm pack                                  # → corbits-react-ui-<version>.tgz

# 1. plain React
rm -rf scratch/vite-consumer && mkdir -p scratch/vite-consumer
# ... npm init, install the tarball plus the peers, import a component, build

# 2. server components
rm -rf scratch/next-consumer && mkdir -p scratch/next-consumer
# ... same, with the components used from a server component and from a
#     "use client" file the consumer owns
```

Wiped, every time. A scratch consumer that has accumulated packages from previous
runs will happily compile against a dependency you forgot to declare, which is the
exact bug this is meant to catch.

Two things worth asserting while you are there:

- **Tree-shaking.** Build one entry that imports a single component and one that
  imports everything, and compare. A single component must not drag in the others; if
  it does, something acquired a side effect or the barrel stopped being re-exports.
- **The stylesheet.** Check that the classes the rendered markup emits actually have
  rules in `dist/styles.css`. Tailwind extracts classes statically, so a utility
  assembled at runtime is missing from the sheet and the component is silently
  unstyled.

## Accessibility

These components end up in other people's products. Accessibility is a merge
requirement, not a follow-up.

- **Keyboard.** Every interactive element is reachable and operable from the keyboard
  alone — Tab and Shift-Tab in DOM order, Enter/Space to activate, Escape to dismiss
  an overlay, arrow keys within a composite widget (menu, tab list, listbox) rather
  than a Tab stop per option. If you cannot drive it without a mouse, it is not done.
- **Focus management.** Focus must always be somewhere sensible and always visible.
  An overlay takes focus on open, traps it while modal, and **returns it to the
  element that opened it** on close. `src/theme.css` ships one `:focus-visible` ring
  for the whole app; primitives do not declare their own, and must not suppress it.
  Never `outline: none` without a replacement that measures at least 3:1.
- **`aria-*` and semantics.** Prefer a real element over a `div` with a role — a
  `<button>` brings its keyboard behaviour, focusability and semantics for free.
  Where a role is genuinely needed, wire the states that go with it: `aria-expanded`
  on a disclosure, `aria-current` on the active nav item, `aria-live` on a region
  that updates out of band, `aria-busy` on a collection **from `isFetching`, not
  `isLoading`** (a first load renders a skeleton; a background refetch over visible
  rows is what "busy" means). Every control has an accessible name; an icon-only
  button needs `aria-label`.
- **Colour is never the only channel.** Anything encoded in colour is encoded a
  second way too — a shape, an icon, a dash pattern, a label. Charts are the sharp
  case: the palette's dark-mode separation is only compliant *because* every chart
  ships a legend, direct labels and a data table (see ARCHITECTURE.md). Status
  indicators carry text or a glyph alongside the dot.
- Respect `prefers-reduced-motion` for anything that animates.

Check your item in both modes and at 200% zoom before opening a change.

## Naming and scope

- **Generic names only.** Name for the job — agent, workflow, analytics, mail,
  schedule, artifact, activity. No product-brand names in a module name, a prop, a
  type or a fixture. A name in a published `exports` map is a name we cannot take
  back without a major version.
- **The minimum that works.** No wrapper that only forwards props, no config
  indirection, no speculative extension point. No CLI, no component generator, no
  docs site.
- Comments explain *why*. The code already says what.

## Pull requests

- Keep commits focused, and keep the diff to the change you are describing.
- Explain *why* in the commit message; the code already says what.
- CI must be green: `dep-guard`, `typecheck`, `lint`, and `build` including the
  contrast gate.
- Contributions are accepted under the repository's LGPL-2.1-only licence.
