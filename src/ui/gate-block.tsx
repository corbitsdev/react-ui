import type { ReactNode } from "react";

import { GATE_KIND_LABEL, type GateShellModel } from "../lib/workflow-registry.js";
import { cn } from "../lib/utils.js";

export type GateBlockProps = {
  readonly gate: GateShellModel;
  /** The interactive payload — a review list, choice buttons, a form. */
  readonly children?: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
};

/**
 * Presentational chrome for a pending gate: a run parked on a human
 * decision. The interactive payload is entirely the caller's — this
 * component only frames it, so the resume-payload contract stays wherever
 * the host's signal-sending logic already lives.
 */
export function GateBlock({ gate, children, footer, className }: GateBlockProps) {
  return (
    <section
      data-gate-kind={gate.kind}
      aria-label={GATE_KIND_LABEL[gate.kind]}
      className={cn("rounded-lg border border-primary-emphasis/30 bg-primary/5 px-3.5 py-3", className)}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-primary-emphasis">
        {GATE_KIND_LABEL[gate.kind]}
      </p>
      <h3 className="mt-1 text-sm font-semibold">{gate.title}</h3>
      {gate.prompt === undefined ? null : <p className="mt-1 text-xs leading-snug text-muted-foreground">{gate.prompt}</p>}
      {children === undefined ? null : <div className="mt-3">{children}</div>}
      {footer === undefined ? null : <div className="mt-3 flex flex-wrap items-center gap-2">{footer}</div>}
    </section>
  );
}
