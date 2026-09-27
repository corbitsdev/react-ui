# @corbits/react-ui

React components for agent products: chat transcripts with reasoning and tool calls, approval cards, run status, artifacts and charts, styled by one Tailwind v4 token theme. The UI package of Corbits: it renders data a host web app loads from Interchange, and works in any React 18 or 19 app without Interchange.

## Why @corbits/react-ui?

1. **Props in, markup out.** No component fetches, subscribes or holds a client. Your data layer stays yours, and every component renders the same in stories, tests and production.
2. **Agent-shaped building blocks.** `ChatThread` renders a message as ordered parts (text, reasoning, tool calls), and `ApprovalCard`, `GateBlock` and `StepList` cover a run that waits on a person.
3. **Pay for what you import.** Every component has its own subpath, the package is side-effect free apart from its CSS, and heavy peers (Radix dialog, dropdown-menu, tooltip, `sonner`) are optional.
4. **Server Components ready.** Stateful modules ship `"use client"`, so a React Server Components app imports them directly. Outside RSC the directive is a no-op.

## Install

```bash
bun add @corbits/react-ui react react-dom lucide-react @radix-ui/react-slot
```

Requires Node 24 or later. Tested on React 19; the peer range also accepts React 18.2+.

Optional peers are needed only by the subpaths that import them. Those modules are not in the root barrel, so import them by subpath:

| Peer                            | Subpaths                                                      |
| ------------------------------- | ------------------------------------------------------------- |
| `@radix-ui/react-dialog`        | `ui/dialog`, `ui/command-palette`, `ui/mic-permission-dialog` |
| `@radix-ui/react-dropdown-menu` | `ui/menu`                                                     |
| `@radix-ui/react-tooltip`       | `ui/tooltip`                                                  |
| `sonner`                        | `ui/toast`                                                    |

## Quickstart

Import the stylesheet once at the app root, before your own CSS, and mount `ThemeProvider` near the root:

```tsx
import "@corbits/react-ui/styles.css";

import { ChatThread, ThemeProvider, type ChatMessage } from "@corbits/react-ui";

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
      { type: "reasoning", text: "Check the commit log first." },
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

export function App() {
  return (
    <ThemeProvider>
      <ChatThread messages={messages} identity={{ name: "Scout" }} />
    </ThemeProvider>
  );
}
```

This renders the user message, a collapsed reasoning block, a finished tool call and the agent's reply.

`styles.css` includes Tailwind preflight and a base layer, so it restyles the page. If you already run Tailwind v4, import `@corbits/react-ui/theme.css` instead and let your build generate the utilities. Import one of the two, never both; without either, components render unstyled.

## Where it fits

