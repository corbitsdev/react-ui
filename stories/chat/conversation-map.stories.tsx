import type { ConversationMessage } from "../../src/lib/conversation.js";
import {
  Conversation,
  ConversationContent,
  ConversationItem,
  ConversationScrollButton,
} from "../../src/ui/conversation.js";
import {
  ConversationMap,
  type ConversationMapTurn,
} from "../../src/ui/conversation-map.js";
import {
  longChat,
  shortChat,
  type ConversationSample,
} from "./samples/conversations.js";

export default { title: "Chat / Conversation Map" };

/** The first line of a message's text, without markdown punctuation. */
function firstLine(message: ConversationMessage): string {
  const text = message.parts
    .flatMap((part) => (part.kind === "text" ? [part.text] : []))
    .join("\n");
  const line = text.split("\n").find((candidate) => candidate.trim() !== "");
  return (line ?? "")
    .replace(/[*_`#>]/g, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
    .trim();
}

/** A person's message starts a turn; the first reply with text previews it. */
function turnsOf(
  messages: readonly ConversationMessage[],
): ConversationMapTurn[] {
  const turns: ConversationMapTurn[] = [];
  for (const message of messages) {
    const said = firstLine(message);
    const last = turns.at(-1);
    if (message.author.kind === "person") {
      turns.push({
        id: message.id,
        label: said === "" ? "Shared a file" : said,
      });
    } else if (
      last !== undefined &&
      last.preview === undefined &&
      said !== ""
    ) {
      turns[turns.length - 1] = { ...last, preview: said };
    }
  }
  return turns;
}

/** A placeholder row: the map works with whatever the host renders. */
function Row({ message }: { readonly message: ConversationMessage }) {
  const text = firstLine(message);
  return message.author.kind === "person" ? (
    <p className="ml-auto max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm">
      {text}
    </p>
  ) : (
    <div className="max-w-prose text-sm leading-relaxed">
      <p className="text-xs font-medium text-muted-foreground">
        {message.author.name}
      </p>
      <p>{text === "" ? "Worked on it." : text}</p>
    </div>
  );
}

function MappedConversation({
  sample,
}: {
  readonly sample: ConversationSample;
}) {
  const turns = turnsOf(sample.messages);
  return (
    <div className="flex h-[30rem] max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Conversation>
        <ConversationMap turns={turns} />
        <ConversationContent className="[&>[data-slot=conversation-column]]:pl-12">
          {sample.messages.map((message) => (
            <ConversationItem key={message.id} itemId={message.id}>
              <Row message={message} />
            </ConversationItem>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}

/** Two turns: a tick each. Point at one to preview it, click to jump. */
export const FewTurns = () => <MappedConversation sample={shortChat} />;

/** 150 turns: the ticks squeeze, then the rail scrolls and keeps the current
 * one in view. */
export const ManyTurns = () => <MappedConversation sample={longChat} />;
