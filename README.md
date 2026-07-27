# @corbits/react-ui

React components for agent and workflow surfaces — chat, runs, schedules, artifacts,
analytics, collections. Generic naming throughout; no product-brand names in the public
API.

Licensed LGPL-2.1-only (see `LICENSE`).

## Install

```bash
npm install @corbits/react-ui
```

Peer dependencies:

```bash
npm install react react-dom lucide-react sonner \
  @radix-ui/react-dialog @radix-ui/react-slot
```

`@tanstack/react-query` is an **optional** peer. It is only needed if you use
`createTanstackDataPort()`; components take their data through a `DataPort` and work with
any data layer, or none.

## Styling

Import the prebuilt stylesheet once, at the root of your app. It needs no Tailwind and no
build configuration:

```tsx
import "@corbits/react-ui/styles.css";
```

If you already use Tailwind v4, import the theme instead of the prebuilt sheet and let
your own build generate the utilities. One directive — the package tells Tailwind where
its own class names live:

```css
@import "tailwindcss";
@import "@corbits/react-ui/theme.css";
```

Dark mode is a `dark` class on an ancestor. The library reads it; it does not manage it.

```tsx
<html className="dark">
```

The brand faces (Red Hat Display, Space Mono) are named by the theme but not bundled.
Load them yourself, or the stack falls through to system fonts.

## Usage

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
          fetch: ({ signal, offset, pageSize }) => api.runs({ signal, offset, pageSize }),
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

Every component is importable by subpath (`@corbits/react-ui/ui/button`) or from the root
(`@corbits/react-ui`). Both resolve to the same module; the root entry is re-exports only
and the package is side-effect free, so either way you bundle just what you used.

## Server components

**This package ships no `"use client"` directives.** In a React Server Components app —
Next.js App Router and similar — components that hold state or take event handlers must
be imported from a file you mark yourself:

```tsx
"use client";
export { Button, CommandPalette } from "@corbits/react-ui";
```

Components that render no state — tiles, badges, layout shells — work directly in a
server component with no boundary at all. This keeps the boundary where the consumer can
see it rather than baking one framework's convention into the published files.

## Development

```bash
npm run build      # SWC → dist/*.js, tsc → dist/*.d.ts, Tailwind → dist/styles.css,
                   # then the contrast gate
npm run typecheck
npm run lint
npm run dep-guard
```

See `CONTRIBUTING.md` for the gates and `ARCHITECTURE.md` for the design tokens, the
`DataPort` seam, and why the public surface is what it is.
