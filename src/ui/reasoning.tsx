"use client";

import { Brain } from "lucide-react";
import { createContext, useContext, useId } from "react";
import type { ComponentProps, ReactNode } from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import type { PartReasoning } from "../lib/conversation.js";
import { summarizeActivity } from "../lib/conversation-activity.js";
import { cn } from "../lib/utils.js";

type ReasoningContextValue = {
  readonly part: PartReasoning;
  readonly streaming: boolean;
  readonly open: boolean;
  readonly toggle: () => void;
  readonly triggerId: string;
  readonly contentId: string;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

function useReasoningContext(part: string): ReasoningContextValue {
  const context = useContext(ReasoningContext);
  if (context === null) throw new Error(`${part} must be inside a Reasoning.`);
  return context;
}

export type ReasoningProps = Omit<ComponentProps<"div">, "part"> & {
  readonly part: PartReasoning;
  /** The thinking is still arriving. */
  readonly streaming?: boolean | undefined;
  /** Controlled open state. Pair with `onOpenChange`. */
  readonly open?: boolean | undefined;
  readonly defaultOpen?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
};

/**
 * An agent's thinking, folded to one line: how long it thought and the start
 * of what it thought. Opened, the whole text in a box that scrolls rather
 * than grows. Closed by default, streaming or not, so the transcript never
 * jumps under the reader.
 *
 * Without children it renders `ReasoningTrigger` and `ReasoningContent`.
 * Renders nothing for finished thinking with no text.
 */
export function Reasoning({
  part,
  streaming = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: ReasoningProps) {
  const triggerId = useId();
  const contentId = useId();
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: "Reasoning",
  });

  if (!streaming && part.text.trim().length === 0) return null;

  return (
    <ReasoningContext.Provider
      value={{
        part,
        streaming,
        open,
        toggle: () => setOpen(!open),
        triggerId,
        contentId,
      }}
    >
      <div
        data-slot="reasoning"
        data-streaming={streaming || undefined}
        className={cn("flex min-w-0 flex-col text-sm", className)}
        {...props}
      >
        {children ?? (
          <>
            <ReasoningTrigger />
            <ReasoningContent />
          </>
        )}
      </div>
    </ReasoningContext.Provider>
  );
}

export type ReasoningTriggerProps = {
  /** Replaces "Thought for 4s" / "Thought". */
  readonly label?: ReactNode;
  readonly streamingLabel?: ReactNode;
  readonly className?: string | undefined;
};

/** The thinking's one line, which opens and closes it. */
export function ReasoningTrigger({
  label,
  streamingLabel = "Thinking…",
  className,
}: ReasoningTriggerProps) {
  const { part, streaming, open, toggle, triggerId, contentId } =
    useReasoningContext("ReasoningTrigger");
  // A single reasoning step summarises as "Thought for 4s", or "Thought"
  // while its duration is unknown.
  const summary = streaming
    ? streamingLabel
    : (label ?? summarizeActivity([part]));
  return (
    <button
      type="button"
      id={triggerId}
      data-slot="reasoning-trigger"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      onClick={toggle}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-start text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Brain aria-hidden className="size-3.5 shrink-0" />
      <span className="shrink-0 text-foreground">{summary}</span>
      {/* The preview is for the eye only, so the button's name stays the
          summary rather than the whole thought. */}
      {open ? null : (
        <span aria-hidden className="min-w-0 flex-1 truncate">
          {part.text}
        </span>
      )}
    </button>
  );
}

export type ReasoningContentProps = {
  /** Renders the thinking, e.g. as markdown. Defaults to plain text. */
  readonly render?: ((text: string) => ReactNode) | undefined;
  readonly className?: string | undefined;
};

/** The whole thinking, while open. */
export function ReasoningContent({ render, className }: ReasoningContentProps) {
  const { part, streaming, open, triggerId, contentId } =
    useReasoningContext("ReasoningContent");
  if (!open) return null;
  return (
    <div
      id={contentId}
      data-slot="reasoning-content"
      role="group"
      aria-labelledby={triggerId}
      aria-busy={streaming}
      // Focusable so the keyboard can scroll it.
      tabIndex={0}
      className={cn(
        "ms-6 mt-1 max-h-80 overflow-auto rounded-md bg-muted px-3 py-2 leading-relaxed whitespace-pre-wrap text-muted-foreground",
        className,
      )}
    >
      {render === undefined ? part.text : render(part.text)}
    </div>
  );
}
