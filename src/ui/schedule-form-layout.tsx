import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type ScheduleFormLayoutProps = {
  readonly form: ReactNode;
  readonly summary: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
};

/** Two-column create/edit layout: form body on the left, a sticky summary on
 * the right. The caller owns the form's fields and validation and the
 * summary's content — this is layout only. */
export function ScheduleFormLayout({ form, summary, footer, className }: ScheduleFormLayoutProps) {
  return (
    <div className={cn("grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]", className)}>
      <div className="min-w-0">
        {form}
        {footer === undefined ? null : <div className="mt-5">{footer}</div>}
      </div>
      <aside className="h-fit rounded-lg border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4">{summary}</aside>
    </div>
  );
}

export type ScheduleFormSummaryRow = {
  readonly label: string;
  readonly value: ReactNode;
};

export type ScheduleFormSummaryProps = {
  readonly title?: string;
  readonly rows: readonly ScheduleFormSummaryRow[];
  readonly actions?: ReactNode;
  readonly className?: string;
};

/** The summary card's content — split from the layout so a caller can reuse
 * just the label/value list elsewhere (a confirmation dialog, say). */
export function ScheduleFormSummary({ title = "Summary", rows, actions, className }: ScheduleFormSummaryProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{title}</p>
      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-semibold text-muted-foreground">{row.label}</dt>
            <dd className="text-sm font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
      {actions === undefined ? null : <div className="mt-2 flex flex-col gap-2">{actions}</div>}
    </div>
  );
}
