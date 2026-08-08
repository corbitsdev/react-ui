import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type InspectorEmptyProps = {
  readonly title: string;
  readonly description?: string;
  readonly className?: string;
};

/** The "nothing selected" message inside an inspector rail. Deliberately not
 * `EmptyState` — that component centres and pads for a full-width surface;
 * an inspector's empty message sits left-aligned in a narrow side panel. */
export function InspectorEmpty({ title, description, className }: InspectorEmptyProps) {
  return (
    <div className={cn("max-w-64", className)}>
      <p className="text-sm font-semibold">{title}</p>
      {description === undefined ? null : <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{description}</p>}
    </div>
  );
}

export type InspectorHeaderProps = {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
};

/** The chip row, title and action buttons at the top of an inspector. */
export function InspectorHeader({ eyebrow, title, description, actions, className }: InspectorHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {eyebrow === undefined ? null : <div className="flex flex-wrap items-center gap-1.5">{eyebrow}</div>}
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      {description === undefined ? null : <p className="text-xs leading-snug text-muted-foreground">{description}</p>}
      {actions === undefined ? null : <div className="mt-1 flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function InspectorPanelTitle({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn("mb-2 mt-4 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground first:mt-0", className)}>
      {children}
    </div>
  );
}

export type InspectorKvRow = {
  readonly label: string;
  readonly value: ReactNode;
  readonly mono?: boolean;
};

export function InspectorKv({ rows, className }: { readonly rows: readonly InspectorKvRow[]; readonly className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3 text-xs">
          <span className="shrink-0 text-muted-foreground">{row.label}</span>
          <span className={cn("min-w-0 truncate text-right", row.mono === true && "font-mono")}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export type InspectorShellProps = {
  readonly header?: ReactNode;
  readonly children?: ReactNode;
  /** Shown instead of `children` when nothing is selected. */
  readonly empty?: ReactNode;
  readonly className?: string;
};

/**
 * The side-rail frame every inspector shares: a header region, a scrollable
 * body, and an empty state that replaces both when there is no selection.
 * `InspectorHeader`/`InspectorKv`/`InspectorPanelTitle` are exported
 * separately so a caller can compose its own layout inside this shell
 * instead of going through a single big inspector component.
 */
export function InspectorShell({ header, children, empty, className }: InspectorShellProps) {
  if (empty !== undefined && header === undefined) {
    return (
      <aside aria-label="Inspector" className={cn("flex min-h-0 flex-col overflow-auto border-l border-border bg-card", className)}>
        <div className="flex flex-1 flex-col items-start justify-center px-5 py-10">{empty}</div>
      </aside>
    );
  }

  return (
    <aside aria-label="Inspector" className={cn("flex min-h-0 flex-col overflow-hidden border-l border-border bg-card", className)}>
      {header === undefined ? null : <div className="shrink-0 border-b border-border px-4 pb-3 pt-4">{header}</div>}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">{children}</div>
    </aside>
  );
}
