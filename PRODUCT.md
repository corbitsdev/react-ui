# Product

`@corbits/react-ui` is the Corbits component library for React. It exists so a
host can ship agent and workflow surfaces that already look finished — chat,
runs, schedules, artifacts, analytics, collections — without taking a data
layer, a backend, or a docs site from this package.

The GitHub description is the product claim: **ship agentic UIs that feel
finished.** The code lives in the consumer's `node_modules` and is picked up
by a version bump.

## Who it is for

Teams building an agent or workflow product in React. The host already has an
app, a router, and a source of data. This package is the visual and
interaction layer, not the product.

It is not a design-system starter, not a CLI, and not a template app.

## What a host can do

- Import from the root (`@corbits/react-ui`) and bundle only what they used.
- Render collection surfaces against *their* data. Components never fetch.
  Data arrives as props. Pieces that take no collection need no extra
  host wiring.
- Style with a single prebuilt sheet (`@corbits/react-ui/styles.css`) and no
  Tailwind, or import `@corbits/react-ui/theme.css` into an existing Tailwind
  v4 build.
- Choose dark mode by putting a `dark` class on an ancestor — or nothing at
  all: with no class set, the stylesheet follows `prefers-color-scheme`.
  `light` on `documentElement` is the explicit light opt-out. Mounting
  `ThemeProvider` is optional — persistence and named presets, not a
  requirement to go dark.
- Mark their own React Server Components boundary. This package ships no
  `"use client"` directives.

## What it is not

There is no CLI, no component generator, and no docs site. There is no
server, no database, and no default backend.

The prebuilt stylesheet is not inert: it restyles the consuming page
(Tailwind preflight plus a base layer). Import it at the root of an app that
is willing to hand over those defaults, or use `theme.css` instead.

Brand faces (Red Hat Display, Space Mono) are named by the theme and not
bundled. The stack falls through to system fonts unless the host loads them.

## License

LGPL-2.1-only. See [LICENSE](./LICENSE).

The public surface is a semver commitment: everything the root re-exports, and every entry in `exports`, is
something we have promised not to break casually. Until 1.0 a minor bump may
still contain a breaking change; those are called out in [CHANGELOG.md](./CHANGELOG.md).