- **Interchange** runs AI agents as principals (first-class identities with their own permissions and credentials). The hub is its multi-tenant control plane: tenants, principals, grants (permissions a principal holds) and credentials. The sidecar is the portable agent runtime.
- **Corbits** is the set of published packages around Interchange that turn an agent into a product. This package is the UI bucket: it runs in the host web app and plugs into the host's data layer, not into the hub or the sidecar.
- It pairs with the hub modules whose data it renders, such as [`@corbits/artifacts`](https://github.com/corbitsdev/corbits-artifacts), [`@corbits/mailbox`](https://github.com/corbitsdev/corbits-mailbox) and [`@corbits/cron`](https://github.com/corbitsdev/corbits-cron).

## Usage

Import from the root or from a subpath; both tree-shake to what you use:

```tsx
import { Button } from "@corbits/react-ui";
import { Toaster, toast } from "@corbits/react-ui/ui/toast";

export function SignOut() {
  return (
    <>
      <Button onClick={() => toast("Signed out.")}>Sign out</Button>
      <Toaster position="bottom-right" />
    </>
  );
}
```

### Theming

Dark mode is a `.dark` class on an ancestor. With neither `.dark` nor `.light` on the root, the tokens follow `prefers-color-scheme` and set `color-scheme` for native controls; `dark:` utilities still need a `.dark` ancestor.

`ThemeProvider` toggles both classes and persists the choice under `storageKey`. Hosts that manage the class themselves add `.light` for an explicit light choice, since removing `.dark` falls back to the OS. To avoid a dark first paint for a stored light choice on a dark OS, add `.light` before first paint only when the stored choice is light:

```html
<script>
  if (localStorage.getItem("corbits-theme")?.includes('"light"'))
    document.documentElement.classList.add("light");
</script>
```

The theme names Red Hat Display and Space Mono but does not bundle them. Load them yourself or the stack falls back to system fonts; override `--font-sans` and `--font-mono` for a face loaded under another name.

### Components

Subpaths are relative to `@corbits/react-ui/`. Rows marked "optional peer" are subpath-only; see [Install](#install).

#### Chat

| Component             | Subpath                    | What it is                                                  |
| --------------------- | -------------------------- | ----------------------------------------------------------- |
| `ChatThread`          | `ui/chat-thread`           | Scrolling transcript of user and agent messages             |
| `AgentTurn`           | `ui/agent-turn`            | One agent reply: reasoning, tool calls, answer, in order    |
| `MessageBubble`       | `ui/message-bubble`        | One user or system message                                  |
| `ChatInput`           | `ui/chat-input`            | Auto-growing message input with a send/stop button          |
| `ChatComposer`        | `ui/chat-composer`         | `ChatInput` with suggestion chips for an empty conversation |
| `ChatPanel`           | `ui/chat-panel`            | Docked chat frame with header and footer                    |
| `PartsRenderer`       | `ui/parts-renderer`        | Renders a list of message parts                             |
| `ReasoningBlock`      | `ui/reasoning-block`       | Collapsible thinking text                                   |
| `ToolBlock`           | `ui/tool-block`            | A tool call's lifecycle: running, done, failed              |
| `ToolNarrative`       | `ui/tool-narrative`        | What the agent did, as one expandable line                  |
| `ToolPicker`          | `ui/tool-picker`           | Browse, search and select tools                             |
| `QuickReplyChips`     | `ui/quick-reply-chips`     | Tappable suggested replies                                  |
| `TypingIndicator`     | `ui/typing-indicator`      | Agent-is-typing dots                                        |
| `ThinkingIndicator`   | `ui/thinking-indicator`    | Animated Corbits mark with a status label                   |
| `ThinkingMark`        | `ui/thinking-mark`         | Decorative animated Corbits mark                            |
| `ThinkingLabel`       | `ui/thinking-label`        | Rotating-verb status label                                  |
| `ShimmerText`         | `ui/shimmer-text`          | Shimmer sweep over text                                     |
| `MicButton`           | `ui/mic-button`            | Permission-aware microphone toggle                          |
| `VoiceWaveform`       | `ui/voice-waveform`        | Live audio level bars                                       |
| `DictationStatusLine` | `ui/dictation-status-line` | Composer dictation status row                               |
| `MicPermissionDialog` | `ui/mic-permission-dialog` | Microphone permission prompt (optional peer)                |

#### Runs

| Component           | Subpath                 | What it is                                        |
| ------------------- | ----------------------- | ------------------------------------------------- |
| `LiveRunBanner`     | `ui/live-run-banner`    | Status of a run in progress                       |
| `LiveStatusLine`    | `ui/live-status-line`   | The single "what's happening now" line            |
| `ApprovalCard`      | `ui/approval-card`      | Approve or reject a pending action                |
| `GateBlock`         | `ui/gate-block`         | Chrome for a run parked on a human decision       |
| `StepList`          | `ui/step-list`          | Vertical list of run steps and their status       |
| `HorizontalStepper` | `ui/horizontal-stepper` | Horizontal step progress                          |
| `ProgressChecklist` | `ui/progress-checklist` | Steps of a long operation and how far along it is |
| `TraceWaterfall`    | `ui/trace-waterfall`    | Run-trace timeline, one row per span              |
| `IntakeForm`        | `ui/intake-form`        | Inputs a workflow asks for before it runs         |
| `RunNowButton`      | `ui/run-now-button`     | Run something immediately                         |
| `ConfirmButton`     | `ui/confirm-button`     | Button that asks for a second click               |
| `NowCards`          | `ui/now-cards`          | Attention band of items needing action            |
| `NotificationsBell` | `ui/notifications-bell` | Bell with count and a panel slot                  |

#### Artifacts

| Component        | Subpath              | What it is                                          |
| ---------------- | -------------------- | --------------------------------------------------- |
| `ArtifactBody`   | `ui/artifact-body`   | One artifact, drawn the way its kind implies        |
| `ArtifactNotice` | `ui/artifact-notice` | "Nothing to draw here" message for artifact viewers |
| `BlockCard`      | `ui/block-card`      | Generative-UI block frame                           |
| `ResearchBody`   | `ui/research-body`   | Research brief and report                           |
| `CompareBody`    | `ui/compare-body`    | Side-by-side comparison                             |
| `EmbedBody`      | `ui/embed-body`      | Sandboxed third-party embed                         |
| `CsvTable`       | `ui/csv-table`       | Capped preview of CSV text                          |
| `QuoteCard`      | `ui/quote-card`      | A rotating quote                                    |
| `ProfileCard`    | `ui/profile-card`    | Identity, status, actions and channels              |

#### Charts

| Component         | Subpath                | What it is                                          |
| ----------------- | ---------------------- | --------------------------------------------------- |
| `ChartFrame`      | `ui/chart-frame`       | Caption, legend, plot, and the same data as a table |
| `TimeSeriesChart` | `ui/time-series-chart` | Values over time                                    |
| `BarChart`        | `ui/bar-chart`         | Vertical bars                                       |
| `CategoryBars`    | `ui/category-bars`     | Dense horizontal category ranking                   |
| `Sparkline`       | `ui/sparkline`         | Inline trend line                                   |
| `TokenMosaic`     | `ui/token-mosaic`      | Shares of a whole as one stacked strip              |
| `StatGrid`        | `ui/stat-grid`         | Grid of headline numbers                            |
| `AnimatedNumber`  | `ui/animated-number`   | Number that counts to its new value                 |

#### Layout

| Component           | Subpath                    | What it is                                   |
| ------------------- | -------------------------- | -------------------------------------------- |
| `PageShell`         | `ui/page-shell`            | Page margins and scroll ownership            |
| `PagePanel`         | `ui/page-panel`            | Bordered page-content frame                  |
| `TopBar`            | `ui/top-bar`               | Title, breadcrumbs and actions row           |
| `Sidebar`           | `ui/sidebar`               | Collapsible navigation sidebar               |
| `SidebarPanel`      | `ui/sidebar-panel`         | Sidebar with pins, body and footer           |
| `SidebarItemRow`    | `ui/sidebar-item-row`      | One sidebar row                              |
| `ListDetail`        | `ui/list-detail`           | Index on the left, open item on the right    |
| `InspectorShell`    | `ui/inspector-shell`       | Side inspector rail                          |
| `Section`           | `ui/section`               | Titled block of content                      |
| `SettingsPanel`     | `ui/settings-panel`        | Settings frame with optional save            |
| `LibraryPageHeader` | `ui/library-page-header`   | Title, count and controls for a library page |
| `Card`              | `ui/card`                  | Bordered content card                        |
| `EmptyState`        | `ui/empty-state`           | Title, description, icon and action          |
| `RichEmptyState`    | `ui/rich-empty-state`      | Empty state with suggested next-step actions |
| `BootScreen`        | `ui/boot-screen`           | Screen shown before the app loads            |
| `DitherCanvas`      | `ui/dither-canvas`         | Animated dithered background                 |
| `CorbitsMark`       | `ui/corbits-mark`          | Corbits logo                                 |
| `AuthLayout`        | `blocks/login/auth-layout` | Sign-in page layout                          |
| `LoginForm`         | `blocks/login/login-form`  | Sign-in and sign-up form, with optional SSO  |

#### Controls

| Component           | Subpath                 | What it is                                          |
| ------------------- | ----------------------- | --------------------------------------------------- |
| `Button`            | `ui/button`             | Button with variants and sizes                      |
| `Input`             | `ui/input`              | Text input                                          |
| `Textarea`          | `ui/textarea`           | Multi-line input                                    |
| `Select`            | `ui/select`             | Native select                                       |
| `Checkbox`          | `ui/checkbox`           | Checkbox                                            |
| `SelectionCheckbox` | `ui/selection-checkbox` | Row-selection checkbox                              |
| `Switch`            | `ui/switch`             | On/off toggle                                       |
| `FileInput`         | `ui/file-input`         | File picker                                         |
| `Tabs`              | `ui/tabs`               | Tab strip                                           |
| `ViewToggle`        | `ui/view-toggle`        | Grid or rows segmented control                      |
| `FilterBar`         | `ui/filter-bar`         | Row of filters with an active-filter summary        |
| `FilterChip`        | `ui/filter-chip`        | One toggleable filter                               |
| `KindCardGrid`      | `ui/kind-card-grid`     | Selectable card grid                                |
| `BulkActionBar`     | `ui/bulk-action-bar`    | Actions for a multi-row selection                   |
| `Table`             | `ui/table`              | Table primitives                                    |
| `SortableTable`     | `ui/sortable-table`     | Table with sortable columns                         |
| `Badge`             | `ui/badge`              | Status label                                        |
| `StatusDot`         | `ui/status-dot`         | Colored status dot                                  |
| `Avatar`            | `ui/avatar`             | Initials or image avatar                            |
| `ProviderMark`      | `ui/provider-mark`      | Which service an action goes through                |
| `Skeleton`          | `ui/skeleton`           | Loading placeholder                                 |
| `Dialog`            | `ui/dialog`             | Modal dialog (optional peer)                        |
| `CommandPalette`    | `ui/command-palette`    | Global search overlay (optional peer)               |
| `Menu`              | `ui/menu`               | Dropdown menu (optional peer)                       |
| `InfoTooltip`       | `ui/tooltip`            | Hover info tooltip (optional peer)                  |
| `Toaster`           | `ui/toast`              | Toast host; call `toast()` anywhere (optional peer) |
| `ThemeProvider`     | `ui/theme-provider`     | Persists light, dark or system mode and presets     |
| `ThemeToggle`       | `ui/theme-toggle`       | Light, dark or system switch                        |

## Using with Interchange

The host app owns the connection to the hub; components only take props.

1. Load run state with [`@intx/hub-client`](https://github.com/faremeter/interchange/tree/main/packages/hub-client): `createRunSession` polls a workflow run's event log and exposes a seq-ordered `WorkflowRunEvent` timeline.
2. Map that timeline to props: agent output to `ChatMessage` parts for `ChatThread`, step events to `StepList` items, and a run parked on a person to `GateBlock` or `ApprovalCard`.
3. Wire callbacks back to the hub. `ApprovalCard`'s `onApprove` and `onReject` call your hub route that resolves the awaited signal; the hub checks the caller's grant, not the component.

## Upgrading from 0.1

- Install from npm. Git installs (`github:corbitsdev/react-ui#<sha>`) no longer build `dist/`.
- `ui/dialog`, `ui/command-palette`, `ui/mic-permission-dialog`, `ui/menu`, `ui/tooltip` and `ui/toast` are subpath-only, and their peers are optional: `import { Toaster, toast } from "@corbits/react-ui/ui/toast"`. Install the peer for each subpath you keep.
- `lib/csv`, `lib/url`, `lib/utils`, `lib/workflow-registry` and `ui/chat-dock-timing` are internal. Replace `cn` with `twMerge(clsx(...))`.
- Stateful components ship `"use client"`. Client wrappers you wrote for them still work, and can go.
- 84 unused modules are removed, `ui/command` is removed, `ActivityBlock` is renamed `ReasoningBlock`, and `AuthLayout` no longer renders `DitherCanvas` by default.
- With neither `.dark` nor `.light` on the root, the theme follows the OS. Hosts that toggle `.dark` must add `.light` for an explicit light choice, or mount `ThemeProvider`.
- The full list is in the [changelog](https://github.com/corbitsdev/react-ui/blob/main/CHANGELOG.md).

## License

LGPL-2.1-only. See [LICENSE](https://github.com/corbitsdev/react-ui/blob/main/LICENSE).
