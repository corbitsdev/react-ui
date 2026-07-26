"use client";

import { Plus } from "lucide-react";

import { useCollectionState } from "@/registry/corbits/hooks/use-collection-state";
import type { ChatThreadSummary } from "@/registry/corbits/lib/chat-message";
import type { CollectionRequest } from "@/registry/corbits/lib/data-port";
import { formatRelativeTime } from "@/registry/corbits/lib/relative-time";
import { cn } from "@/registry/corbits/lib/utils";
import { Button } from "@/registry/corbits/ui/button";

export type ThreadListProps = {
  /** The threads collection. Unlike the transcript, this really is a collection. */
  readonly request: CollectionRequest<ChatThreadSummary>;
  readonly activeId?: string | null;
  readonly onSelect: (thread: ChatThreadSummary) => void;
  readonly onNewThread?: () => void;
  readonly now?: number;
  readonly className?: string;
};

/**
 * Past conversations. DataPort-backed — this is paginated, cacheable, server-
 * owned data, which is exactly what the transcript is not.
 *
 * The active thread is `aria-current="true"`, not merely tinted, so it is the
 * current item for someone who cannot see the tint.
 */
export function ThreadList({ request, activeId = null, onSelect, onNewThread, now, className }: ThreadListProps) {
  const { state, isFetching, refetch, hasNextPage, fetchNextPage } = useCollectionState(request);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {onNewThread === undefined ? null : (
        <div className="p-2">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={onNewThread}>
            <Plus className="size-4" aria-hidden />
            New thread
          </Button>
        </div>
      )}

      {state.status === "loading" ? (
        <p role="status" className="px-3 py-4 text-sm text-muted-foreground">
          Loading threads…
        </p>
      ) : state.status === "error" ? (
        <div className="px-3 py-4">
          <p className="text-sm">{state.error.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
            Try again
          </Button>
        </div>
      ) : state.status === "empty" ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">No conversations yet.</p>
      ) : (
        <>
          <ul aria-label="Conversations" aria-busy={isFetching} className="min-h-0 flex-1 overflow-y-auto px-2">
            {state.items.map((thread) => {
              const active = thread.id === activeId;
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(thread)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left transition-colors",
                      active ? "bg-primary/10" : "hover:bg-muted",
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className={cn("min-w-0 flex-1 truncate text-sm", active && "font-medium")}>
                        {thread.title}
                      </span>
                      <time dateTime={thread.updatedAt} className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(thread.updatedAt, now)}
                      </time>
                    </span>
                    {thread.preview === undefined ? null : (
                      <span className="truncate text-xs text-muted-foreground">{thread.preview}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {hasNextPage ? (
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full" onClick={fetchNextPage} disabled={isFetching}>
                {isFetching ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
