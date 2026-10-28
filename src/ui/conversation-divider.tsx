import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type ConversationDividerProps = ComponentProps<"div">;

/**
 * A rule across the conversation with an optional label in the middle: a day
 * ("Today", "March 3") or any other break. Without a label the rule is an
 * `<hr>`, a plain separator; with one, the label is ordinary text so it is
 * read in place and the rules are decoration.
 */
export function ConversationDivider({
  className,
  children,
  ...props
}: ConversationDividerProps) {
  const labelled = children !== undefined && children !== null;
  return (
    <div
      data-slot="conversation-divider"
      className={cn(
        "flex items-center gap-3 text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    >
      {labelled ? (
        <>
          <span aria-hidden className="h-px flex-1 bg-border" />
          {children}
          <span aria-hidden className="h-px flex-1 bg-border" />
        </>
      ) : (
        <hr className="h-px flex-1 border-0 bg-border" />
      )}
    </div>
  );
}

export type ConversationNoticeProps = ComponentProps<"p"> & {
  /** A small decorative mark before the text; hidden from assistive tech. */
  readonly icon?: ReactNode;
};

/**
 * A one-line system event in the conversation: someone joined, a run was
 * scheduled, a setting changed. Centred and quiet, so it never reads as a
 * message.
 */
export function ConversationNotice({
  icon,
  className,
  children,
  ...props
}: ConversationNoticeProps) {
  return (
    <p
      data-slot="conversation-notice"
      className={cn(
        "flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground [&_svg]:size-3.5",
        className,
      )}
      {...props}
    >
      {icon === undefined ? null : (
        <span aria-hidden className="inline-flex shrink-0">
          {icon}
        </span>
      )}
      {children}
    </p>
  );
}
