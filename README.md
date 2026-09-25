# @corbits/react-ui

React components for agent and workflow surfaces — chat, runs, artifacts, analytics, collections. Import one module at a time, or from the root barrel.

## Runtime support

Node >= 24 consumes built `dist/`. Required peers: `react` and `react-dom` (18 or 19), `lucide-react`, `@radix-ui/react-slot`.

Optional peers, needed only by the subpaths that import them. These modules are not in the root barrel; import them by subpath:

| Peer | Subpaths |
| --- | --- |
| `@radix-ui/react-dialog` | `ui/dialog`, `ui/command-palette`, `ui/mic-permission-dialog` |
| `@radix-ui/react-dropdown-menu` | `ui/menu` |
| `@radix-ui/react-tooltip` | `ui/tooltip` |
| `sonner` | `ui/toast` |

## Quickstart

```bash
npm add @corbits/react-ui
pnpm add @corbits/react-ui
yarn add @corbits/react-ui
bun add @corbits/react-ui
```

Until a release is cut, consumers pin a commit instead of a version range:

```json
"@corbits/react-ui": "github:corbitsdev/react-ui#<commit-sha>"
```

Import the stylesheet once at the app root, before your own CSS (no Tailwind build required). Mount `ThemeProvider` near the root so dark mode persists per user, and `Toaster` once alongside it so any component can call `toast()`:

```tsx
import "@corbits/react-ui/styles.css";

import { ThemeProvider } from "@corbits/react-ui";
import { Toaster, toast } from "@corbits/react-ui/ui/toast";

export function Root() {
  return (
    <ThemeProvider storageKey="corbits-theme" defaultMode="light">
      <App />
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}

function App() {
  return <button onClick={() => toast("Signed out.")}>Sign out</button>;
}
```

That sheet includes Tailwind preflight and a base layer — it restyles the page, and neither import is safe to skip: without one of them the components render unstyled markup, not a fallback look. If you already use Tailwind v4, import `@corbits/react-ui/theme.css` instead and let your own build generate utilities; don't import both.

Dark mode is a `dark` class on an ancestor; the stylesheet reads it and does not manage it. With neither `.dark` nor `.light` set, the theme follows the OS — a `@media (prefers-color-scheme: dark)` block applies the dark tokens to `:root` and sets `color-scheme: dark` so native controls follow, so a zero-JS install already renders dark on a dark-OS host. That media-query path is tokens only — `dark:` utilities still need a `.dark` ancestor.

Removing `.dark` is not light: hosts that toggle by adding and removing `.dark` must now add `.light` for an explicit light choice (or mount `ThemeProvider`, which toggles both), or a dark-OS user falls back to OS dark. An explicit-light choice on a dark OS first-paints dark then swaps when JS adds `.light`; to block the flash, apply it before first paint *only when the stored choice is light* — `<script>if (localStorage.getItem("corbits-theme")?.includes('"light"')) document.documentElement.classList.add("light")</script>` — adding it unconditionally pins light for dark-OS users too. `ThemeProvider` still wins once it mounts — mount it only if you want the library to persist the choice and apply named presets.

A page body typically pairs `PageShell` (margins and scroll ownership) with `EmptyState` (title, description, an optional icon, and an action):

```tsx
import { Button, EmptyState, PageShell } from "@corbits/react-ui";

export function NotFoundPage() {
  return (
    <PageShell width="full">
      <EmptyState
        title="Page not found"
        description="This page doesn't exist."
        action={
          <Button variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
        }
      />
    </PageShell>
  );
}
```

Every component is importable by subpath (`@corbits/react-ui/ui/button`); all but the optional-peer modules above are also exported from the root (`@corbits/react-ui`).

The brand faces (Red Hat Display, Space Mono) are named by the theme but not bundled. Load them yourself, or the stack falls through to system fonts; to use a face loaded under a generated name, override `--font-sans` / `--font-mono`.

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

## Thinking indicator

The Corbits logo has three motion variants: `silk` (default), `strata`, and `echo`.

```tsx
import { ThinkingIndicator, ThinkingMark } from "@corbits/react-ui";

export function Thinking() {
  return (
    <>
      <ThinkingIndicator variant="silk" />
      <ThinkingIndicator variant="strata" label="Reviewing files..." />
      <ThinkingMark variant="echo" className="w-8" />
    </>
  );
}
```

`ThinkingIndicator` supplies an accessible status label; `ThinkingMark` is decorative.
Both accept `variant`, `paused`, `className`, and `style`. Reduced-motion users see a
static highlight instead.

## License

LGPL-2.1-only. See [LICENSE](./LICENSE).
