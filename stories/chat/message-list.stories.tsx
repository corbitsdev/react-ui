import { useState } from "react";

import { MessageList } from "../../src/ui/message-list.js";

export default { title: "Chat / Message list" };

function bubble(text: string) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">{text}</div>
  );
}

/** A short list — no scrolling needed, but the container is set up the same way. */
export const ShortList = () => (
  <MessageList itemCount={3} className="h-64 rounded-lg border border-border p-3">
    {bubble("Hi there.")}
    {bubble("What shipped this week?")}
    {bubble("412 orders shipped this week, up 8% over last week.")}
  </MessageList>
);

/**
 * A live-updating list: "Send message" appends to the bottom while pinned —
 * the list follows. "Scroll up, then send" simulates the reader reading
 * history while a message arrives — the list holds their position instead
 * of yanking them down.
 */
export const StickToBottomVsPreservePosition = () => {
  const [items, setItems] = useState(() => Array.from({ length: 8 }, (_, i) => `Message ${i + 1}`));

  return (
    <div className="flex max-w-md flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-2.5 py-1.5 text-xs"
          onClick={() => setItems((current) => [...current, `Message ${current.length + 1}`])}
        >
          Send message
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Scroll the list up first, then send a message — the view holds still instead of jumping to the new one.
      </p>
      <MessageList itemCount={items.length} className="h-56 rounded-lg border border-border p-3">
        {items.map((text) => (
          <div key={text} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
            {text}
          </div>
        ))}
      </MessageList>
    </div>
  );
};

/** No items: an empty scroll frame, ready for the first message. */
export const Empty = () => (
  <MessageList itemCount={0} className="h-40 rounded-lg border border-dashed border-border p-3" />
);
