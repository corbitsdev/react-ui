"use client";

import { ChevronRight, Layers } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
   * Seeds the open state. Left out, the group opens when one of its calls
   * waits on a person and stays open, so the outcome of a decision shows,
   * until a person closes it.
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

/**
 * Tool calls that ran at the same time: one row saying so, the calls beneath.
 *
 * When a decision settles a call while focus was inside and nothing else has
 * taken it, focus moves to the next waiting call's card, else to the decided
 * call's outcome, else to the call's row in the list (or, if the host dropped
 * it, the row now in its place), instead of dropping to the page. Never to a
 * button: a held Enter repeats onto whatever has focus, and would decide a
 * call the person never chose or fold the group.
 */
export const ToolGroup = forwardRef<HTMLDivElement, ToolGroupProps>(
  function ToolGroup(
    {
      part,
      open: openProp,
      defaultOpen,
      onOpenChange,
      onDecide,
      renderTool,
      labels: labelOverrides,
      className,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) {
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
    // Once a waiting call opened the group it stays open after the decision,
    // so the outcome shows and the focused card is not unmounted with the list.
    // Set while rendering (react.dev, "Storing information from previous
    // renders"): an effect would run after the list had already gone.
    const [autoOpened, setAutoOpened] = useState(awaiting);
    if (awaiting && !autoOpened) setAutoOpened(true);
    const open = chosen ?? autoOpened;

    const statuses = part.tools.map(displayedToolStatus);
    const active = statuses.filter(
      (status) => status === "pending" || status === "running",
    ).length;
    const waiting = statuses.filter(
      (status) => status === "approval-requested",
    ).length;
    const failed = countFailedTools(part.tools);
    const count = part.tools.length;

    const rootRef = useRef<HTMLDivElement | null>(null);
    const focusInside = useRef(false);
    // The call whose list item last held focus: the call a decision was made on.
    const focusedCall = useRef<string | null>(null);
    const calls = part.tools.map((tool) => tool.toolCallId);
    // The calls as last committed, to place a focused call the host dropped.
    const wasCalls = useRef(calls);

    // A decided call is rendered anew (`Tool` in place of `ToolApproval`), or
    // dropped, so its own recovery never runs; the group moves focus instead.
    // This runs after every update, not only when fewer calls wait: a decision
    // can land as another call starts waiting. Focus on the page while it was
    // inside means the focused element went away, since leaving by a click or
    // Tab clears `focusInside`. A child that stayed mounted recovers first.
    useLayoutEffect(() => {
      const was = wasCalls.current;
      wasCalls.current = calls;
      if (!focusInside.current) return;
      const active = document.activeElement;
      if (active !== null && active !== document.body) return;
      const root = rootRef.current;
      if (root === null) return;
      const items = [
        ...root.querySelectorAll<HTMLElement>(
          "[data-slot='tool-group-list'] > li",
        ),
      ];
      const focused = focusedCall.current;
      const at = focused === null ? -1 : calls.indexOf(focused);
      // The search starts after the decided call, or, if the host dropped it,
      // at the call that followed it in the last commit.
      let start = at + 1;
      if (focused !== null && at === -1) {
        const follower = was
          .slice(was.indexOf(focused) + 1)
          .find((id) => calls.includes(id));
        start = follower === undefined ? calls.length : calls.indexOf(follower);
      }
      // The header is a button, so it is the target only with no row left.
      const target =
        nextWaiting(items, start) ??
        items[at]?.querySelector<HTMLElement>("[data-slot='tool-approval']") ??
        items[at] ??
        items[start] ??
        items[items.length - 1] ??
        root.querySelector<HTMLElement>("[data-slot='tool-group-header']");
      target?.focus();
    });

    const setRoot = useCallback(
      (element: HTMLDivElement | null) => {
        rootRef.current = element;
        if (typeof ref === "function") ref(element);
        else if (ref !== null && ref !== undefined) ref.current = element;
      },
      [ref],
    );

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
        ref={setRoot}
        data-slot="tool-group"
        className={cn("flex min-w-0 flex-col text-sm", className)}
        {...props}
        onFocus={(event) => {
          focusInside.current = true;
          onFocus?.(event);
        }}
        onBlur={(event) => {
          // Focus leaving the group, to another element or to nothing, ends
          // "inside". A decided card going away does not reach here: React
          // ignores blur while it commits, so the layout effect still sees it.
          const next = event.relatedTarget;
          if (next === null || !event.currentTarget.contains(next))
            focusInside.current = false;
          onBlur?.(event);
        }}
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
              <span className="text-destructive">
                {" "}
                · {labels.failed(failed)}
              </span>
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
              <li
                key={tool.toolCallId}
                tabIndex={-1}
                className="min-w-0 rounded-md"
                onFocus={() => {
                  focusedCall.current = tool.toolCallId;
                }}
              >
                {render(tool)}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  },
);

const WAITING = "[data-slot='tool-approval'][data-status='pending']";

/** The card of the first waiting call from `start`, else of the first. */
function nextWaiting(
  items: readonly Element[],
  start: number,
): HTMLElement | null {
  const waiting = (item: Element) => item.querySelector(WAITING) !== null;
  const item = items.slice(start).find(waiting) ?? items.find(waiting);
  return (
    item?.querySelector<HTMLElement>(
      `${WAITING} [data-slot='tool-approval-card']`,
    ) ?? null
  );
}
