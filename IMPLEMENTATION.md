# Implementation

Concrete toolchain, peers, formats and publish layout. Design of the
no-fetch rule and the theme layer lives in [ARCHITECTURE.md](./ARCHITECTURE.md).
Why the library exists lives in [PRODUCT.md](./PRODUCT.md).

## Runtime

- **Node.js** `>=24` (`engines` in `package.json`).
- Package name `@corbits/react-ui`, ESM (`"type": "module"`), license
  `LGPL-2.1-only`.
- Required peers: `react` and `react-dom` (`^18.2.0 || ^19.0.0`),
  `lucide-react` (`^0.545.0 || ^1.0.0`), `sonner` (`^2.0.7`),
  `@radix-ui/react-dialog` (`^1.1.15`), `@radix-ui/react-dropdown-menu`
  (`^2.1.16`), `@radix-ui/react-slot` (`^1.2.3`),
  `@radix-ui/react-tooltip` (`^1.2.8`).
- Direct dependencies: `class-variance-authority`, `clsx`, `tailwind-merge`.
- `sideEffects` is CSS-only (`**/*.css`). `files` publishes `dist/` only.

## Toolchain

Development uses **bun**. `bun run build` is four steps and a gate, joined
by `&&`:

| Step | Tool | Output |
| --- | --- | --- |
| `generate` | `scripts/generate-exports.mjs` | `src/index.ts` and the `exports` map in `package.json` |
| `build:js` | SWC (`@swc/cli`, `@swc/core`) | `dist/**/*.js`, one per source file |
| `build:types` | `tsc -p tsconfig.build.json` | `dist/**/*.d.ts` |
| `build:css` | Tailwind v4 CLI | `dist/styles.css`, plus `dist/theme.css` copied from source |
| `contrast-test` | `scripts/contrast-test.mjs` | the gate — reads `dist/styles.css` |

Source imports are relative and carry `.js` extensions. There is no path
alias. `prepack` runs the whole build so a failing gate cannot be packed.
`prepare` (`scripts/prepare.mjs`) builds `dist/` on a git install; it is a
no-op when `dist/` is already present.

Other scripts: `bun run typecheck`, `bun run lint` (eslint),
`bun run dep-guard` (`scripts/dep-guard.mjs` — fails if any file imports
`@workbench/*`), `bun test`, `bun run stories` / `stories:build`
([Ladle](https://ladle.dev) over `stories/`).

## CSS artifacts

Two published sheets, both generated from `src/theme.css`:

- `@corbits/react-ui/styles.css` → `dist/styles.css`. Tailwind compiles
  `src/styles.css` (`@import "tailwindcss"` then `./theme.css`). The host
  needs no Tailwind.
- `@corbits/react-ui/theme.css` → `dist/theme.css`, a byte copy of
  `src/theme.css`. For a host already on Tailwind v4.

Dark mode is the CSS custom variant `@custom-variant dark (&:is(.dark *));`
plus a `@media (prefers-color-scheme: dark)` fallback that applies dark
tokens to `:root` when neither `.dark` nor `.light` is set. Removing `.dark`
alone is not light on a dark-OS host — `.light` on `documentElement` is the
explicit opt-out. `dark:` utilities still require a real `.dark` ancestor.
Named presets are `data-theme` values (`default` / `warm` / `cool`). Brand
faces are `--font-sans: "Red Hat Display", …` and `--font-mono: "Space Mono", …`;
no font files ship.

`ThemeProvider` (`src/ui/theme-provider.tsx`) is optional host wiring. It
writes `.dark`/`.light`, `data-theme`, and `color-scheme` on a root (default
`document.documentElement` — a scoped `root` cannot escape the OS-following
media query, which only inspects `:root`) and persists `{ mode, preset }`
JSON under `localStorage` key `corbits-theme` (override with `storageKey`).
Default mode is `"system"`. `ThemeToggle` / `useTheme` require the provider;
the rest of the library does not.

## Publish

Registry install is the documented path (`npm` / `pnpm` / `yarn` /
`bun add @corbits/react-ui`). `publishConfig.access` is `public`. A git
install still works via `prepare`, and under bun that requires
`trustedDependencies: ["@corbits/react-ui"]`.
