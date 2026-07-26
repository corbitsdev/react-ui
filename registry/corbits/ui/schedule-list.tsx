"use client";

import { useCollectionState } from "@/registry/corbits/hooks/use-collection-state";
import type { CollectionRequest } from "@/registry/corbits/lib/data-port";
import { formatRelativeTime } from "@/registry/corbits/lib/relative-time";
import { describeRecurrence, type Schedule } from "@/registry/corbits/lib/schedule";
import { cn } from "@/registry/corbits/lib/utils";
import { Button } from "@/registry/corbits/ui/button";
import { RunNowButton } from "@/registry/corbits/ui/run-now-button";
import { Switch } from "@/registry/corbits/ui/switch";

export type ScheduleListProps = {
  readonly request: CollectionRequest<Schedule>;
  readonly onEdit: (schedule: Schedule) => void;
  readonly onToggleEnabled: (schedule: Schedule, enabled: boolean) => void;
  /** Run ahead of the next occurrence. Omit to hide the control. */
  readonly onRunNow?: (schedule: Schedule) => void | Promise<void>;
  readonly empty?: React.ReactNode;
  readonly now?: number;
  readonly className?: string;
};

/**
 * The user's repeating jobs.
 *
 * Each row says when it next runs, in words and as a time. A schedule list that
 * only shows "Every 2 days" leaves the user to work out whether that means
 * tonight, and the whole reason to open this page is to find out.
 *
 * The pause switch is not behind an edit screen. Turning a schedule off is the
 * most common thing anyone does here and the most urgent — it is usually done
 * because something is going wrong.
 */
export function ScheduleList({
  request,
  onEdit,
  onToggleEnabled,
  onRunNow,
  empty,
  now,
  className,
}: ScheduleListProps) {
  const { state, isFetching, refetch } = useCollectionState(request);

  if (state.status === "loading") {
    return (
      <p role="status" className="px-3 py-6 text-sm text-muted-foreground">
        Loading schedules…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-3 py-6">
        <p className="text-sm">{state.error.message}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
          Try again
        </Button>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        {empty ?? "Nothing scheduled yet."}
      </p>
    );
  }

  return (
    <ul
      aria-label="Schedules"
      aria-busy={isFetching}
      className={cn("flex flex-col divide-y divide-border", className)}
    >
      {state.items.map((schedule) => (
        <li key={schedule.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
          <Switch
            checked={schedule.enabled}
            label={`${schedule.enabled ? "Pause" : "Resume"} ${schedule.name}`}
            onCheckedChange={(enabled) => onToggleEnabled(schedule, enabled)}
          />

          <button
            type="button"
            onClick={() => onEdit(schedule)}
            className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
          >
            <span className={cn("truncate text-sm font-medium", !schedule.enabled && "text-muted-foreground")}>
              {schedule.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {describeRecurrence(schedule.recurrence)}
              {schedule.enabled && schedule.nextRunAt !== null
                ? ` · next ${formatRelativeTime(schedule.nextRunAt, now)}`
                : " · paused"}
            </span>
          </button>

          {onRunNow === undefined ? null : (
            <RunNowButton
              variant="outline"
              size="sm"
              disabled={!schedule.enabled}
              onRun={() => onRunNow(schedule)}
              label="Run now"
              doneLabel="Started"
            />
          )}
        </li>
      ))}
    </ul>
  );
}
