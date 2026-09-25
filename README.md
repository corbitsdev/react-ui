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
bun add @corbits/react-ui
```

Import the stylesheet once at the app root, before your own CSS (no Tailwind build required). Mount `ThemeProvider` near the root (see [Theming](#theming)) and `Toaster` once alongside it so any component can call `toast()`:

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

That sheet includes Tailwind preflight and a base layer — it restyles the page, and neither import is safe to skip: without one of them the components render unstyled markup, not a fallback look. If you already use Tailwind v4, import `@corbits/react-ui/theme.css` instead and let your own build generate utilities; don't import both. Dark mode and fonts are under [Theming](#theming).

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

A conversation is a `ChatThread` over a `messages` array; each message is an ordered list of parts, so an agent turn can interleave text and tool calls:

```tsx
import { ChatThread, type ChatMessage } from "@corbits/react-ui";

const messages: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    createdAt: "2026-01-01T09:00:00Z",
    parts: [{ type: "text", text: "What changed in the repo today?" }],
  },
  {
    id: "m2",
    role: "agent",
    createdAt: "2026-01-01T09:00:04Z",
    parts: [
      {
        type: "tool",
        toolCallId: "t1",
        toolName: "git__log",
        label: "Read today's commits",
        state: "done",
        output: "3 commits",
      },
      { type: "text", text: "Three commits landed today, all in the docs." },
    ],
  },
];

