import { ChevronRight } from "lucide-react";
import { useId } from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { cn } from "../lib/utils.js";

export type ReasoningBlockProps = {
  /** The agent's thinking. Rendered as text — it is not markup. */
  readonly text: string;
  /** Still streaming. Changes the summary wording and marks the region busy. */
  readonly streaming?: boolean;
  /** e.g. "Thought for 4s". Shown once reasoning has stopped streaming. */
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
 * A `button` + region pair rather than a native `<details>` — the duration
 * label needs to sit next to the summary text without becoming part of it,
 * which `<summary>` cannot do while keeping a single accessible name.
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
  const regionId = useId();

  if (text.trim().length === 0) return null;

  const summary = streaming ? "Thinking…" : (durationLabel ?? "Thinking");

  return (
    <div data-slot="reasoning-block" className={cn("text-xs", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={regionId}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} aria-hidden />
        <span aria-live={streaming ? "polite" : undefined}>{summary}</span>
      </button>
      {open ? (
        <p
          id={regionId}
          role="region"
          aria-label="Reasoning"
          aria-busy={streaming}
          className="mt-1 ml-4 border-l border-border pl-3 leading-relaxed whitespace-pre-wrap text-muted-foreground"
        >
          {text}
        </p>
      ) : null}
    </div>
  );
}
