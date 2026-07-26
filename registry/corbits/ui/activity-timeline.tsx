"use client";

import { History } from "lucide-react";

import { useCollectionState } from "@/registry/corbits/hooks/use-collection-state";
import { type ActivityEntry, groupByDay } from "@/registry/corbits/lib/activity";
import type { CollectionRequest } from "@/registry/corbits/lib/data-port";
import { formatRelativeTime } from "@/registry/corbits/lib/relative-time";
import { cn } from "@/registry/corbits/lib/utils";
import { Badge, type BadgeTone } from "@/registry/corbits/ui/badge";
import { Button } from "@/registry/corbits/ui/button";
import { EmptyState } from "@/registry/corbits/ui/empty-state";
import { Skeleton } from "@/registry/corbits/ui/skeleton";

const TONES: Record<NonNullable<ActivityEntry["tone"]>, BadgeTone> = {
  neutral: "neutral",
  positive: "success",
  warning: "accent",
  critical: "danger",
};

export type ActivityTimelineProps = {
  readonly request: CollectionRequest<ActivityEntry>;
  /** Names the feed for assistive tech: "Dana's activity", "Workspace activity". */
  readonly label: string;
  /** Shown when the feed is empty. */
  readonly emptyTitle?: string;
  /** Render-time for relative stamps. */
  readonly now?: number;
  readonly className?: string;
};

/**
 * What happened, newest first, under day headings.
 *
 * One component for a person's history and for a whole workspace's feed. They
 * differ only in which request is handed to them — same rows, same grouping,
 * same paging — and two files would be two places for the timestamp formatting
 * to drift apart.
 *
 * Day headings are what make a long feed skimmable: without them every row
 * carries a full date and the reader parses forty of them to find yesterday.
 * They are real `<h3>`s inside a `<section>` per day, so the feed has an
 * outline a screen reader can jump through rather than being one flat list.
 *
 * Each row carries both a relative stamp and a machine-readable `<time>`. "3 h
 * ago" is what a person reads; the `dateTime` attribute is what anyone auditing
 * when something happened actually needs, and it costs one attribute.
 *
 * Paging is an explicit control, not a scroll sentinel — see the gallery for
 * the same reasoning. On a feed it matters more: an infinitely-growing list of
 * history has no natural end to reach.
 */
export function ActivityTimeline({ request, label, emptyTitle = "No activity yet", now, className }: ActivityTimelineProps) {
  const { state, isFetching, hasNextPage, fetchNextPage } = useCollectionState(request);

  if (state.status === "loading") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <p role="status" className="text-sm text-muted-foreground">
          Loading activity…
        </p>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-start gap-3 py-2">
            <Skeleton className="size-6 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return <EmptyState className={className} icon={<History />} title="Couldn't load activity" description={state.error.message} />;
  }

  if (state.status === "empty") {
    return <EmptyState className={className} icon={<History />} title={emptyTitle} />;
  }

  const days = groupByDay(state.items);

  return (
    <div className={cn("flex flex-col gap-5", className)} aria-busy={isFetching}>
      {days.map((day) => (
        <section key={day.key} className="flex flex-col gap-1" aria-label={day.label}>
          <h3 className="sticky top-0 bg-background py-1 text-xs font-semibold text-muted-foreground">{day.label}</h3>
          <ul aria-label={label} className="flex flex-col">
            {day.entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONES[entry.tone ?? "neutral"]}>{entry.kind}</Badge>
                    {entry.actorName === undefined ? null : (
                      <span className="text-xs text-muted-foreground">{entry.actorName}</span>
                    )}
                  </span>
                  <span className="text-sm leading-snug">{entry.summary ?? "No details recorded"}</span>
                </span>
                <time
                  dateTime={entry.timestamp}
                  className="shrink-0 pt-0.5 font-mono text-xs text-muted-foreground tabular-nums"
                >
                  {formatRelativeTime(entry.timestamp, now)}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {hasNextPage ? (
        <Button type="button" variant="outline" size="sm" onClick={fetchNextPage} disabled={isFetching} className="self-center">
          {isFetching ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
