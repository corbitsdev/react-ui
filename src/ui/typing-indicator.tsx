import { cn } from "../lib/utils.js";

const DOT_DELAY_MS = [0, 160, 320] as const;

/**
 * Three pulsing dots: the agent is composing a reply, with nothing to report
 * yet. `role="status"` with a text label, because the dots carry no words a
 * screen reader can read — the label is the only accessible content here.
 */
export function TypingIndicator({ label = "Thinking", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-label={label} className={cn("flex items-center gap-1 px-1 py-2", className)}>
      {DOT_DELAY_MS.map((delay) => (
        <span
          key={delay}
          aria-hidden
          style={{ animationDelay: `${delay}ms` }}
          className="size-1.5 rounded-full bg-muted-foreground [animation:corbits-typing-bounce_1.2s_ease-in-out_infinite]"
        />
      ))}
    </div>
  );
}
