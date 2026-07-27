import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";
import { formatRelativeTime } from "../lib/relative-time.js";
import { sortNowItems, type NowItem } from "../lib/now-item.js";
import { Badge } from "./badge.js";

export type NowSectionProps = {
  /** How many things are asking for attention — drives the count sentence. */
  readonly count: number;
  /**
   * Tucks the body away and leaves a one-line summary. For when a detail pane
   * is open and the vertical space is worth more to it than to the strip.
   */
  readonly collapsed?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * The attention band at the top of the inbox. Its own container rather than the
 * generic `Section` because it says something `Section` cannot: an eyebrow that
 * marks urgency, a count in words, and a collapsed mode.
 *
 * Collapsing keeps the body mounted (so it can animate, and so anchors into it
 * still resolve) but marks it `inert` — `aria-hidden` alone would hide it from
 * a screen reader while leaving every card in the tab order.
 */
export function NowSection({ count, collapsed = false, children, className }: NowSectionProps) {
  const countLabel = count === 1 ? "1 thing needs you" : `${count} things need you`;

  return (
    <section
      data-slot="now-section"
      aria-label="Now"
      className={cn("border-b border-border bg-card px-4 py-3 text-card-foreground", className)}
    >
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-emphasis uppercase">Now</p>
          <p className="text-sm font-semibold tracking-tight">{count === 0 ? "Clear" : countLabel}</p>
        </div>
      </div>

      <div
        className={cn("grid transition-[grid-template-rows,opacity] duration-300", collapsed ? "grid-rows-[0fr] opacity-0" : "mt-3 grid-rows-[1fr] opacity-100")}
        {...(collapsed ? { inert: true } : {})}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}

export type NowCardsProps = {
  readonly items: readonly NowItem[];
  /** Cap on cards shown. The rest belong in the queue below, not here. */
  readonly limit?: number;
  readonly selectedId?: string | null;
  readonly now?: number;
  readonly className?: string;
};

/**
 * The highest-attention items as cards. Ordering is not the caller's problem —
 * the list is sorted here by priority then recency, so two surfaces fed the
 * same items always agree on what is most urgent.
 */
export function NowCards({ items, limit = 3, selectedId = null, now, className }: NowCardsProps) {
  const shown = sortNowItems(items).slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <ul aria-label="Needs you now" className={cn("grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {shown.map((item, index) => {
        const selected = item.id === selectedId;
        const body = (
          <>
            <div className="flex items-center gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary-emphasis">
                {index + 1}
              </span>
              <Badge tone={item.priority === "now" ? "accent" : "neutral"}>{item.classification}</Badge>
              {item.type === "mail" && !item.read ? (
                <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" role="img" />
              ) : null}
              <time dateTime={item.when} className="ml-auto shrink-0 text-xs text-muted-foreground">
                {formatRelativeTime(item.when, now)}
              </time>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-snug font-semibold">{item.title}</p>
            {item.summary === undefined ? null : (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
            )}
            <p className="mt-2.5 text-xs font-medium text-primary-emphasis">
              {item.type === "gate" ? `${item.action} →` : `From ${item.from}`}
            </p>
          </>
        );

        const shell = cn(
          "block h-full w-full rounded-lg border p-3.5 text-left transition-colors",
          selected ? "border-primary-emphasis bg-primary/10" : "border-border bg-background hover:bg-muted",
        );

        return (
          <li key={`${item.type}:${item.id}`}>
            {item.href === undefined ? (
              <div aria-current={selected ? "true" : undefined} className={shell}>
                {body}
              </div>
            ) : (
              <a href={item.href} aria-current={selected ? "true" : undefined} className={shell}>
                {body}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