export function Conversation() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: 384 }}>
      <ChatThread messages={messages} identity={{ name: "Scout" }} />
    </div>
  );
}
```

Every component is importable by subpath (`@corbits/react-ui/ui/button`); all but the optional-peer modules above are also exported from the root (`@corbits/react-ui`).

This package ships no `"use client"` directives. In a React Server Components app, re-export stateful components from a file you mark yourself, using subpaths rather than the root barrel.

## Theming

Dark mode is a `dark` class on an ancestor; the stylesheet reads it and does not manage it. With neither `.dark` nor `.light` set, the theme follows the OS — a `@media (prefers-color-scheme: dark)` block applies the dark tokens to `:root` and sets `color-scheme: dark` so native controls follow, so a zero-JS install already renders dark on a dark-OS host. That media-query path is tokens only — `dark:` utilities still need a `.dark` ancestor.

Removing `.dark` is not light: hosts that toggle by adding and removing `.dark` must now add `.light` for an explicit light choice (or mount `ThemeProvider`, which toggles both), or a dark-OS user falls back to OS dark. An explicit-light choice on a dark OS first-paints dark then swaps when JS adds `.light`; to block the flash, apply it before first paint *only when the stored choice is light* — `<script>if (localStorage.getItem("corbits-theme")?.includes('"light"')) document.documentElement.classList.add("light")</script>` — adding it unconditionally pins light for dark-OS users too. `ThemeProvider` still wins once it mounts — mount it only if you want the library to persist the choice and apply named presets.

The brand faces (Red Hat Display, Space Mono) are named by the theme but not bundled. Load them yourself, or the stack falls through to system fonts; to use a face loaded under a generated name, override `--font-sans` / `--font-mono`.

## Components

Subpaths are relative to `@corbits/react-ui/`.

### Chat

| Component | Subpath | What it is |
| --- | --- | --- |
| `ChatThread` | `ui/chat-thread` | Scrolling transcript of user and agent messages |
| `AgentTurn` | `ui/agent-turn` | One agent reply: reasoning, tool calls, answer, in order |
| `MessageBubble` | `ui/message-bubble` | One user or system message |
| `ChatInput` | `ui/chat-input` | Auto-growing message input with a send/stop button |
| `ChatComposer` | `ui/chat-composer` | `ChatInput` with suggestion chips for an empty conversation |
| `ChatPanel` | `ui/chat-panel` | Docked chat frame with header and footer |
| `PartsRenderer` | `ui/parts-renderer` | Renders a list of message parts |
| `ReasoningBlock` | `ui/reasoning-block` | Collapsible thinking text |
| `ToolBlock` | `ui/tool-block` | A tool call's lifecycle: running, done, failed |
| `ToolNarrative` | `ui/tool-narrative` | What the agent did, as one expandable line |
| `ToolPicker` | `ui/tool-picker` | Browse, search and select tools |
| `QuickReplyChips` | `ui/quick-reply-chips` | Tappable suggested replies |
| `TypingIndicator` | `ui/typing-indicator` | Agent-is-typing dots |
| `ThinkingIndicator` | `ui/thinking-indicator` | Animated Corbits mark with a status label |
| `ThinkingMark` | `ui/thinking-mark` | Decorative animated Corbits mark |
| `ThinkingLabel` | `ui/thinking-label` | Rotating-verb status label |
| `ShimmerText` | `ui/shimmer-text` | Shimmer sweep over text |
| `MicButton` | `ui/mic-button` | Permission-aware microphone toggle |
| `VoiceWaveform` | `ui/voice-waveform` | Live audio level bars |
| `DictationStatusLine` | `ui/dictation-status-line` | Composer dictation status row |
| `MicPermissionDialog` | `ui/mic-permission-dialog` | Microphone permission prompt |

### Runs

| Component | Subpath | What it is |
| --- | --- | --- |
| `LiveRunBanner` | `ui/live-run-banner` | Status of a run in progress |
| `LiveStatusLine` | `ui/live-status-line` | The single "what's happening now" line |
| `ApprovalCard` | `ui/approval-card` | Approve or reject a pending action |
| `GateBlock` | `ui/gate-block` | Chrome for a run parked on a human decision |
| `StepList` | `ui/step-list` | Vertical list of run steps and their status |
| `HorizontalStepper` | `ui/horizontal-stepper` | Horizontal step progress |
| `ProgressChecklist` | `ui/progress-checklist` | Steps of a long operation and how far along it is |
| `TraceWaterfall` | `ui/trace-waterfall` | Run-trace timeline, one row per span |
| `IntakeForm` | `ui/intake-form` | Inputs a workflow asks for before it runs |
| `RunNowButton` | `ui/run-now-button` | Run something immediately |
| `ConfirmButton` | `ui/confirm-button` | Button that asks for a second click |
| `NowCards` | `ui/now-cards` | Attention band of items needing action |
| `NotificationsBell` | `ui/notifications-bell` | Bell with count and a panel slot |

### Artifacts

| Component | Subpath | What it is |
| --- | --- | --- |
| `ArtifactBody` | `ui/artifact-body` | One artifact, drawn the way its kind implies |
| `ArtifactNotice` | `ui/artifact-notice` | "Nothing to draw here" message for artifact viewers |
| `BlockCard` | `ui/block-card` | Generative-UI block frame |
| `ResearchBody` | `ui/research-body` | Research brief and report |
| `CompareBody` | `ui/compare-body` | Side-by-side comparison |
| `EmbedBody` | `ui/embed-body` | Sandboxed third-party embed |
| `CsvTable` | `ui/csv-table` | Capped preview of CSV text |
| `QuoteCard` | `ui/quote-card` | A rotating quote |
| `ProfileCard` | `ui/profile-card` | Identity, status, actions and channels |

### Charts

| Component | Subpath | What it is |
| --- | --- | --- |
| `ChartFrame` | `ui/chart-frame` | Caption, legend, plot, and the same data as a table |
| `TimeSeriesChart` | `ui/time-series-chart` | Values over time |
| `BarChart` | `ui/bar-chart` | Vertical bars |
| `CategoryBars` | `ui/category-bars` | Dense horizontal category ranking |
| `Sparkline` | `ui/sparkline` | Inline trend line |
| `TokenMosaic` | `ui/token-mosaic` | Shares of a whole as one stacked strip |
| `StatGrid` | `ui/stat-grid` | Grid of headline numbers |
| `AnimatedNumber` | `ui/animated-number` | Number that counts to its new value |

### Layout

| Component | Subpath | What it is |
| --- | --- | --- |
| `PageShell` | `ui/page-shell` | Page margins and scroll ownership |
| `PagePanel` | `ui/page-panel` | Bordered page-content frame |
| `TopBar` | `ui/top-bar` | Title, breadcrumbs and actions row |
| `Sidebar` | `ui/sidebar` | Collapsible navigation sidebar |
| `SidebarPanel` | `ui/sidebar-panel` | Sidebar with pins, body and footer |
| `SidebarItemRow` | `ui/sidebar-item-row` | One sidebar row |
| `ListDetail` | `ui/list-detail` | Index on the left, open item on the right |
| `InspectorShell` | `ui/inspector-shell` | Side inspector rail |
| `Section` | `ui/section` | Titled block of content |
| `SettingsPanel` | `ui/settings-panel` | Settings frame with optional save |
| `LibraryPageHeader` | `ui/library-page-header` | Title, count and controls for a library page |
| `Card` | `ui/card` | Bordered content card |
| `EmptyState` | `ui/empty-state` | Title, description, icon and action |
| `RichEmptyState` | `ui/rich-empty-state` | Empty state with suggested next-step actions |
| `BootScreen` | `ui/boot-screen` | Screen shown before the app loads |
| `DitherCanvas` | `ui/dither-canvas` | Animated dithered background |
| `CorbitsMark` | `ui/corbits-mark` | Corbits logo |
| `AuthLayout` | `blocks/login/auth-layout` | Sign-in page layout |
| `LoginForm` | `blocks/login/login-form` | Sign-in and sign-up form, with optional SSO |

### Controls

| Component | Subpath | What it is |
| --- | --- | --- |
| `Button` | `ui/button` | Button with variants and sizes |
| `Input` | `ui/input` | Text input |
| `Textarea` | `ui/textarea` | Multi-line input |
| `Select` | `ui/select` | Native select |
| `Checkbox` | `ui/checkbox` | Checkbox |
| `SelectionCheckbox` | `ui/selection-checkbox` | Row-selection checkbox |
| `Switch` | `ui/switch` | On/off toggle |
| `FileInput` | `ui/file-input` | File picker |
| `Tabs` | `ui/tabs` | Tab strip |
| `ViewToggle` | `ui/view-toggle` | Grid or rows segmented control |
| `FilterBar` | `ui/filter-bar` | Row of filters with an active-filter summary |
| `FilterChip` | `ui/filter-chip` | One toggleable filter |
| `KindCardGrid` | `ui/kind-card-grid` | Selectable card grid |
| `BulkActionBar` | `ui/bulk-action-bar` | Actions for a multi-row selection |
| `Table` | `ui/table` | Table primitives |
| `SortableTable` | `ui/sortable-table` | Table with sortable columns |
| `Badge` | `ui/badge` | Status label |
| `StatusDot` | `ui/status-dot` | Colored status dot |
| `Avatar` | `ui/avatar` | Initials or image avatar |
| `ProviderMark` | `ui/provider-mark` | Which service an action goes through |
| `Skeleton` | `ui/skeleton` | Loading placeholder |
| `Dialog` | `ui/dialog` | Modal dialog |
| `CommandPalette` | `ui/command-palette` | Global search overlay |
| `Menu` | `ui/menu` | Dropdown menu |
| `InfoTooltip` | `ui/tooltip` | Hover info tooltip |
| `Toaster` | `ui/toast` | Toast host; call `toast()` anywhere |
| `ThemeProvider` | `ui/theme-provider` | Persists light, dark or system mode and presets |
| `ThemeToggle` | `ui/theme-toggle` | Light, dark or system switch |

## How it works

Components never fetch — data arrives as props. The root entry is re-exports only and the package is side-effect free aside from the CSS files, so either import style tree-shakes to what you used. Tokens and keyframes live in `theme.css`; `styles.css` is the prebuilt sheet for hosts that do not run Tailwind.

See [PRODUCT.md](https://github.com/corbitsdev/react-ui/blob/main/PRODUCT.md) for why this library exists, [ARCHITECTURE.md](https://github.com/corbitsdev/react-ui/blob/main/ARCHITECTURE.md) for the no-fetch rule and the theme layer, and [IMPLEMENTATION.md](https://github.com/corbitsdev/react-ui/blob/main/IMPLEMENTATION.md) for toolchain and peers.

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

A new component is not done until it has at least one story per meaningful state, checked in both themes. See [CONTRIBUTING.md](https://github.com/corbitsdev/react-ui/blob/main/CONTRIBUTING.md).

## License

LGPL-2.1-only. See [LICENSE](https://github.com/corbitsdev/react-ui/blob/main/LICENSE).
