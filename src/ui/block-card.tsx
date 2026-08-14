import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type BlockCardProps = {
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * The generative-UI block frame: a bordered, square-cornered card with a
 * pulse-dot header. Zero radius is deliberate — it is what separates a
 * generated block from the theme's otherwise-rounded surfaces, so a reader
 * can tell "the agent made this" at a glance. Lifted out of a consumer app
 * unchanged; see `RiskBadge` below for the tone it pairs with inside
 * `children`.
 */
export function BlockCard({ title, children, className }: BlockCardProps) {
  return (
    <div data-slot="block-card" className={cn("overflow-hidden rounded-none border border-border bg-card", className)}>
      <div
        data-slot="block-card-header"
        className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-xs font-bold tracking-[0.02em] text-primary-emphasis"
      >
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-none bg-current [animation:corbits-block-pulse_1.6s_ease_infinite]"
        />
        <span data-slot="block-card-title">{title}</span>
      </div>
      <div data-slot="block-card-body" className="p-4">
        {children}
      </div>
    </div>
  );
}

export type RiskLevel = "low" | "medium" | "high";

export type RiskBadgeProps = {
  readonly level: RiskLevel;
  readonly label: string;
  readonly note?: string;
  readonly className?: string;
};

const RISK_TONE_CLASS: Record<RiskLevel, string> = {
  low: "text-muted-foreground",
  medium: "text-warn",
  high: "text-destructive",
};

/**
 * A risk callout for a block whose action carries consequence — approve this
 * order cancellation, run this migration. `level` drives colour only; the
 * `label` is what actually says what the risk is, so the badge is never a
 * bare colour dot.
 */
export function RiskBadge({ level, label, note, className }: RiskBadgeProps) {
  return (
    <span
      data-slot="risk-badge"
      data-risk={level}
      className={cn("inline-flex items-center gap-1.5 text-xs font-bold [&_svg]:size-3.5", RISK_TONE_CLASS[level], className)}
    >
      <TriangleAlert aria-hidden />
      <span>{label}</span>
      {note === undefined ? null : <span className="font-medium text-muted-foreground">{note}</span>}
    </span>
  );
}
