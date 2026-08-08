import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

import { useChatDock } from "../../src/hooks/use-chat-dock.js";
import type { ChatMessage } from "../../src/lib/chat-message.js";
import { ChatComposer } from "../../src/ui/chat-composer.js";
import { ChatDock, ChatDockFab, ChatDockScrim } from "../../src/ui/chat-dock.js";
import { ChatPanel, ChatPanelFooter, ChatPanelHeader } from "../../src/ui/chat-panel.js";
import { ChatThread } from "../../src/ui/chat-thread.js";
import { TypingIndicator } from "../../src/ui/typing-indicator.js";

export default { title: "Chat / Chat dock" };

const IDENTITY = { name: "Corbits", tagline: "Sales, catalog, orders" };

const SUGGESTIONS = [
  { id: "s1", label: "What shipped this week?" },
  { id: "s2", label: "Show slow-moving inventory" },
];

function seedMessages(): ChatMessage[] {
  return [
    {
      id: "m1",
      role: "user",
      createdAt: new Date().toISOString(),
      parts: [{ type: "text", text: "What shipped this week?" }],
    },
    {
      id: "m2",
      role: "agent",
      createdAt: new Date().toISOString(),
      parts: [{ type: "text", text: "412 orders shipped this week, up 8% over last week." }],
    },
  ];
}

/**
 * Closed → docked → fullpage, driven by `useChatDock`. The dock element never
 * remounts across the walkthrough — only its mode (and therefore its CSS
 * classes) changes, which is what makes `docked → fullpage` a size/position
 * transition on one panel rather than a swap between two.
 */
export const Walkthrough = () => {
  const dock = useChatDock();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  const send = (text: string) => {
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", createdAt: new Date().toISOString(), parts: [{ type: "text", text }] },
    ]);
    setDraft("");
  };

  return (
    <div className="relative h-[640px] w-full overflow-hidden rounded-lg border border-dashed border-border">
      <div className="p-4 text-sm text-muted-foreground">
        Mode: <strong className="text-foreground">{dock.mode}</strong> — open the dock, then expand it to fullpage.
      </div>

      <ChatDockScrim open={dock.isOpen} onClose={dock.close} />
      <ChatDock mode={dock.mode} shouldAnimateEntrance={dock.shouldAnimateEntrance}>
        {dock.mode === "closed" ? (
          <ChatDockFab onOpen={dock.open} />
        ) : (
          <ChatPanel>
            <ChatPanelHeader identity={IDENTITY}>
              <button
                type="button"
                onClick={dock.mode === "fullpage" ? dock.collapse : dock.expand}
                aria-label={dock.mode === "fullpage" ? "Collapse" : "Expand to fullpage"}
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {dock.mode === "fullpage" ? (
                  <Minimize2 className="size-3.5" aria-hidden />
                ) : (
                  <Maximize2 className="size-3.5" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={dock.close}
                aria-label="Close"
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </ChatPanelHeader>

            <ChatThread messages={messages} identity={IDENTITY} empty={<p>Ask anything about this week's store.</p>} />

            <ChatPanelFooter>
              <ChatComposer
                value={draft}
                onValueChange={setDraft}
                onSend={() => send(draft)}
                suggestions={messages.length === 0 ? SUGGESTIONS : []}
                onSuggestionSelect={(reply) => send(reply.value ?? reply.label)}
                autoFocusOn={dock.isOpen}
              />
            </ChatPanelFooter>
          </ChatPanel>
        )}
      </ChatDock>
    </div>
  );
};

export const DockedWithTyping = () => (
  <div className="relative h-[560px] w-full overflow-hidden rounded-lg border border-dashed border-border">
    <ChatDock mode="docked">
      <ChatPanel>
        <ChatPanelHeader identity={IDENTITY} />
        <ChatThread messages={seedMessages()} identity={IDENTITY} />
        <div className="px-4">
          <TypingIndicator />
        </div>
        <ChatPanelFooter>
          <ChatComposer value="" onValueChange={() => {}} onSend={() => {}} busy />
        </ChatPanelFooter>
      </ChatPanel>
    </ChatDock>
  </div>
);
