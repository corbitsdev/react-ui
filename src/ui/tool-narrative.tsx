import { ChevronRight } from "lucide-react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { toolLabel, type ToolPart } from "../lib/chat-message.js";
import { cn } from "../lib/utils.js";
import { StatusDot } from "./status-dot.js";

const STATE_TEXT: Record<ToolPart["state"], string> = {
  running: "Working",
  done: "Done",
  error: "Failed",
};

/**
 * What the agent did, as one line the user can open.
 *
 * Collapsed by default and collapsed even while running: a transcript where
 * every tool call expands itself pushes the answer off screen, and the answer
 * is what the user is waiting for. The line still says which tool and how it
 * ended, so nothing is hidden — only folded.
 *
 * A failed call opens by default. That is the one case where the detail is the
 * point.
 *
 * Uncontrolled by default. Pass `open`/`onOpenChange` to drive it from a parent.
 */
export type ToolNarrativeProps = {
  readonly part: ToolPart;
  /** Controlled open state. Pair with `onOpenChange` to lift it to a parent. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly className?: string;
};

export function ToolNarrative({ part, open: openProp, onOpenChange, className }: ToolNarrativeProps) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: part.state === "error",
    onChange: onOpenChange,
    name: "ToolNarrative",
  });
  const label = toolLabel(part);
  const hasDetail = part.output !== undefined || part.input !== undefined;

  return (
    <div data-slot="tool-narrative" className={cn("text-xs", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        disabled={!hasDetail}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:hover:bg-transparent"
      >
        <StatusDot
          label={STATE_TEXT[part.state]}
          live={part.state === "running"}
          tone={part.state === "error" ? "danger" : part.state === "running" ? "emphasis" : "neutral"}
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {hasDetail ? (
          <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} aria-hidden />
        ) : null}
      </button>

      {open && hasDetail ? (
        <div className="mt-1 ml-4 flex flex-col gap-2 border-l border-border pl-3">
          {part.input === undefined ? null : (
            <Detail title="Input">{JSON.stringify(part.input, null, 2)}</Detail>
          )}
          {part.output === undefined ? null : (
            <Detail title={part.state === "error" ? "Error" : "Output"}>{part.output}</Detail>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Detail({ title, children }: { title: string; children: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{title}</p>
      {/* Scrolls in its own box: a long tool result must never make the page
          scroll sideways. */}
      <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] whitespace-pre-wrap">
        {children}
      </pre>
    </div>
  );
}
