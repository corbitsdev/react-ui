import { useRenderRail } from "../../src/hooks/use-render-rail.js";
import type { ChatMessage } from "../../src/lib/chat-message.js";
import type { GenerativeBlock } from "../../src/lib/generative-block.js";
import { ChatDock } from "../../src/ui/chat-dock.js";
import { ChatPanel, ChatPanelHeader } from "../../src/ui/chat-panel.js";
import { ChatThread } from "../../src/ui/chat-thread.js";
import { GenerativeBlockView } from "../../src/ui/generative-block-view.js";
import { RenderRail } from "../../src/ui/render-rail.js";

export default { title: "Chat / Generative UI" };

const IDENTITY = { name: "Corbits", tagline: "Sales, catalog, orders" };

const BLOCKS: readonly GenerativeBlock[] = [
  {
    type: "kpis",
    id: "b1",
    title: "This week",
    items: [
      { label: "Orders", value: "412", delta: "+8%" },
      { label: "Revenue", value: "$38.2k", delta: "+3%" },
      { label: "Refunds", value: "9", danger: true, delta: "+2" },
      { label: "AOV", value: "$92.7" },
    ],
  },
  {
    type: "spark",
    id: "b2",
    title: "Orders, 14 days",
    label: "Orders, rising over 14 days",
    values: [22, 25, 24, 29, 31, 28, 34, 38, 36, 41, 39, 44, 47, 46],
  },
  {
    type: "table",
    id: "b3",
    title: "Slow movers",
    caption: "Slow-moving inventory",
    columns: ["SKU", "Units on hand", "Last sold"],
    rows: [
      ["FLC-2201", "184", "31 days ago"],
      ["MUG-0087", "96", "22 days ago"],
      ["TOTE-14", "61", "19 days ago"],
    ],
  },
  {
    type: "callout",
    id: "b4",
    title: "Reorder point reached",
    body: "FLC-2201 will stock out in an estimated 9 days at the current sell-through rate.",
    tone: "danger",
  },
];

function buildMessages(): ChatMessage[] {
  return [
    {
      id: "m1",
      role: "user",
      createdAt: new Date().toISOString(),
      parts: [{ type: "text", text: "Give me a full rundown of this week, plus anything at risk." }],
    },
    {
      id: "m2",
      role: "agent",
      createdAt: new Date().toISOString(),
      parts: [{ type: "text", text: "Here is the week at a glance, the trend, and one thing worth a decision." }],
    },
  ];
}

/**
 * The fullpage, dual-column arrangement: the transcript on the left carries
 * every generative block inline, and the rail on the right mirrors whichever
 * one is "active" — the latest by default, or whatever the reader pinned.
 */
export const FullpageWithRail = () => {
  const rail = useRenderRail(BLOCKS);

  return (
    <div className="relative h-[640px] w-full overflow-hidden rounded-lg border border-dashed border-border">
      <ChatDock mode="fullpage">
        <div className="flex min-h-0 flex-1">
          <ChatPanel className="min-w-0 flex-1">
            <ChatPanelHeader identity={IDENTITY} />
            <ChatThread
              messages={buildMessages()}
              identity={IDENTITY}
              renderBody={(message) =>
                message.id === "m2" ? (
                  <div className="mt-3 flex flex-col gap-4">
                    {BLOCKS.map((block) => (
                      <GenerativeBlockView key={block.id} block={block} />
                    ))}
                  </div>
                ) : undefined
              }
            />
          </ChatPanel>
          <RenderRail block={rail.activeBlock} isPinned={rail.isPinned} onTogglePin={() => rail.togglePin(rail.activeBlock?.id ?? "")} />
        </div>
      </ChatDock>
    </div>
  );
};

/**
 * A block the reader pinned: `RenderRail` itself is stateless, so this story
 * shows the pinned state directly rather than through the hook's own effect.
 */
export const PinnedBlock = () => (
  <div className="h-[420px] w-[22rem]">
    <RenderRail block={BLOCKS[2] ?? null} isPinned onTogglePin={() => {}} />
  </div>
);
