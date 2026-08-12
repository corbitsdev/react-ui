import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";
import { Sparkline } from "./sparkline.js";

export type StatGridColumns = 2 | 3 | 4 | 5;

// Spelled out rather than composed at runtime — Tailwind's scanner only emits
// utilities it can see literally in the source.
const COLUMN_CLASS: Record<StatGridColumns, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-5",
};

export type StatGridProps = {
  readonly children: ReactNode;
  /** Responsive column count; defaults to four-up on wide screens. */
  readonly columns?: StatGridColumns;
  readonly className?: string;
};

/**
 * The KPI band: a fixed responsive grid of `StatGridItem`s.
 *
 * Fixed columns rather than auto-fit, because a KPI row is designed as a set —
 * four headline numbers are four columns, and a row that reflows to five-up on
 * a wider screen silently reorders what the reader compares side by side.
 */
export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  return <div className={cn("grid gap-3", COLUMN_CLASS[columns], className)}>{children}</div>;
}

function statValueClass(accent: boolean | undefined, danger: boolean | undefined): string {
  if (danger === true) return "text-destructive";
  if (accent === true) return "text-primary-emphasis";
  return "text-foreground";
}

export type StatGridItemProps = {
  readonly label: string;
  /** Pre-formatted. The tile does not know your units. */
  readonly value: string;
  /** Small print under the number — a rate, a share, a caveat. */
  readonly sub?: ReactNode;
  /** Orange action tone — reserve for genuine action/positive emphasis. */
  readonly accent?: boolean;
  /** Semantic danger — failure counts, not the action accent. */
  readonly danger?: boolean;
  /** Headline tile: larger value + padding. */
  readonly emphasis?: boolean;
  /** Optional period-over-period badge (e.g. a `DeltaBadge`). */
  readonly delta?: ReactNode;
  /** Custom sparkline slot; overrides `sparklineValues` when both are set. */
  readonly sparkline?: ReactNode;
  /** When set (and `sparkline` is omitted), renders the built-in trend line. */
  readonly sparklineValues?: readonly number[];
  /** Words for the built-in trend's shape; defaults to "{label} trend". */
  readonly sparklineLabel?: string;
  /**
   * When set, the tile is a real `<button>` and activates on click/Enter/Space.
   * Static tiles stay a non-interactive `div` so they do not join the tab order.
   */
  readonly onClick?: () => void;
  readonly className?: string;
};

/**
 * One KPI: caption label, headline number, optional delta, trend and small
 * print. The value never carries direction by colour alone — `accent` and
 * `danger` are semantic tones the caller opts into, and the delta slot carries
 * its own words.
 *
 * Interaction is opt-in. With `onClick`, the shell is a `<button>` (not a div
 * wearing `role="button"`) so keyboard activation is native. Shared layout
 * classes stay identical; only the interactive shell adds hover/press
 * affordance and the `text-left`/`w-full` button reset.
 */
export function StatGridItem({
  label,
  value,
  sub,
  accent,
  danger,
  emphasis,
  delta,
  sparkline,
  sparklineValues,
  sparklineLabel,
  onClick,
  className,
}: StatGridItemProps) {
  const sparklineNode =
    sparkline ??
    (sparklineValues !== undefined && sparklineValues.length > 0 ? (
      <Sparkline values={sparklineValues} summary={sparklineLabel ?? `${label} trend`} />
    ) : null);

  const shell = cn(
    "flex flex-col gap-1.5 rounded-[12px] border border-border bg-card",
    emphasis === true ? "p-5 shadow-sm" : "p-4",
    className,
  );

  const body = (
    <>
      <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-black leading-none tabular-nums",
            emphasis === true ? "text-[34px]" : "text-[26px]",
            statValueClass(accent, danger),
          )}
        >
          {value}
        </span>
        {delta}
      </div>
      {sparklineNode === null ? null : <div className="mt-0.5">{sparklineNode}</div>}
      {sub === undefined ? null : (
        <span className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground">{sub}</span>
      )}
    </>
  );

  if (onClick === undefined) {
    return (
      <div data-slot="stat-grid-item" className={shell}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-slot="stat-grid-item"
      onClick={onClick}
      className={cn(
        shell,
        // text-left/w-full: button UA styles centre content and shrink-wrap.
        // Hover/press only on the interactive shell so static tiles stay quiet.
        "w-full cursor-pointer text-left transition-colors hover:border-primary-emphasis active:brightness-95",
      )}
    >
      {body}
    </button>
  );
}
