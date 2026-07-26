# Contributing

Thanks for looking. This is a shadcn registry: every file here gets **copied into
someone else's repository** and owned by them from that point on. Read
[ARCHITECTURE.md](./ARCHITECTURE.md) first — most of the rules below only make sense
once that is clear.

## Getting set up

```sh
npm install
npm run dev            # the docs app on :3333, every item in light and dark
```

There is no database and no backend. If a change needs one, it belongs behind the
`DataPort` seam, not in a component.

## Running things

```sh
npm run registry:build # shadcn build → public/r/*.json, then the contrast gate
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run dep-guard      # forbidden-scope check over registry/
npm run build          # next build — the docs app and the served registry
```

All five must be clean before a change lands. `typecheck` is not negotiable and
`any` is not a way past it: the escapes that exist each carry a comment explaining
why the type system leaves no alternative, and a new one needs the same.

## `registry:build` and the contrast gate

`registry:build` is `shadcn build && node scripts/contrast-test.mjs`, in that order.
`shadcn build` reads `registry.json` and emits one JSON file per item into
`public/r/`; the contrast test then reads the **built** `public/r/corbits-theme.json`
and measures every token pair it can derive by name, in light and in dark. A failing
pair prints as `FAIL <ratio>:1 (>=<floor>) <mode> <pair>` and exits non-zero, so a
theme that does not pass never gets published.

Two things follow for anyone touching the theme:

- **Change tokens in `registry.json`, then run `registry:build`.** Editing
  `public/r/` directly changes nothing — it is generated output and is gitignored.
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

`scripts/dep-guard.mjs` walks every `.ts` / `.tsx` under `registry/` and fails on an
import from **`@workbench/*`**, an unpublished npm scope. Naming it here is
deliberate — a guard whose forbidden string is a secret is a guard nobody can comply
with.

The reason is the registry's whole distribution model. A copied file that imports an
unpublished scope is uninstallable for everyone outside the project that defines it,
and the failure lands in the *consumer's* build, where they cannot fix it. This
registry is a clean rewrite; one leaked import would drag the old package back in.

The same rule, not currently machine-checked, applies to the `@corbits/*` backend
cores: a component must never import `@corbits/mailbox-core`,
`@corbits/artifact-core` or `@corbits/analytics-core`. They are server-side packages
carrying `drizzle-orm` and `postgres`, and pulling one into a browser bundle is a
category error, not a dependency mistake. Data reaches a component through props or
a `DataPort`.

Wanting to relax either rule is the signal to widen the `DataPort` or add a prop —
never to import your way around it.

## Adding a registry item

1. Write the file under `registry/corbits/{ui,lib,hooks,blocks}/`.
2. Add an entry to `registry.json`: `dependencies` for npm packages,
   `registryDependencies` for other items (`@corbits/<name>`). **Declare every
   transitive item.** If your component uses `use-collection-state`, say so — a
   consumer running one `shadcn add` should get a tree that compiles, not a missing
   import.
3. Render it in `app/page.tsx` so it is exercised in light and dark. An item nobody
   can see is an item nobody reviews.
4. `npm run registry:build && npm run typecheck && npm run lint && npm run dep-guard`.
5. Verify a clean install (below).

## Verifying a clean `shadcn add`

`registry:build` passing proves the JSON is well-formed. It does not prove the item
**installs**, and the two failures that matter most — a missing
`registryDependency`, and an npm dependency you have in this repo but did not declare
— are invisible until someone installs into a tree that does not already have them.

So verify against a **wiped scratch consumer**. `scratch/` is gitignored precisely so
it can be thrown away and rebuilt:

```sh
rm -rf scratch/consumer
npx create-next-app@latest scratch/consumer --ts --tailwind --app --no-git

npm run registry:build
npm start &                     # serves public/r on :3333

cd scratch/consumer
# point components.json at the local build
#   "registries": { "@corbits": "http://localhost:3333/r/{name}.json" }
npx shadcn@latest add @corbits/corbits-theme @corbits/<your-item>
npx tsc --noEmit && npm run build
```

Wiped, every time. A scratch consumer that has accumulated packages from previous
runs will happily compile an item whose dependencies you forgot to declare, which is
the exact bug this is meant to catch. If the consumer's `tsc` is clean and its build
passes, the item installs.

## Accessibility

These components end up in other people's products, and a defect copied into a
hundred repositories cannot be recalled. Accessibility is a merge requirement, not a
follow-up.

- **Keyboard.** Every interactive element is reachable and operable from the keyboard
  alone — Tab and Shift-Tab in DOM order, Enter/Space to activate, Escape to dismiss
  an overlay, arrow keys within a composite widget (menu, tab list, listbox) rather
  than a Tab stop per option. If you cannot drive it without a mouse, it is not done.
- **Focus management.** Focus must always be somewhere sensible and always visible.
  An overlay takes focus on open, traps it while modal, and **returns it to the
  element that opened it** on close. `corbits-theme` ships one `:focus-visible` ring
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
  schedule, artifact, activity. No product-brand names in an item name, a prop, a
  type or a fixture. A brand name copied into a hundred consumer repositories is a
  name we can never take back.
- **The minimum that works.** No wrapper that only forwards props, no config
  indirection, no speculative extension point. In a registry, every abstraction is
  something the consumer has to read through to reach the code that does the work.
- Comments explain *why*. The consumer reading a copied file on their worst day has
  no author to ask.

## Pull requests

- Keep commits focused, and keep the diff to the change you are describing.
- Explain *why* in the commit message; the code already says what.
- CI must be green: `dep-guard`, `typecheck`, `lint`, `registry:build` including the
  contrast gate, and `next build`.
- Contributions are accepted under the repository's LGPL-2.1-only licence.
