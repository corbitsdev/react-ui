import type { ReactNode } from "react";

import { STATUS_LABEL, type NowItem } from "../lib/now-item.js";
import { formatRelativeTime } from "../lib/relative-time.js";
import { cn } from "../lib/utils.js";
import { Badge } from "./badge.js";
import { RefChips, type ContextRef } from "./context-strip.js";
import { DialogBody, DialogFooter, DialogHeader, DialogTitle } from "./dialog.js";

/** The mail variant of `NowItem` — the same item the queue row renders. */
export type MailItem = Extract<NowItem, { type: "mail" }>;

export type MailDetailProps = {
  readonly item: MailItem;
  /** The message body, already plain text. Pass a renderer as `children` for rich bodies. */
  readonly body?: string;
  /** Typed entity references — the "Related" row. */
  readonly refs?: readonly ContextRef[];
  /** Buttons: archive, mark done, reply. The host owns what they do. */
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  readonly now?: number;
  readonly className?: string;
};

/**
 * The reading pane for one message: who it is from and when, its enrichment
 * badges, the body, its related references, and the actions available on it.
 *
 * Content only — it renders inside a `DialogContent side="right"` and never
 * opens or closes anything, so the host keeps ownership of which message is
 * open. It uses `DialogTitle` rather than a bare heading because Radix needs a
 * titled dialog; to reuse this as the right column of a two-pane layout, swap
 * those three `Dialog*` parts for `header` / `div` / `footer` — outside a
 * dialog they have no dialog context to attach to.
 *
 * `body` is plain text on purpose. Rendering host-supplied markup is a decision
 * with a security cost, and it is the host's to make: pass a renderer as
 * `children` instead.
 */
export function MailDetail({ item, body, refs = [], actions, children, now, className }: MailDetailProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={item.priority === "now" ? "accent" : "neutral"}>{item.classification}</Badge>
          <Badge tone={item.status === "needs-action" ? "info" : "success"}>{STATUS_LABEL[item.status]}</Badge>
          {item.read ? null : <Badge tone="neutral">Unread</Badge>}
        </div>
        <DialogTitle>{item.title}</DialogTitle>
        <p className="text-sm text-muted-foreground">
          {item.from} ·{" "}
          <time dateTime={item.when}>{formatRelativeTime(item.when, now)}</time>
        </p>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-4">
        {children ?? (body === undefined ? null : <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>)}
        {refs.length === 0 ? null : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Related</p>
            <RefChips items={refs} />
          </div>
        )}
      </DialogBody>

      {actions === undefined ? null : <DialogFooter className="justify-start border-t border-border pt-4">{actions}</DialogFooter>}
    </div>
  );
}
