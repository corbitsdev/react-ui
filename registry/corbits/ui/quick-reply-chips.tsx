import type { QuickReply } from "@/registry/corbits/lib/chat-message";
import { cn } from "@/registry/corbits/lib/utils";

/**
 * Suggested replies. A list, not a row of loose buttons, so a screen reader
 * announces how many suggestions there are before reading them — otherwise the
 * user has to arrow through to find out.
 *
 * Sending is the host's job: this reports which chip was chosen and lets the
 * host decide whether that fills the composer or sends immediately.
 */
export function QuickReplyChips({
  replies,
  onSelect,
  className,
}: {
  replies: readonly QuickReply[];
  onSelect: (reply: QuickReply) => void;
  className?: string;
}) {
  if (replies.length === 0) return null;

  return (
    <ul aria-label="Suggested replies" className={cn("flex flex-wrap gap-2", className)}>
      {replies.map((reply) => (
        <li key={reply.id}>
          <button
            type="button"
            onClick={() => onSelect(reply)}
            className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            {reply.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
