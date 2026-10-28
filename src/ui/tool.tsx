"use client";

import {
  Ban,
  Check,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";
import { createContext, useContext, useId, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { isAwaitingApproval } from "../lib/conversation-activity.js";
import type { PartTool, ToolTraceStatus } from "../lib/conversation.js";
import { displayedToolStatus, formatToolValue } from "../lib/tool-display.js";
import { cn } from "../lib/utils.js";
import { ToolApproval } from "./tool-approval.js";

type ToolContextValue = {
  readonly part: PartTool;
  readonly status: ToolTraceStatus;
  readonly open: boolean;
  readonly toggle: () => void;
  readonly hasDetail: boolean;
  readonly detailId: string;
};

const ToolContext = createContext<ToolContextValue | null>(null);

function useToolContext(part: string): ToolContextValue {
  const context = useContext(ToolContext);
  if (context === null) throw new Error(`${part} must be inside a Tool.`);
  return context;
}

export type ToolProps = Omit<ComponentProps<"div">, "part"> & {
  readonly part: PartTool;
  /** Controlled open state. Pair with `onOpenChange`. */
  readonly open?: boolean | undefined;
  /**
   * Seeds the open state. Left out, the call opens when it shows `error`,
   * including when it fails after it mounted, and stays open, also through
   * a retry that succeeds, until a person closes it.
   */
  readonly defaultOpen?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
};

/**
 * One tool call: a header row that opens onto its input and output.
 *
 * Without children it renders `ToolHeader`, the outcome of a settled
 * approval, `ToolInput` and `ToolOutput`. A call waiting on a person is
 * `ToolApproval`'s job; here it only reads "Needs approval".
 */
export function Tool({
  part,
  open: openProp,
  defaultOpen,
  onOpenChange,
  className,
  children,
  ...props
}: ToolProps) {
  const detailId = useId();
  const status = displayedToolStatus(part);
  // `null` means nobody has opened or closed it yet, so the status decides.
  const [chosen, setChosen] = useControllableState<boolean | null>({
    value: openProp,
    defaultValue: defaultOpen ?? null,
    onChange:
      onOpenChange === undefined
        ? undefined
        : (next) => {
            if (next !== null) onOpenChange(next);
          },
    name: "Tool",
  });
  // Once a failure opened the call it stays open, so a retry that succeeds
  // does not unmount the output focus may be in. Set while rendering
  // (react.dev, "Storing information from previous renders").
  const failed = status === "error";
  const [autoOpened, setAutoOpened] = useState(failed);
  if (failed && !autoOpened) setAutoOpened(true);
  const open = chosen ?? autoOpened;
  const hasDetail = part.input !== undefined || part.output !== undefined;
  const settled = part.approval !== undefined && !isAwaitingApproval(part);

  return (
    <ToolContext.Provider
      value={{
        part,
        status,
        open,
        toggle: () => setChosen(!open),
        hasDetail,
        detailId,
      }}
    >
      <div
        data-slot="tool"
        data-status={status}
        className={cn("flex min-w-0 flex-col text-sm", className)}
        {...props}
      >
        {children ?? (
          <>
            <ToolHeader />
            {settled ? (
              <ToolApproval part={part} onDecide={ignoreDecision} />
            ) : null}
            <ToolInput />
            <ToolOutput />
          </>
        )}
      </div>
    </ToolContext.Provider>
  );
}

// A settled approval only shows its outcome; it never offers a decision.
function ignoreDecision() {}

const STATUS_LABEL: Record<ToolTraceStatus, string> = {
  pending: "Queued",
  running: "Running",
  "output-available": "Done",
  error: "Failed",
  "approval-requested": "Needs approval",
  "output-denied": "Not run",
};

function StatusIcon({ status }: { readonly status: ToolTraceStatus }) {
  const className = "size-3.5 shrink-0";
  switch (status) {
    case "pending":
      return (
        <CircleDashed
          aria-hidden
          className={cn(className, "text-muted-foreground")}
        />
      );
    case "running":
      return (
        <LoaderCircle
          aria-hidden
          className={cn(
            className,
            "text-muted-foreground motion-safe:animate-spin",
          )}
        />
      );
    case "output-available":
      return <Check aria-hidden className={cn(className, "text-ok")} />;
    case "error":
      return (
        <CircleAlert
          aria-hidden
          className={cn(className, "text-destructive")}
        />
      );
    case "approval-requested":
      return (
        <ShieldAlert
          aria-hidden
          className={cn(className, "text-primary-emphasis")}
        />
      );
    case "output-denied":
      return (
        <Ban aria-hidden className={cn(className, "text-muted-foreground")} />
      );
  }
}

export type ToolHeaderProps = {
  /** Human phrasing of what the call did, shown before the raw tool name. */
  readonly label?: ReactNode;
  /** Overrides the status words ("Queued", "Running", "Done", …). */
  readonly statusLabels?: Partial<Record<ToolTraceStatus, string>> | undefined;
  readonly className?: string | undefined;
};

/**
 * The call's row: its status as an icon and a word, the label and the raw
 * tool name. It toggles the input and output, and is plain text when the
 * call has neither.
 */
export function ToolHeader({
  label,
  statusLabels,
  className,
}: ToolHeaderProps) {
  const { part, status, open, toggle, hasDetail, detailId } =
    useToolContext("ToolHeader");
  // The ids `ToolInput` and `ToolOutput` render under while open.
  const controls = [
    part.input === undefined ? null : `${detailId}-input`,
    part.output === undefined ? null : `${detailId}-output`,
  ]
    .filter((id) => id !== null)
    .join(" ");
  const statusText = statusLabels?.[status] ?? STATUS_LABEL[status];
  const row = cn(
    "flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-start",
    className,
  );
  const content = (
    <>
      <StatusIcon status={status} />
      <span className="min-w-0 flex-1 truncate">
        {label === undefined ? null : <span className="me-1.5">{label}</span>}
        <code className="font-mono text-xs text-muted-foreground">
          {part.name}
        </code>
      </span>
      <span
        className={cn(
          "shrink-0 text-xs",
          status === "error" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {statusText}
      </span>
    </>
  );

  if (!hasDetail) {
    return (
      <div data-slot="tool-header" className={row}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      data-slot="tool-header"
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      onClick={toggle}
      className={cn(row, "transition-colors hover:bg-muted")}
    >
      {content}
      <ChevronRight
        aria-hidden
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200",
          open && "rotate-90",
        )}
      />
    </button>
  );
}

export type ToolDetailProps = {
  /** Renders the value, e.g. as highlighted code. Defaults to plain text or indented JSON. */
  readonly render?: ((value: unknown) => ReactNode) | undefined;
  readonly title?: string | undefined;
  readonly className?: string | undefined;
};

export type ToolInputProps = ToolDetailProps;

/** The call's arguments, while the call is open. */
export function ToolInput({
  render,
  title = "Input",
  className,
}: ToolInputProps) {
  const { part, open, detailId } = useToolContext("ToolInput");
  if (!open || part.input === undefined) return null;
  return (
    <ToolDetail
      slot="tool-input"
      id={`${detailId}-input`}
      title={title}
      className={className}
    >
      {render === undefined ? formatToolValue(part.input) : render(part.input)}
    </ToolDetail>
  );
}

export type ToolOutputProps = ToolDetailProps & {
  /** The title when the call failed. */
  readonly errorTitle?: string | undefined;
};

/** What the call returned, or why it failed, while the call is open. */
export function ToolOutput({
  render,
  title = "Output",
  errorTitle = "Error",
  className,
}: ToolOutputProps) {
  const { part, status, open, detailId } = useToolContext("ToolOutput");
  if (!open || part.output === undefined) return null;
  return (
    <ToolDetail
      slot="tool-output"
      id={`${detailId}-output`}
      title={status === "error" ? errorTitle : title}
      className={className}
    >
      {render === undefined
        ? formatToolValue(part.output)
        : render(part.output)}
    </ToolDetail>
  );
}

function ToolDetail({
  slot,
  id,
  title,
  className,
  children,
}: {
  readonly slot: string;
  readonly id: string;
  readonly title: string;
  readonly className: string | undefined;
  readonly children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <div
      id={id}
      data-slot={slot}
      className={cn(
        "ms-3 flex flex-col gap-1 border-s border-border py-1 ps-4",
        className,
      )}
    >
      <p id={titleId} className="text-xs font-medium text-muted-foreground">
        {title}
      </p>
      {/* Scrolls in its own box, so a long result never stretches the
          transcript; focusable so the keyboard can scroll it. */}
      <div
        role="group"
        aria-labelledby={titleId}
        tabIndex={0}
        className="max-h-48 overflow-auto rounded-md bg-muted p-2 font-mono text-xs break-words whitespace-pre-wrap"
      >
        {children}
      </div>
    </div>
  );
}
