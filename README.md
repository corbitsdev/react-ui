# @corbits/react-ui

React components for agent products: chat transcripts with reasoning and tool calls, approval cards, run status, artifacts and charts, styled by one Tailwind v4 token theme. The UI package of Corbits: it renders data a host web app loads from Interchange, and works in any React 18 or 19 app without Interchange.

## Why @corbits/react-ui?

1. **Props in, markup out.** No component fetches, subscribes or holds a client. Your data layer stays yours, and every component renders the same in stories, tests and production.
2. **Agent-shaped building blocks.** `ChatThread` renders a message as ordered parts (text, reasoning, tool calls), and `ApprovalCard`, `GateBlock` and `StepList` cover a run that waits on a person.
3. **Pay for what you import.** One root entry, the package is side-effect free apart from its CSS, and heavy peers (Radix dialog, dropdown-menu, tooltip, `sonner`) are optional.
4. **Server Components ready.** Stateful modules ship `"use client"`, so a React Server Components app imports them directly. Outside RSC the directive is a no-op.

## Install

```bash
bun add @corbits/react-ui react react-dom lucide-react @radix-ui/react-slot
```

Requires Node 24 or later. Tested on React 19; the peer range also accepts React 18.2+.

Optional peers are needed only by the modules that import them. Those modules are not in the root entry, so import them by subpath:

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

## Reference

Import from the root; it tree-shakes to what you use. Only the optional-peer modules have their own subpath:

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

