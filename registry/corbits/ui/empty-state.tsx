import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";

export type EmptyStateProps = {
  /** What is not here, as a statement: "No workflows yet". */
  readonly title: string;
  /** Why, or what to do about it. One or two sentences. */
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  /** The way out — a create button, a "clear filters" control. */
  readonly action?: ReactNode;
  readonly className?: string;
};

/**
 * Nothing to show, said properly.
 *
 * A shared component because every list otherwise grows its own centred stack
 * of icon-title-body, and they end up differently spaced and differently
 * worded. Three surfaces had already written this inline before it existed.
 *
 * The icon is decorative and hidden from assistive tech: it never carries
 * meaning the title does not already carry, and a screen reader announcing
 * "inbox icon" before "You're all caught up" is noise.
 *
 * Not a `role="status"`. An empty state is the rendered result of a finished
 * load, not an announcement — the surface that was loading owns that.
 */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}
    >
      {icon === undefined ? null : (
        <span
          aria-hidden
          className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5"
        >
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description === undefined ? null : (
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
