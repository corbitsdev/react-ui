"use client";

import { ChevronRight, Layers } from "lucide-react";
import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { isAwaitingApproval } from "../lib/conversation-activity.js";
import type { PartTool, PartToolBatch } from "../lib/conversation.js";
import { countFailedTools, displayedToolStatus } from "../lib/tool-display.js";
import { cn } from "../lib/utils.js";
import { Tool } from "./tool.js";
import { ToolApproval, type ToolApprovalDecision } from "./tool-approval.js";

export type ToolGroupLabels = {
  /** Every call has finished. */
  readonly ran: (count: number) => string;
  /** Some calls are still queued or running. */
  readonly running: (count: number, done: number) => string;
  /** None is queued or running, but some wait on a person. */
  readonly held: (count: number, done: number) => string;
  /** Follows `running` or `held` while calls wait on a person. */
  readonly waiting: (count: number) => string;
  readonly failed: (count: number) => string;
};

const LABELS: ToolGroupLabels = {
  ran: (count) => `Ran ${count} at once`,
  running: (count, done) => `Running ${count} at once · ${done} done`,
  held: (count, done) => `${count} at once · ${done} done`,
  waiting: (count) => `${count} waiting for approval`,
  failed: (count) => `${count} failed`,
};

export type ToolGroupProps = Omit<
  ComponentProps<"div">,
  "children" | "part"
> & {
  readonly part: PartToolBatch;
  /** Controlled open state. Pair with `onOpenChange`. */
  readonly open?: boolean | undefined;
  /**
   * Seeds the open state. Left out, the group is open exactly while one of
   * its calls waits on a person, until a person opens or closes it.
   */
  readonly defaultOpen?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  /** A decision on one of the group's calls that waits on a person. */
  readonly onDecide?:
    | ((tool: PartTool, decision: ToolApprovalDecision) => void)
    | undefined;
  /**
   * Renders one call. Defaults to `ToolApproval` for a call waiting on a
   * person (when `onDecide` is given) and `Tool` for the rest.
   */
  readonly renderTool?: ((tool: PartTool) => ReactNode) | undefined;
  readonly labels?: Partial<ToolGroupLabels> | undefined;
};

/** Tool calls that ran at the same time: one row saying so, the calls beneath. */
export function ToolGroup({
  part,
  open: openProp,
  defaultOpen,
  onOpenChange,
  onDecide,
  renderTool,
  labels: labelOverrides,
  className,
  ...props
}: ToolGroupProps) {
  const labels = { ...LABELS, ...labelOverrides };
  const listId = useId();
  const awaiting = part.tools.some(isAwaitingApproval);
  // `null` means nobody has opened or closed it yet, so a waiting call decides.
  const [chosen, setChosen] = useControllableState<boolean | null>({
    value: openProp,
    defaultValue: defaultOpen ?? null,
    onChange:
      onOpenChange === undefined
        ? undefined
        : (next) => {
            if (next !== null) onOpenChange(next);
          },
    name: "ToolGroup",
  });
  const open = chosen ?? awaiting;

  const statuses = part.tools.map(displayedToolStatus);
  const active = statuses.filter(
    (status) => status === "pending" || status === "running",
  ).length;
  const waiting = statuses.filter(
    (status) => status === "approval-requested",
  ).length;
  const failed = countFailedTools(part.tools);
  const count = part.tools.length;

  const render =
    renderTool ??
    ((tool: PartTool) =>
      onDecide !== undefined && isAwaitingApproval(tool) ? (
        <ToolApproval
          part={tool}
          onDecide={(decision) => onDecide(tool, decision)}
        />
      ) : (
        <Tool part={tool} />
      ));

  return (
    <div
      data-slot="tool-group"
      className={cn("flex min-w-0 flex-col text-sm", className)}
      {...props}
    >
      <button
        type="button"
        data-slot="tool-group-header"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setChosen(!open)}
        className="flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-start transition-colors hover:bg-muted"
      >
        <Layers
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground"
        />
        <span className="min-w-0 flex-1 truncate">
          {active > 0
            ? labels.running(count, count - active - waiting)
            : waiting > 0
              ? labels.held(count, count - waiting)
              : labels.ran(count)}
          {waiting > 0 ? <> · {labels.waiting(waiting)}</> : null}
          {failed > 0 ? (
            <span className="text-destructive"> · {labels.failed(failed)}</span>
          ) : null}
        </span>
        <ChevronRight
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200",
            open && "rotate-90",
          )}
        />
      </button>
      {open ? (
        <ol
          id={listId}
          data-slot="tool-group-list"
          className="ms-3 flex flex-col gap-1 border-s border-dashed border-border-strong ps-3 pt-1"
        >
          {part.tools.map((tool) => (
            <li key={tool.toolCallId} className="min-w-0">
              {render(tool)}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
