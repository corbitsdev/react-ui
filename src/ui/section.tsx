import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type SectionProps = {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  /** Controls for this section: a filter, a view toggle, a primary action. */
  readonly action?: ReactNode;
  /** Item count shown beside the title. */
  readonly count?: number;
  /**
   * Heading level. Defaults to `h2`. Set `h1` for the page's own header — this
   * is deliberately one component and not a separate `PageHeader`, because the
   * only real difference between the two is the document outline, and a second
   * near-identical file is how two headers drift apart.
   */
  readonly as?: "h1" | "h2" | "h3";
  readonly children: ReactNode;
  readonly className?: string;
};

const TITLE_CLASS: Record<NonNullable<SectionProps["as"]>, string> = {
  h1: "text-xl font-semibold tracking-tight",
  h2: "text-sm font-semibold",
  h3: "text-xs font-semibold",
};

/** A titled block: heading, optional description and controls, then content. */
export function Section({ title, description, action, count, as = "h2", children, className }: SectionProps) {
  const Heading = as;
  return (
    <section data-slot="section" className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Heading className={TITLE_CLASS[as]}>{title}</Heading>
            {count === undefined ? null : (
              <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {count}
              </span>
            )}
          </div>
          {description === undefined ? null : (
            <p className="text-sm leading-snug text-muted-foreground">{description}</p>
          )}
        </div>
        {action === undefined ? null : <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}
