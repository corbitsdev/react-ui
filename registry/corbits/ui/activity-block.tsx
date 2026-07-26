"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/registry/corbits/lib/utils";

export type ActivityBlockProps = {
  /** The agent's thinking. Rendered as text — it is not markup. */
  readonly text: string;
  /** Still thinking. Changes the summary wording and marks the region busy. */
  readonly working?: boolean;
  readonly defaultOpen?: boolean;
  readonly className?: string;
};

/**
 * The agent's thinking, folded away.
 *
 * Closed by default, including while streaming. Reasoning is context for a user
 * who wants it and noise for one who does not, and a block that expands itself
 * mid-stream makes the transcript jump under the reader.
 *
 * A native `<details>`, not a div with state: it gets the disclosure semantics,
 * keyboard behaviour and find-in-page expansion from the browser, and those are
 * three things a hand-rolled version gets wrong.
 */
export function ActivityBlock({ text, working = false, defaultOpen = false, className }: ActivityBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (text.trim().length === 0) return null;

  return (
    <details
      data-slot="activity-block"
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
        {working ? "Thinking…" : "Thought about this"}
      </summary>
      <p
        aria-busy={working}
        className="mt-1 ml-4 border-l border-border pl-3 leading-relaxed whitespace-pre-wrap text-muted-foreground"
      >
        {text}
      </p>
    </details>
  );
}
