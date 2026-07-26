import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { Badge } from "@/registry/corbits/ui/badge";

export type ActorFacet = {
  readonly label: string;
  /** Zero values are shown, not hidden — "0 approvals" is a finding. */
  readonly values: readonly string[];
};

export type ActorSummaryProps = {
  readonly name: string;
  /** What they are — "Member", "Agent", "Service account". */
  readonly role?: string;
  /**
   * Headline numbers. Pre-formatted: this component does not know whether 1.4
   * is seconds, dollars or a ratio.
   */
  readonly stats?: readonly { readonly label: string; readonly value: string }[];
  /**
   * Attributes with several values each — permissions, teams, tools. Rendered
   * as chips, so a long grant list stays scannable instead of becoming a
   * comma-separated paragraph.
   */
  readonly facets?: readonly ActorFacet[];
  readonly actions?: ReactNode;
  readonly className?: string;
};

/** Initials from a name, at most two. Falls back to "?" for an empty name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part !== "");
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Who this is, at the top of their detail page: identity, headline numbers, and
 * the attributes that explain what they can do.
 *
 * The facets are a real `<dl>`. Grants, teams and tools are definitions of a
 * term — a screen reader announcing "Permissions: read, write, approve" as a
 * described list is the difference between an audit surface and a wall of
 * chips, and it is the same markup either way.
 *
 * The avatar is initials, not a fetched image. A detail header should not have
 * a network dependency for decoration, and initials never fail to load, never
 * flash, and never leak an identity through a third-party avatar service.
 * `aria-hidden`, because the name is right beside it.
 */
export function ActorSummary({ name, role, stats, facets, actions, className }: ActorSummaryProps) {
  return (
    <header className={cn("flex flex-col gap-4 rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
        >
          {initials(name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-base font-semibold">{name}</h2>
          {role === undefined ? null : <p className="text-xs text-muted-foreground">{role}</p>}
        </div>
        {actions === undefined ? null : <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {stats === undefined || stats.length === 0 ? null : (
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="text-lg leading-none font-semibold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {facets === undefined || facets.length === 0 ? null : (
        <dl className="flex flex-col gap-2">
          {facets.map((facet) => (
            <div key={facet.label} className="flex flex-wrap items-baseline gap-2">
              <dt className="text-xs font-medium text-muted-foreground">{facet.label}</dt>
              <dd className="flex flex-wrap gap-1">
                {facet.values.length === 0 ? (
                  <span className="text-xs text-muted-foreground">None</span>
                ) : (
                  facet.values.map((value) => (
                    <Badge key={value} tone="neutral">
                      {value}
                    </Badge>
                  ))
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
