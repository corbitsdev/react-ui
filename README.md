# @corbits/react-ui

React components for agent and workflow surfaces — chat, runs, artifacts, analytics, collections. Import one module at a time, or from the root barrel.

## Runtime support

Node >= 24 consumes built `dist/`. Peers: `react` and `react-dom` (18 or 19), `lucide-react`, `sonner`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`.

## Quickstart

```bash
npm add @corbits/react-ui
pnpm add @corbits/react-ui
yarn add @corbits/react-ui
bun add @corbits/react-ui
```

Import the prebuilt stylesheet once at the app root (no Tailwind build required):

```tsx
import "@corbits/react-ui/styles.css";
```

That sheet includes Tailwind preflight and a base layer — it restyles the page, and neither import is safe to skip: without one of them the components render unstyled markup, not a fallback look. If you already use Tailwind v4, import `@corbits/react-ui/theme.css` instead and let your own build generate utilities; don't import both.

Dark mode is a `dark` class on an ancestor; the stylesheet reads it and does not manage it. With neither `.dark` nor `.light` set, the theme follows the OS — a `@media (prefers-color-scheme: dark)` block applies the dark tokens to `:root` and sets `color-scheme: dark` so native controls follow, so a zero-JS install already renders dark on a dark-OS host. That media-query path is tokens only — `dark:` utilities still need a `.dark` ancestor.

Removing `.dark` is not light: hosts that toggle by adding and removing `.dark` must now add `.light` for an explicit light choice (or mount `ThemeProvider`, which toggles both), or a dark-OS user falls back to OS dark. An explicit-light choice on a dark OS first-paints dark then swaps when JS adds `.light`; to block the flash, set the class before first paint (`<script>document.documentElement.classList.add("light")</script>`). `ThemeProvider` still wins once it mounts — mount it only if you want the library to persist the choice and apply named presets.

```tsx
import { Button } from "@corbits/react-ui/ui/button";

<Button onClick={() => start()}>Run now</Button>
```

Every component is importable by subpath (`@corbits/react-ui/ui/button`) or from the root (`@corbits/react-ui`).

The brand faces (Red Hat Display, Space Mono) are named by the theme but not bundled. Load them yourself, or the stack falls through to system fonts; to use a face loaded under a generated name, override `--font-sans` / `--font-mono`.

```tsx
import "@corbits/react-ui/styles.css";

import { Button } from "@corbits/react-ui/ui/button";
import { SortableTable } from "@corbits/react-ui/ui/sortable-table";

type Run = { id: string; name: string; status: string };

export function Runs({ runs }: { readonly runs: readonly Run[] }) {
  return (
    <>
      <SortableTable
        caption="Runs"
        rows={runs}
        rowKey={(run) => run.id}
        columns={[
          { key: "name", header: "Run", cell: (run) => run.name },
          { key: "status", header: "Status", cell: (run) => run.status },
        ]}
      />
      <Button onClick={() => api.start()}>Run now</Button>
    </>
  );
}
```

This package ships no `"use client"` directives. In a React Server Components app, re-export stateful components from a file you mark yourself, using subpaths rather than the root barrel.

## How it works

Components never fetch — data arrives as props. The root entry is re-exports only and the package is side-effect free aside from the CSS files, so either import style tree-shakes to what you used. Tokens and keyframes live in `theme.css`; `styles.css` is the prebuilt sheet for hosts that do not run Tailwind.

See [PRODUCT.md](./PRODUCT.md) for why this library exists, [ARCHITECTURE.md](./ARCHITECTURE.md) for the no-fetch rule and the theme layer, and [IMPLEMENTATION.md](./IMPLEMENTATION.md) for toolchain and peers.

## Development

```sh
git clone https://github.com/corbitsdev/react-ui.git
cd react-ui
bun install
bun run build        # generate → SWC → tsc → Tailwind → contrast gate
bun run typecheck
bun run lint
bun run dep-guard
bun run test
bun run stories      # Ladle workbench
```

A new component is not done until it has at least one story per meaningful state, checked in both themes. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

LGPL-2.1-only. See [LICENSE](./LICENSE).
