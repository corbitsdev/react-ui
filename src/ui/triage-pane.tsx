import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type TriagePaneProps = {
  /** Filter chips / group counts for the list column. */
  readonly listHeader?: ReactNode;
  /** Scrollable item list. */
  readonly list: ReactNode;
  /** Full context for the selected item. */
  readonly detail: ReactNode;
  /** Empty-state when nothing is selected or the list is empty. */
  readonly empty?: ReactNode;
  readonly className?: string;
};

/**
 * Two-pane triage layout: denselist left, full context right. Used by the
 * inbox surface so list selection and detail actions stay one layout.
 */
export function TriagePane({ listHeader, list, detail, empty, className }: TriagePaneProps) {
  return (
    <div
      data-slot="triage-pane"
      className={cn("grid h-full min-h-0 grid-cols-[minmax(16rem,22rem)_1fr] border-t border-border", className)}
    >
      <section
        data-slot="triage-list"
        className="flex min-h-0 flex-col border-r border-border"
        aria-label="Triage list"
      >
        {listHeader === undefined ? null : (
          <div className="shrink-0 border-b border-border px-3 py-2">{listHeader}</div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
      </section>
      <section
        data-slot="triage-detail"
        className="flex min-h-0 flex-col overflow-y-auto"
        aria-label="Triage detail"
      >
        {detail ?? empty ?? null}
      </section>
    </div>
  );
}

export type TriageListItemProps = {
  readonly selected?: boolean;
  readonly onSelect?: () => void;
  readonly children: ReactNode;
  readonly className?: string;
};

/** One selectable row in the triage list. */
export function TriageListItem({ selected = false, onSelect, children, className }: TriageListItemProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left transition-colors",
        "hover:bg-muted/60",
        selected ? "bg-primary/10" : "bg-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}
