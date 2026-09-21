import { ChevronRight } from "lucide-react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { cn } from "../lib/utils.js";

export type ReasoningBlockProps = {
  /** The agent's thinking. Rendered as text — it is not markup. */
  readonly text: string;
  /** Still streaming. Changes the summary wording and marks the body busy. */
  readonly streaming?: boolean;
  /** e.g. "Thought for 4s". Becomes the summary once reasoning has stopped streaming. */
  readonly durationLabel?: string;
  readonly defaultOpen?: boolean;
  /** Controlled open state. Pair with `onOpenChange` to lift it to a parent. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly className?: string;
};

/**
 * The agent's thinking, folded away.
 *
 * Collapsed by default, including while streaming: reasoning is context for a
 * reader who wants it and noise for one who does not, and a block that
 * expands itself mid-stream makes the transcript jump under the reader.
 *
 * A native `<details>`, not a div with state: it gets the disclosure
 * semantics, keyboard behaviour and find-in-page expansion from the browser,
 * and those are three things a hand-rolled version gets wrong.
 */
export function ReasoningBlock({
  text,
  streaming = false,
  durationLabel,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
}: ReasoningBlockProps) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: "ReasoningBlock",
  });

  if (text.trim().length === 0) return null;

  const summary = streaming ? "Thinking…" : (durationLabel ?? "Thinking");

  return (
    <details
      data-slot="reasoning-block"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      className={cn("text-xs", className)}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} aria-hidden />
        <span aria-live={streaming ? "polite" : undefined}>{summary}</span>
      </summary>
      <p
        aria-busy={streaming}
        className="mt-1 ml-4 border-l border-border pl-3 leading-relaxed whitespace-pre-wrap text-muted-foreground"
      >
        {text}
      </p>
    </details>
  );
}
