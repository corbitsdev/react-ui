// Both themes are exercised by the workbench's existing global theme toggle
// (see `src/ui/theme-provider.tsx` / `theme-toggle.tsx`), wired once for
// every story here — no theme machinery of this story's own.
import { useState } from "react";

import { CanvasHost, type CanvasHostContent } from "../../src/blocks/canvas-host/canvas-host.js";
import type { CanvasHostMessage } from "../../src/blocks/canvas-host/canvas-host.js";
import type { Part } from "../../src/lib/chat-parts.js";
import { ChatComposer } from "../../src/ui/chat-composer.js";
import { ChatPanelHeader } from "../../src/ui/chat-panel.js";

export default { title: "Blocks / Canvas host" };

type NoteData = { readonly body: string };

const NOTE: CanvasHostContent<NoteData> = {
  kind: "note",
  title: "Release notes — v1.2.0",
  data: { body: "Shipped the canvas chat host block. Dual-column layout, focus mode, responsive collapse." },
};

const IDENTITY = { name: "Corbits" };

function seedMessages(): CanvasHostMessage[] {
  return [
    { id: "m1", parts: [{ kind: "text", text: "What changed in the last release?" }] },
    {
      id: "m2",
      parts: [
        { kind: "reasoning", text: "Checking the changelog for the most recent tag.", durationMs: 1200 },
        { kind: "text", text: "Here's the note — opened it in the canvas." },
      ],
    },
  ];
}

function longMessages(): CanvasHostMessage[] {
  const messages: CanvasHostMessage[] = [];
  for (let i = 0; i < 40; i += 1) {
    const parts: Part[] = [{ kind: "text", text: `Message ${i + 1}: a line of transcript to prove scroll containment.` }];
    messages.push({ id: `m${i}`, parts });
  }
  return messages;
}

function renderNote(content: CanvasHostContent<NoteData>) {
  return <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{content.data.body}</p>;
}

/** Chat only — `content` is `null`, so the canvas column collapses and the transcript takes the full frame. */
export const ChatOnly = () => (
  <div className="h-[640px] w-full overflow-hidden rounded-lg border border-border">
    <CanvasHost
      messages={seedMessages()}
      content={null}
      renderCanvas={renderNote}
      focus={false}
      onFocusChange={() => {}}
      onClose={() => {}}
      chatHeader={<ChatPanelHeader identity={IDENTITY} />}
      composer={<ChatComposer value="" onValueChange={() => {}} onSend={() => {}} />}
    />
  </div>
);

/** Content set, not focused: the even split — chat and canvas share the frame. */
export const ChatAndCanvas = () => {
  const [focus, setFocus] = useState(false);
  const [open, setOpen] = useState(true);
  return (
    <div className="h-[640px] w-full overflow-hidden rounded-lg border border-border">
      <CanvasHost
        messages={seedMessages()}
        content={open ? NOTE : null}
        renderCanvas={renderNote}
        focus={focus}
        onFocusChange={setFocus}
        onClose={() => setOpen(false)}
        chatHeader={<ChatPanelHeader identity={IDENTITY} />}
        composer={<ChatComposer value="" onValueChange={() => {}} onSend={() => {}} />}
      />
    </div>
  );
};

/** Focus mode: the canvas dominates the frame and the chat column collapses to a decorative rail at `lg`+. */
export const Focused = () => (
  <div className="h-[640px] w-full overflow-hidden rounded-lg border border-border">
    <CanvasHost
      messages={seedMessages()}
      content={NOTE}
      renderCanvas={renderNote}
      focus={true}
      onFocusChange={() => {}}
      onClose={() => {}}
      chatHeader={<ChatPanelHeader identity={IDENTITY} />}
      composer={<ChatComposer value="" onValueChange={() => {}} onSend={() => {}} />}
    />
  </div>
);

/** Canvas is open but the host hasn't handed a title/body worth showing yet — same empty state as `content === null`, kept as its own story since a consumer may reach it via a different path (e.g. a still-loading fetch that hasn't produced content). */
export const EmptyCanvas = () => (
  <div className="h-[640px] w-full overflow-hidden rounded-lg border border-border">
    <CanvasHost
      messages={[]}
      content={null}
      renderCanvas={renderNote}
      focus={false}
      onFocusChange={() => {}}
      onClose={() => {}}
      chatHeader={<ChatPanelHeader identity={IDENTITY} />}
      composer={<ChatComposer value="" onValueChange={() => {}} onSend={() => {}} />}
      emptyChat={<p className="p-4 text-sm text-muted-foreground">Ask anything to get started.</p>}
    />
  </div>
);

/**
 * Below `lg` (1024px), a narrow frame proves the chat-first split: `split`
 * mode keeps the composer reachable instead of hiding it behind the canvas,
 * and the focus toggle is what swaps to the canvas full-screen and back —
 * the mobile affordance the toggle was previously missing below `lg`.
 */
export const MobileSplit = () => {
  const [focus, setFocus] = useState(false);
  return (
    <div className="relative h-[640px] w-[375px] overflow-hidden rounded-lg border border-dashed border-border">
      <CanvasHost
        messages={seedMessages()}
        content={NOTE}
        renderCanvas={renderNote}
        focus={focus}
        onFocusChange={setFocus}
        onClose={() => {}}
        chatHeader={<ChatPanelHeader identity={IDENTITY} />}
        composer={<ChatComposer value="" onValueChange={() => {}} onSend={() => {}} />}
      />
    </div>
  );
};

/** A long transcript and a long canvas payload, to prove each column scrolls in its own box rather than the page overflowing. */
export const LongContentOverflow = () => (
  <div className="h-[640px] w-full overflow-hidden rounded-lg border border-border">
    <CanvasHost
      messages={longMessages()}
      content={{
        kind: "note",
        title: "A very long note",
        data: { body: Array.from({ length: 60 }, (_, i) => `Line ${i + 1} of a long canvas payload.`).join("\n") },
      }}
      renderCanvas={renderNote}
      focus={false}
      onFocusChange={() => {}}
      onClose={() => {}}
      chatHeader={<ChatPanelHeader identity={IDENTITY} />}
      composer={<ChatComposer value="" onValueChange={() => {}} onSend={() => {}} />}
    />
  </div>
);
