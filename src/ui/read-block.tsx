import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type ReadBlockProps = {
  readonly label: string;
  readonly value: ReactNode;
  readonly sub?: ReactNode;
  readonly mono?: boolean;
  readonly className?: string;
};

/** A single labelled read-only fact card — a cadence, a next-fire time.
 * Split out from `ScheduleInspectorView` because a summary panel or a
 * details drawer wants the exact same card without the rest of the
 * inspector's chrome. */
export function ReadBlock({ label, value, sub, mono = false, className }: ReadBlockProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/40 px-3 py-2.5", className)}>
      <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold", mono && "font-mono text-[12.5px]")}>{value}</div>
      {sub === undefined ? null : <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