Everything imports from `@corbits/react-ui`, except rows marked "optional peer", which import from the subpath shown; see [Install](#install).

#### Chat

| Component             | What it is                                                               |
| --------------------- | ------------------------------------------------------------------------ |
| `ChatThread`          | Scrolling transcript of user and agent messages                          |
| `AgentTurn`           | One agent reply: reasoning, tool calls, answer, in order                 |
| `MessageBubble`       | One user or system message                                               |
| `ChatInput`           | Auto-growing message input with a send/stop button                       |
| `ChatComposer`        | `ChatInput` with suggestion chips for an empty conversation              |
| `ChatPanel`           | Docked chat frame with header and footer                                 |
| `PartsRenderer`       | Renders a list of message parts                                          |
| `ReasoningBlock`      | Collapsible thinking text                                                |
| `ToolBlock`           | A tool call's lifecycle: running, done, failed                           |
| `ToolNarrative`       | What the agent did, as one expandable line                               |
| `ToolPicker`          | Browse, search and select tools                                          |
| `QuickReplyChips`     | Tappable suggested replies                                               |
| `TypingIndicator`     | Agent-is-typing dots                                                     |
| `ThinkingIndicator`   | Animated Corbits mark with a status label                                |
| `ThinkingMark`        | Decorative animated Corbits mark                                         |
| `ThinkingLabel`       | Rotating-verb status label                                               |
| `ShimmerText`         | Shimmer sweep over text                                                  |
| `MicButton`           | Permission-aware microphone toggle                                       |
| `VoiceWaveform`       | Live audio level bars                                                    |
| `DictationStatusLine` | Composer dictation status row                                            |
| `MicPermissionDialog` | Microphone permission prompt (optional peer, `ui/mic-permission-dialog`) |

#### Runs

| Component           | What it is                                        |
| ------------------- | ------------------------------------------------- |
| `LiveRunBanner`     | Status of a run in progress                       |
| `LiveStatusLine`    | The single "what's happening now" line            |
| `ApprovalCard`      | Approve or reject a pending action                |
| `GateBlock`         | Chrome for a run parked on a human decision       |
| `StepList`          | Vertical list of run steps and their status       |
| `HorizontalStepper` | Horizontal step progress                          |
| `ProgressChecklist` | Steps of a long operation and how far along it is |
| `TraceWaterfall`    | Run-trace timeline, one row per span              |
| `IntakeForm`        | Inputs a workflow asks for before it runs         |
| `RunNowButton`      | Run something immediately                         |
| `ConfirmButton`     | Button that asks for a second click               |
| `NowCards`          | Attention band of items needing action            |
| `NotificationsBell` | Bell with count and a panel slot                  |

#### Artifacts

| Component        | What it is                                          |
| ---------------- | --------------------------------------------------- |
| `ArtifactBody`   | One artifact, drawn the way its kind implies        |
| `ArtifactNotice` | "Nothing to draw here" message for artifact viewers |
| `BlockCard`      | Generative-UI block frame                           |
| `ResearchBody`   | Research brief and report                           |
| `CompareBody`    | Side-by-side comparison                             |
| `EmbedBody`      | Sandboxed third-party embed                         |
| `CsvTable`       | Capped preview of CSV text                          |
| `QuoteCard`      | A rotating quote                                    |
| `ProfileCard`    | Identity, status, actions and channels              |

#### Charts

| Component         | What it is                                          |
| ----------------- | --------------------------------------------------- |
| `ChartFrame`      | Caption, legend, plot, and the same data as a table |
| `TimeSeriesChart` | Values over time                                    |
| `BarChart`        | Vertical bars                                       |
| `CategoryBars`    | Dense horizontal category ranking                   |
| `Sparkline`       | Inline trend line                                   |
| `TokenMosaic`     | Shares of a whole as one stacked strip              |
| `StatGrid`        | Grid of headline numbers                            |
| `AnimatedNumber`  | Number that counts to its new value                 |

#### Layout

| Component           | What it is                                   |
| ------------------- | -------------------------------------------- |
| `PageShell`         | Page margins and scroll ownership            |
| `PagePanel`         | Bordered page-content frame                  |
| `TopBar`            | Title, breadcrumbs and actions row           |
| `Sidebar`           | Collapsible navigation sidebar               |
| `SidebarPanel`      | Sidebar with pins, body and footer           |
| `SidebarItemRow`    | One sidebar row                              |
| `ListDetail`        | Index on the left, open item on the right    |
| `InspectorShell`    | Side inspector rail                          |
| `Section`           | Titled block of content                      |
| `SettingsPanel`     | Settings frame with optional save            |
| `LibraryPageHeader` | Title, count and controls for a library page |
| `Card`              | Bordered content card                        |
| `EmptyState`        | Title, description, icon and action          |
| `RichEmptyState`    | Empty state with suggested next-step actions |
| `BootScreen`        | Screen shown before the app loads            |
| `DitherCanvas`      | Animated dithered background                 |
| `CorbitsMark`       | Corbits logo                                 |
| `AuthLayout`        | Sign-in page layout                          |
| `LoginForm`         | Sign-in and sign-up form, with optional SSO  |

#### Controls

| Component           | What it is                                                      |
| ------------------- | --------------------------------------------------------------- |
| `Button`            | Button with variants and sizes                                  |
| `Input`             | Text input                                                      |
| `Textarea`          | Multi-line input                                                |
| `Select`            | Native select                                                   |
| `Checkbox`          | Checkbox                                                        |
| `SelectionCheckbox` | Row-selection checkbox                                          |
| `Switch`            | On/off toggle                                                   |
| `FileInput`         | File picker                                                     |
| `Tabs`              | Tab strip                                                       |
| `ViewToggle`        | Grid or rows segmented control                                  |
| `FilterBar`         | Row of filters with an active-filter summary                    |
| `FilterChip`        | One toggleable filter                                           |
| `KindCardGrid`      | Selectable card grid                                            |
| `BulkActionBar`     | Actions for a multi-row selection                               |
| `Table`             | Table primitives                                                |
| `SortableTable`     | Table with sortable columns                                     |
| `Badge`             | Status label                                                    |
| `StatusDot`         | Colored status dot                                              |
| `Avatar`            | Initials or image avatar                                        |
| `ProviderMark`      | Which service an action goes through                            |
| `Skeleton`          | Loading placeholder                                             |
| `Dialog`            | Modal dialog (optional peer, `ui/dialog`)                       |
| `CommandPalette`    | Global search overlay (optional peer, `ui/command-palette`)     |
| `Menu`              | Dropdown menu (optional peer, `ui/menu`)                        |
| `InfoTooltip`       | Hover info tooltip (optional peer, `ui/tooltip`)                |
| `Toaster`           | Toast host; call `toast()` anywhere (optional peer, `ui/toast`) |
| `ThemeProvider`     | Persists light, dark or system mode and presets                 |
| `ThemeToggle`       | Light, dark or system switch                                    |

## Using with Interchange

The host app owns the connection to the hub; components only take props.

1. Load run state with [`@intx/hub-client`](https://github.com/faremeter/interchange/tree/main/packages/hub-client): `createRunSession` polls a workflow run's event log and exposes a seq-ordered `WorkflowRunEvent` timeline.
2. Map that timeline to props: agent output to `ChatMessage` parts for `ChatThread`, step events to `StepList` items, and a run parked on a person to `GateBlock` or `ApprovalCard`.
3. Wire callbacks back to the hub. `ApprovalCard`'s `onApprove` and `onReject` call your hub route that resolves the awaited signal; the hub checks the caller's grant, not the component.

## Upgrading from 0.1

- Install from npm. Git installs (`github:corbitsdev/react-ui#<sha>`) no longer build `dist/`.
- Per-module subpaths are gone: import from `@corbits/react-ui` (`import { Button } from "@corbits/react-ui"`).
- `ui/dialog`, `ui/command-palette`, `ui/mic-permission-dialog`, `ui/menu`, `ui/tooltip` and `ui/toast` are subpath-only, and their peers are optional: `import { Toaster, toast } from "@corbits/react-ui/ui/toast"`. Install the peer for each subpath you keep.
- `lib/csv`, `lib/url`, `lib/utils`, `lib/workflow-registry` and `ui/chat-dock-timing` are internal. Replace `cn` with `twMerge(clsx(...))`.
- Stateful components ship `"use client"`. Client wrappers you wrote for them still work, and can go.
- 84 unused modules are removed, `ui/command` is removed, `ActivityBlock` is renamed `ReasoningBlock`, and `AuthLayout` no longer renders `DitherCanvas` by default.
- With neither `.dark` nor `.light` on the root, the theme follows the OS. Hosts that toggle `.dark` must add `.light` for an explicit light choice, or mount `ThemeProvider`.

## License

LGPL-2.1-only. See [LICENSE](https://github.com/corbitsdev/react-ui/blob/main/LICENSE).
