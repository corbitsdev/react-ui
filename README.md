# @corbits/react-ui

React components for agent and workflow surfaces — chat, runs, schedules, artifacts,
analytics, collections. 106 modules, importable one at a time.

Licensed LGPL-2.1-only (see `LICENSE`).

## Install

```bash
npm install @corbits/react-ui react react-dom lucide-react sonner @radix-ui/react-dialog @radix-ui/react-slot
```

```bash
pnpm add @corbits/react-ui react react-dom lucide-react sonner @radix-ui/react-dialog @radix-ui/react-slot
```

```bash
yarn add @corbits/react-ui react react-dom lucide-react sonner @radix-ui/react-dialog @radix-ui/react-slot
```

```bash
bun add @corbits/react-ui react react-dom lucide-react sonner @radix-ui/react-dialog @radix-ui/react-slot
```

React 18 or 19. `@tanstack/react-query` is an **optional** peer, needed only if you use
`createTanstackDataPort()`; components take their data through a `DataPort` and work with
any data layer, or none.

## Styling

Import the prebuilt stylesheet once, at the root of your app. It needs no Tailwind and no
build configuration:

```tsx
import "@corbits/react-ui/styles.css";
```

**This sheet is not inert — it restyles your page.** It carries Tailwind's preflight and a
base layer, so importing it resets margins and list styles across your app, sets every
element's default border color, and sets the page background, text color and font. That is
what makes the components look right with no build configuration, and it is a global
change. Import it at the root of an app you are willing to hand over to it.

If you already use Tailwind v4 — or you need the components styled without the reset —
import the theme instead and let your own build generate the utilities:

```css
@import "tailwindcss";
@import "@corbits/react-ui/theme.css";
```

That one directive gives you the tokens, the keyframes and the base layer without a second
copy of preflight, and points Tailwind at the package's own class names.

Dark mode is a `dark` class on an ancestor. The library reads it; it does not manage it.

```tsx
<html className="dark">
```

The brand faces (Red Hat Display, Space Mono) are named by the theme but not bundled. Load
them yourself, or the stack falls through to system fonts. To use a face loaded under a
generated name, override `--font-sans` / `--font-mono`.

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

**One module is subpath-only: `@corbits/react-ui/lib/tanstack-data-port`.** It is fully
public, just deliberately absent from the root entry, because it statically imports the
optional `@tanstack/react-query` peer — re-exporting it from the root would make that peer
mandatory for everyone. Import the adapter by its subpath, as above.

## Server components

**This package ships no `"use client"` directives.** In a React Server Components app —
Next.js App Router and similar — components that hold state or take event handlers must be
imported from a file you mark yourself:

```tsx
"use client";
export { Button } from "@corbits/react-ui/ui/button";
export { CommandPalette } from "@corbits/react-ui/ui/command-palette";
```

Use subpaths rather than the root entry here: a client-boundary file is re-exported into
your own bundle, and naming the modules you actually mark keeps the boundary — and the
bundle — to exactly those. Components that render no state (tiles, badges, layout shells)
work directly in a server component with no boundary at all.

## Development

```bash
bun install
bun run build      # generate → SWC → tsc → Tailwind → contrast gate
bun run typecheck
bun run lint
bun run dep-guard
```

`ARCHITECTURE.md` covers the `DataPort` seam, the theme layer and the known limits.
`CONTRIBUTING.md` covers the gates and how to add a component.
