"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { EmptyState } from "@/registry/corbits/ui/empty-state";

export type ListDetailProps = {
  /** The index: a catalog grid, a table, a list of skills or tools. */
  readonly list: ReactNode;
  /** The open item. `null` shows the placeholder instead. */
  readonly detail: ReactNode | null;
  /** Clears the selection. Required — see the note about the back control. */
  readonly onCloseDetail: () => void;
  /** Shown on wide screens when nothing is selected. */
  readonly placeholder?: ReactNode;
  readonly detailLabel?: string;
  readonly className?: string;
};

/**
 * Index on the left, the open item on the right.
 *
 * Two panes above `lg`, one below it. On a narrow screen the detail *replaces*
 * the list rather than sitting under it: a phone-width column showing both
 * means the user opens something and sees no change without scrolling.
 *
 * That swap is why `onCloseDetail` is required rather than optional. Once the
 * list is hidden, the back control is the only way out — a caller who omitted
 * it would ship a dead end on mobile, so the type does not let them.
 *
 * Both panes scroll independently, so reading a long detail does not scroll the
 * list out from under the selection.
 */
export function ListDetail({
  list,
  detail,
  onCloseDetail,
  placeholder,
  detailLabel = "Details",
  className,
}: ListDetailProps) {
  const open = detail !== null;

  return (
    <div className={cn("flex min-h-0 flex-1 gap-6", className)}>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto lg:max-w-md lg:shrink-0 lg:border-r lg:border-border lg:pr-6",
          // Hidden, not merely visually stacked: leaving it in the tree on
          // mobile would keep every row in the tab order behind the detail.
          open && "hidden lg:block",
        )}
      >
        {list}
      </div>

      <section
        aria-label={detailLabel}
        className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto", !open && "hidden lg:block")}
      >
        {open ? (
          <>
            <button
              type="button"
              onClick={onCloseDetail}
              className="mb-3 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to list
            </button>
            {detail}
          </>
        ) : (
          (placeholder ?? <EmptyState title="Nothing selected" description="Pick something from the list." />)
        )}
      </section>
    </div>
  );
}
