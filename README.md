# @corbits/react-ui

React components for agent and workflow surfaces — chat, runs, schedules, artifacts, analytics, collections. Import one module at a time, or from the root barrel.

## Runtime support

Node >= 24 consumes built `dist/`. Peers: `react` and `react-dom` (18 or 19), `lucide-react`, `sonner`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`. `@tanstack/react-query` is an optional peer, needed only for `createTanstackDataPort()`.

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

That sheet includes Tailwind preflight and a base layer — it restyles the page. If you already use Tailwind v4, import `@corbits/react-ui/theme.css` instead and let your own build generate utilities. Dark mode is a `dark` class on an ancestor; the stylesheet reads it and does not manage it. Mount `ThemeProvider` only if you want the library to persist the choice and apply named presets.

```tsx
import { Button } from "@corbits/react-ui/ui/button";

<Button onClick={() => start()}>Run now</Button>
```

Every component is importable by subpath (`@corbits/react-ui/ui/button`) or from the root (`@corbits/react-ui`). One module is subpath-only: `@corbits/react-ui/lib/tanstack-data-port`, because it statically imports the optional `@tanstack/react-query` peer.

```tsx
import "@corbits/react-ui/styles.css";

import { Button } from "@corbits/react-ui/ui/button";
import { DataTable } from "@corbits/react-ui/ui/data-table";
import { DataPortProvider } from "@corbits/react-ui/lib/data-port";
import { createTanstackDataPort } from "@corbits/react-ui/lib/tanstack-data-port";

export function Runs() {
  return (
    <DataPortProvider value={createTanstackDataPort()}>
      <DataTable
        request={{
          key: ["runs"],
          pageSize: 50,
          fetch: ({ signal, offset, pageSize }) =>
            api.runs({ signal, offset, pageSize }),
        }}
        columns={[
          { id: "name", header: "Run", cell: (run) => run.name },
          { id: "status", header: "Status", cell: (run) => run.status },
        ]}
      />
      <Button onClick={() => api.start()}>Run now</Button>
    </DataPortProvider>
  );
}
```

This package ships no `"use client"` directives. In a React Server Components app, re-export stateful components from a file you mark yourself, using subpaths rather than the root barrel.

## How it works

Components take data through a `DataPort` (or none). The root entry is re-exports only and the package is side-effect free aside from the CSS files, so either import style tree-shakes to what you used. Tokens and keyframes live in `theme.css`; `styles.css` is the prebuilt sheet for hosts that do not run Tailwind.

See [PRODUCT.md](./PRODUCT.md) for why this library exists, [ARCHITECTURE.md](./ARCHITECTURE.md) for the DataPort seam and the theme layer, and [IMPLEMENTATION.md](./IMPLEMENTATION.md) for toolchain and peers.

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
