import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type DashboardSectionVariant = "plain" | "highlighted";

export type DashboardSectionProps = {
  /** Section heading, set in the dashboard caption style. */
  readonly title: ReactNode;
  /** Optional supporting copy under the title. */
  readonly description?: ReactNode;
  /** Optional header controls (filters, links) aligned to the title row. */
  readonly action?: ReactNode;
  /**
   * `highlighted` adds a bordered gradient shell — the KPI band treatment.
   * `plain` is the default section stack.
   */
  readonly variant?: DashboardSectionVariant;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * A dashboard's section shell: caption title, optional description and
 * controls, and one vertical rhythm for the blocks beneath.
 *
 * It is not `Section` — that is the document-outline block with real heading
 * sizes. A dashboard's sections are captions over dense panels: small,
 * uppercase, letterspaced, so the numbers stay the loudest thing on screen.
 */
export function DashboardSection({
  title,
  description,
  action,
  variant = "plain",
  children,
  className,
}: DashboardSectionProps) {
  const shell =
    variant === "highlighted"
      ? "rounded-[16px] border border-border bg-gradient-to-b from-muted to-card p-4 max-md:p-3"
      : "";

  return (
    <section data-slot="dashboard-section" data-variant={variant} className={cn("flex flex-col gap-4", shell, className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">{title}</h2>
          {description === undefined ? null : (
            <p className="text-[13px] leading-snug text-muted-foreground">{description}</p>
          )}
        </div>
        {action === undefined ? null : <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}
