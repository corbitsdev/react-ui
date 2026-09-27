# Contributing

Thanks for looking. This is an installed npm component library, published to the npm
registry and developed with [bun](https://bun.sh) as its package manager and task runner.
Read [ARCHITECTURE.md](./ARCHITECTURE.md) first — most of the rules below only make sense
once that is clear.

## How it works

Components never fetch; data arrives as props. The root entry is hand-written re-exports
only, and the package is side-effect free apart from its CSS, so either import style
tree-shakes. Tokens and keyframes live in `theme.css`; `styles.css` is the prebuilt sheet
for hosts that do not run Tailwind. [PRODUCT.md](./PRODUCT.md) covers why the library
exists and [IMPLEMENTATION.md](./IMPLEMENTATION.md) the toolchain and peers.

## Getting set up

```sh
bun install
bun run build
```

There is no database and no backend. If a change needs one, it belongs in the
consumer's data layer, not in a component — data arrives as props.

## Gates

```sh
bun run build          # tsc (JS + types) → Tailwind
bun run typecheck      # tsc --noEmit
bun run lint           # eslint .
bun run dep-guard      # forbidden-import checks over src/
```

All four must be clean before a change lands. There is no CI in this repository yet, so
running them locally is the only thing standing between a change and a release.
`typecheck` is not negotiable and `any` is not a way past it: the escapes that exist each
carry a comment explaining why the type system leaves no alternative, and a new one needs
the same.

## Touching the theme

The contrast gate is described in [ARCHITECTURE.md](./ARCHITECTURE.md#contrast-is-gated).
A failing pair prints as `FAIL <ratio>:1 (>=<floor>) <mode> <pair>` and exits non-zero.
Two things follow:

- **Change tokens in `src/theme.css`, then run `bun run build`.** Editing `dist/` changes
  nothing — it is generated output and is gitignored.
- **Do not add hex pairs to the test.** The pairs are derived from token *names*. If a
  token you added is not covered, the fix is a naming rule in `checksFor`, not a
  hardcoded pair.

If you re-step a `--chart-*` token, re-run the palette validator for the lightness band,
chroma floor and colour-vision separation; those cannot be re-derived from hex pairs, and
the build gate does not cover them. Record the result in the change.

## The dep-guard

`scripts/dep-guard.mjs` walks every `.ts` / `.tsx` under `src/` and enforces two rules.
The forbidden strings are named here deliberately — a guard whose forbidden string is a
secret is a guard nobody can comply with.

1. **No `@workbench/*`.** A published file that imports an unpublished scope is
   uninstallable for everyone outside the project that defines it, and the failure lands
   in the *consumer's* install, where they cannot fix it.
2. **Nothing reachable from the root barrel imports an optional peer.** Re-exporting a
   module that statically imports an optional peer makes that peer mandatory for every
   root import, so such a module must be kept out of the barrel and given its own `exports` entry.

The same rule, not machine-checked, applies to server-side packages: a component must
never import one. They carry database drivers, and pulling one into a browser bundle is a
category error. Data reaches a component through props.

Wanting to relax any of this is the signal to add a prop — never to import your way
around it.

## Adding a component

1. Write the file under `src/{ui,lib,hooks,blocks}/`. Imports of sibling modules are
   **relative and carry a `.js` extension** (`../lib/utils.js`) — there is no path alias.
2. If it is public API, add `export * from "./<dir>/<name>.js";` to `src/index.ts`.
   Machinery stays unlisted: keeping something internal is cheap; taking an export back
   after it ships is not.
3. If it is public but statically imports an *optional* peer, leave it out of
   `src/index.ts` and add a `./<dir>/<name>` entry to `exports` in `package.json` instead.
   `dep-guard` fails if it reaches the barrel.
4. If a `ui/` or `blocks/` module calls a hook, creates a context, defines an inline
   event handler, or imports an optional peer, start it with `"use client"`;
   `@radix-ui/react-slot` alone does not count. Leave stateless components and
   `hooks/` / `lib/` modules unmarked. `dep-guard` fails either way you get it wrong.
5. If it needs a new package, decide deliberately: a framework-level library the consumer
   already has is a **peer** dependency, a small implementation detail is a real
   dependency. Adding a peer is a breaking change for existing consumers.
6. Run the four gates, then verify a clean install.

## Verifying a clean install

A green build proves the package compiles. It does not prove it **installs and renders**,
and the failures that matter most — a dependency you have in this repo but did not
declare, a subpath missing from `exports`, a class the stylesheet does not carry — are
invisible until someone installs into a tree that does not already have them.

```sh
npm pack --dry-run     # inspect the file list
npm pack               # → corbits-react-ui-<version>.tgz
```

`npm pack` is kept here as a verification command because it is the packer the registry
sees; bun is still the package manager for everything else. Delete the tarball when you
are done — it must not be committed.

Install that tarball plus the peers into a throwaway consumer app, built from scratch each
time (a directory matching the gitignored `scratch/` pattern is a convenient home for it).
Check two consumers: plain React, and a server-components app using the components both
from a server component and from a `"use client"` file the consumer owns. Build the
consumer from empty every time — one that has accumulated packages from a previous run
will happily compile against a dependency you forgot to declare, which is the exact bug
this catches.

Two things worth asserting while you are there:

- **Tree-shaking.** Build one entry that imports a single component and one that imports
  everything, and compare. A single component must not drag in the others.
- **The stylesheet.** Check that the classes the rendered markup emits actually have rules
  in `dist/styles.css`. Tailwind extracts classes statically, so a utility assembled at
  runtime is missing from the sheet and the component is silently unstyled.

## The component workbench

`bun run stories` starts [Ladle](https://ladle.dev) — a live, hot-reloading canvas over
every published component, running against `src/theme.css` so what you see is what a
consumer gets. `bun run stories:build` produces a static build of the same canvas for
anyone who wants to check it without running the dev server.

Stories live under `stories/`, not next to their component in `src/`. SWC and `tsc`
compile all of `src/`, so a colocated `*.stories.tsx` would ship in `dist/`. Keeping them
in a separate top-level directory keeps `dist/` exactly the set of files that matter.

The theme toggle in Ladle's own top bar switches the real `.dark` class from
`src/theme.css` — not a canvas-only colour swap — so a component's dark-mode tokens,
contrast and all, are what you're actually looking at.

**A new component's story is part of what "done" means for it**, not a follow-up: at
least one story per meaningful state (loading, empty, error, wherever the component has
one), with fixture data that reads like something a person would actually see — a name, a
title, a sentence — never an id-shaped placeholder. A prop the workbench can't exercise is
a prop nobody has actually looked at rendered.

## Accessibility

These components end up in other people's products. Accessibility is a merge requirement,
not a follow-up.

- **Keyboard.** Every interactive element is reachable and operable from the keyboard
  alone — Tab and Shift-Tab in DOM order, Enter/Space to activate, Escape to dismiss an
  overlay, arrow keys within a composite widget rather than a Tab stop per option.
- **Focus management.** Focus must always be somewhere sensible and always visible. An
  overlay takes focus on open, traps it while modal, and **returns it to the element that
  opened it** on close. `src/theme.css` ships one `:focus-visible` ring for the whole app;
  primitives do not declare their own and must not suppress it. Never `outline: none`
  without a replacement that measures at least 3:1.
- **`aria-*` and semantics.** Prefer a real element over a `div` with a role. Where a role
  is needed, wire the states that go with it: `aria-expanded` on a disclosure,
  `aria-current` on the active nav item, `aria-live` on a region that updates out of band,
  `aria-busy` on a collection **from `isFetching`, not `isLoading`**. Every control has an
  accessible name; an icon-only button needs `aria-label`.
- **Colour is never the only channel.** Anything encoded in colour is encoded a second way
  too — a shape, an icon, a dash pattern, a label. Charts are the sharp case: the
  palette's dark-mode separation is compliant only *because* every chart ships a legend,
  direct labels and a data table.
- Respect `prefers-reduced-motion` for anything that animates.

Check your item in both modes and at 200% zoom before opening a change.

## Naming and scope

- **Generic names only.** Name for the job — agent, workflow, analytics, mail, schedule,
  artifact, activity. No product-brand names in a module name, a prop, a type or a
  fixture. A name in a published `exports` map is a name we cannot take back without a
  major version.
- **The minimum that works.** No wrapper that only forwards props, no config indirection,
  no speculative extension point. No CLI, no component generator, no docs site.
- Comments explain *why*. The code already says what.

## Pull requests

- Keep commits focused, and keep the diff to the change you are describing.
- Explain *why* in the commit message; the code already says what.
- Run the gates locally and say so in the pull request: `dep-guard`, `typecheck`, `lint`,
  and `build` including the contrast gate. Nothing runs them for you yet.
- Contributions are accepted under the repository's LGPL-2.1-only licence.

## Commit messages

Commit subjects and PR titles follow [Conventional Commits](https://www.conventionalcommits.org): `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `perf`, and `chore(release): x.y.z` for releases.
Add `!` only for public API breaks: removed or renamed exports, changed signatures, newly required params. Peer and dependency range changes are `build(deps):` with no `!`.
Keep subjects imperative, lowercase after the colon, 72 characters or less, and free of ticket IDs.
Every PR links its issue with a `Closes <issue id>` line in the PR body.
