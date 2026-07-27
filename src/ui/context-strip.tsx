import { ExternalLink, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

/**
 * What the app is currently "on" — the artifact, run, thread or record the next
 * action will apply to.
 *
 * `kind` is a free string, not a union of the host's entity types: this file is
 * copied into apps whose entity vocabularies differ, and a union here would be
 * the first thing every consumer had to edit. The label the user reads is
 * whatever the host passes.
 */
export type ContextRef = {
  readonly id: string;
  /** Short type label shown before the name, e.g. "Artifact". */
  readonly kind: string;
  readonly label: string;
  /** Where the context lives. Without it the strip renders as static text. */
  readonly href?: string;
  /** Leaves the app. Opens in a new tab, and says so to a screen reader. */
  readonly external?: boolean;
  readonly icon?: ReactNode;
};

/** The single active context, as one line in the top bar. */
export function ContextStrip({ context, className }: { context: ContextRef | null; className?: string }) {
  if (context === null) return null;

  const body = (
    <>
      {context.icon === undefined ? null : (
        <span className="grid size-3.5 shrink-0 place-items-center text-muted-foreground [&_svg]:size-3.5" aria-hidden>
          {context.icon}
        </span>
      )}
      <span className="shrink-0 text-xs text-muted-foreground">{context.kind}</span>
      <span className="min-w-0 truncate font-medium">{context.label}</span>
    </>
  );

  const shared = cn("flex min-w-0 max-w-[26rem] items-center gap-2 rounded-md px-2 py-1 text-sm", className);

  if (context.href === undefined) {
    return (
      <span data-slot="context-strip" className={shared}>
        {body}
      </span>
    );
  }
  return (
    <a
      data-slot="context-strip"
      href={context.href}
      title={context.label}
      className={cn(shared, "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground")}
    >
      {body}
    </a>
  );
}

/**
 * One typed entity reference, as a link chip. This is the "Related" affordance
 * on a detail surface — the same `ContextRef` the strip and the pills take,
 * because a reference to a thing is a reference to a thing whether you are
 * about to act on it, detach it, or follow it.
 *
 * An external ref opens in a new tab and says so in the accessible name; a
 * visual icon alone leaves a screen-reader user to discover it by surprise.
 */
export function RefChip({ item, className }: { item: ContextRef; className?: string }) {
  const label = `${item.kind}: ${item.label}`;
  const shell = cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-muted px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground",
    className,
  );

  if (item.href === undefined) {
    return (
      <span className={shell} title={label}>
        {label}
      </span>
    );
  }

  if (item.external === true) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={shell} title={label}>
        {label}
        <ExternalLink className="size-3" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <a href={item.href} className={shell} title={label}>
      {label}
    </a>
  );
}

/** The "Related" row on a detail surface. Renders nothing when there is nothing. */
export function RefChips({ items, className }: { items: readonly ContextRef[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul data-slot="ref-chips" aria-label="Related" className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <li key={`${item.kind}:${item.id}`}>
          <RefChip item={item} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The set of contexts attached to the next action, each removable. `onRemove`
 * is required — a pill you cannot detach should be a `ContextStrip`, not a
 * pill, and making the prop optional would quietly allow that mistake.
 */
export function ContextPills({
  items,
  onRemove,
  className,
}: {
  items: readonly ContextRef[];
  onRemove: (item: ContextRef) => void;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul data-slot="context-pills" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((item) => (
        <li
          key={`${item.kind}:${item.id}`}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted py-1 pr-1 pl-2 text-xs"
        >
          {item.icon === undefined ? null : (
            <span className="grid size-3 shrink-0 place-items-center text-muted-foreground [&_svg]:size-3" aria-hidden>
              {item.icon}
            </span>
          )}
          <span className="max-w-44 truncate" title={item.label}>
            <span className="text-muted-foreground">{item.kind}:</span> {item.label}
          </span>
          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item.kind} ${item.label}`}
            className="grid size-5 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="size-3" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
