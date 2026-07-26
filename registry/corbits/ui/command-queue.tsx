"use client";

import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { useCollectionState } from "@/registry/corbits/hooks/use-collection-state";
import type { CollectionRequest } from "@/registry/corbits/lib/data-port";
import { PRIORITY_LABEL, STATUS_LABEL, type NowItem } from "@/registry/corbits/lib/now-item";
import { formatRelativeTime } from "@/registry/corbits/lib/relative-time";
import { cn } from "@/registry/corbits/lib/utils";
import { Button } from "@/registry/corbits/ui/button";
import { EmptyState } from "@/registry/corbits/ui/empty-state";

export type CommandQueueProps = {
  /** The queue's collection, resolved by whatever DataPort is in scope. */
  readonly request: CollectionRequest<NowItem>;
  readonly selectedId?: string | null;
  readonly onOpen: (item: NowItem) => void;
  /** Shown when the collection is ready and empty. */
  readonly empty?: ReactNode;
  readonly now?: number;
  readonly className?: string;
};

/**
 * The full attention queue under the Now strip: everything, densest form.
 *
 * Fed by a `DataPort` rather than an items array, because this is the surface
 * that paginates — `hasNextPage`/`fetchNextPage` come from the port, and a
 * caller passing a plain array would have to rebuild that. Its four states come
 * from `useCollectionState`, the same machine the data table uses, so a queue
 * and a table never disagree about what "empty" means.
 *
 * Rows are buttons, not links: opening an item selects it in a two-pane layout
 * rather than navigating. Give the row an `href` and render `NowCards` instead
 * when it really is a navigation.
 */
export function CommandQueue({ request, selectedId = null, onOpen, empty, now, className }: CommandQueueProps) {
  const { state, isFetching, refetch, hasNextPage, fetchNextPage } = useCollectionState(request);

  if (state.status === "loading") {
    return (
      <p role="status" className={cn("px-3 py-6 text-sm text-muted-foreground", className)}>
        Loading…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className={cn("px-3 py-6", className)}>
        <p className="text-sm">{state.error.message}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
          Try again
        </Button>
      </div>
    );
  }

  if (state.status === "empty") {
    return <div className={className}>{empty ?? <EmptyState icon={<Inbox />} title="You're all caught up" />}</div>;
  }

  return (
    <div className={className}>
      <ul aria-label="Queue" aria-busy={isFetching} className="flex flex-col">
        {state.items.map((item) => (
          <li key={`${item.type}:${item.id}`}>
            <QueueRow item={item} selected={item.id === selectedId} onOpen={() => onOpen(item)} now={now} />
          </li>
        ))}
      </ul>
      {hasNextPage ? (
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full" onClick={fetchNextPage} disabled={isFetching}>
            {isFetching ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One item as a row: status, priority band, subject, classification, who it is
 * from (or the decision being asked for), and when.
 *
 * Exported, and it is also the mail row: an inbox list and the queue differ in
 * where their items come from, not in how an item reads. A second component
 * over the same fields would drift from this one within a release.
 */
export function QueueRow({
  item,
  selected,
  onOpen,
  now,
}: {
  item: NowItem;
  selected: boolean;
  onOpen: () => void;
  now?: number;
}) {
  const unread = item.type === "mail" && !item.read;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0",
        selected ? "bg-primary/10" : "hover:bg-muted",
      )}
    >
      {/* One marker, not two: the dot says "still asking" — unread mail or an
          undecided gate — and the label behind it names which. A done item
          shows nothing here, which is the point. */}
      <span className="grid size-2 shrink-0 place-items-center">
        {item.status === "needs-action" ? (
          <span
            role="img"
            aria-label={unread ? `${STATUS_LABEL[item.status]}, unread` : STATUS_LABEL[item.status]}
            className="size-2 rounded-full bg-primary"
          />
        ) : null}
      </span>
      <span
        className={cn(
          "w-11 shrink-0 text-[10px] font-semibold tracking-wide uppercase",
          item.priority === "now" ? "text-primary-emphasis" : "text-muted-foreground",
        )}
      >
        {PRIORITY_LABEL[item.priority]}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", unread ? "font-semibold" : "text-muted-foreground")}>
        {item.title}
      </span>
      <span className="hidden shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:inline">
        {item.classification}
      </span>
      <span className="hidden max-w-28 min-w-0 truncate text-xs text-muted-foreground md:inline">
        {item.type === "mail" ? item.from : item.action}
      </span>
      <time dateTime={item.when} className="shrink-0 text-[11px] text-muted-foreground">
        {formatRelativeTime(item.when, now)}
      </time>
    </button>
  );
}
