import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";
import { Sparkline } from "./sparkline.js";

export type StatDelta = {
  /** Signed change, already computed. `0` renders as "no change". */
  readonly value: number;
  /** What it is measured against — "vs last week". */
  readonly period: string;
  /**
   * Whether an increase is a good thing. Error rate and cost say `false`;
   * revenue and uptime say `true`. There is no safe default, which is why this
   * is required — guessing paints a rising error rate green.
   */
  readonly upIsGood: boolean;
  readonly format?: (value: number) => string;
};

export type StatTileProps = {
  /** Sentence case, no trailing colon. */
  readonly label: string;
  /** Pre-formatted. The tile does not know your units. */
  readonly value: ReactNode;
  readonly delta?: StatDelta;
  /** A short trend behind the number — twelve points or so. */
  readonly trend?: readonly number[];
  readonly className?: string;
};

/**
 * One number, said properly: what it is, what it is now, and which way it is
 * going.
 *
 * The direction is carried by an arrow *and* by words, never by colour alone. A
 * green number and a red number are the same number to a substantial minority of
 * readers, and "which way is this going" is the entire content of a delta.
 *
 * `upIsGood` is required rather than defaulted because the mapping from
 * direction to sentiment is a property of the metric, not of the component. The
 * common default — up is green — is wrong for every cost, latency and failure
 * metric on a typical dashboard.
 *
 * The value uses the font's proportional figures, not `tabular-nums`. Tabular
 * gives every digit the width of a zero, which at display size makes `121` look
 * like it has fallen apart; tabular belongs in columns that must align, which a
 * tile is not.
 */
export function StatTile({ label, value, delta, trend, className }: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl leading-none font-semibold">{value}</p>
      {delta === undefined ? null : <Delta {...delta} />}
      {trend === undefined || trend.length < 2 ? null : (
        <Sparkline values={trend} summary={`${label} trend over the last ${trend.length} periods`} className="mt-1" />
      )}
    </div>
  );
}

function Delta({ value, period, upIsGood, format }: StatDelta) {
  const rendered = format === undefined ? `${value > 0 ? "+" : ""}${value.toLocaleString()}` : format(value);
  const direction = value === 0 ? "flat" : value > 0 ? "up" : "down";
  const Icon = direction === "flat" ? Minus : direction === "up" ? ArrowUp : ArrowDown;
  const good = direction === "flat" ? null : (direction === "up") === upIsGood;

  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs",
        good === null ? "text-muted-foreground" : good ? "text-primary-emphasis" : "text-destructive",
      )}
    >
      <Icon className="size-3" aria-hidden />
      <span className="tabular-nums">{rendered}</span>
      <span className="text-muted-foreground">{period}</span>
      {/* The direction in words, for anyone the arrow and the colour do not
          reach. Not visible: the arrow already says it on screen. */}
      <span className="sr-only">
        {direction === "flat" ? "no change" : direction === "up" ? "up" : "down"}
        {good === null ? "" : good ? ", better" : ", worse"}
      </span>
    </p>
  );
}

/**
 * A row of tiles that reflows instead of scrolling.
 *
 * `auto-fit` with a minimum, not a fixed column count: a KPI row is exactly the
 * thing that gets four tiles on one dashboard and seven on the next, and a
 * hard-coded `grid-cols-4` turns the seventh into a lonely orphan on its own row.
 */
export function StatGrid({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn("grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3", className)}>{children}</div>
  );
}
