"use client";

import { ChevronRight } from "lucide-react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { cn } from "../lib/utils.js";

export type ReasoningBlockProps = {
  /** The agent's thinking. Rendered as text — it is not markup. */
  readonly text: string;
  /** Still streaming. Changes the summary wording and marks the body busy. */
  readonly streaming?: boolean;
  /** Summary while streaming. Defaults to "Thinking…". */
  readonly streamingLabel?: string;
  /** Summary once idle when no `durationLabel` is supplied. Defaults to "Thinking". */
  readonly idleLabel?: string;
  /** e.g. "Thought for 4s". Becomes the summary once reasoning has stopped streaming. */
  readonly durationLabel?: string;
  readonly defaultOpen?: boolean;
  /**
   * Controlled open state. Pair with `onOpenChange` to lift it to a parent —
   * and honor it: a controlled `<details>` that ignores `onOpenChange` leaves
   * the DOM attribute and React state diverged (the browser mutates `open`
   * without React's knowledge), so the block can sit visibly open while the
   * prop says closed.
   */
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
  streamingLabel = "Thinking…",
  idleLabel = "Thinking",
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

  const summary = streaming ? streamingLabel : (durationLabel ?? idleLabel);

  return (
    <details
      data-slot="reasoning-block"
      open={open}
      // The browser fires `toggle` for any `open` attribute change — prop-driven
      // ones included — so a bare setOpen would echo the parent's own commands
      // back through onOpenChange. Reporting only divergence means exactly one
      // callback per user activation, and none when a parent drives `open`.
      onToggle={(event) => {
        const domOpen = (event.currentTarget as HTMLDetailsElement).open;
        if (domOpen !== open) setOpen(domOpen);
      }}
      className={cn("text-xs", className)}
    >
      <summary
        className={cn(
          // `relative` plus the `::after` pseudo-element extends the
          // effective hit area to 40px tall without changing the row's own
          // padding/density — see design-engineering.md's hit-area pattern.
          "relative flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors after:absolute after:inset-x-0 after:top-1/2 after:h-10 after:-translate-y-1/2 hover:bg-muted hover:text-foreground",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200 ease-out",
            open && "rotate-90",
          )}
          aria-hidden
        />
        <span aria-live="polite">{summary}</span>
      </summary>
      {/* Keyed on `open` so the entrance animation replays every time the
          disclosure opens, not just the first time — the node persists
          (still present, natively hidden) while collapsed, preserving
          browser find-in-page's own expand-on-match behaviour. */}
      <p
        key={open ? "open" : "closed"}
        aria-busy={streaming}
        className="mt-1 ml-4 border-l border-border pl-3 leading-relaxed whitespace-pre-wrap text-muted-foreground [animation:corbits-rail-block-in_200ms_var(--ease-out)_both]"
      >
        {text}
      </p>
    </details>
  );
}
