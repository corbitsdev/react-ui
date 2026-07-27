import { cn } from "../lib/utils.js";
import { AnimatedNumber } from "./animated-number.js";
import { Button } from "./button.js";

export type PaginationProps = {
  /** 1-based. */
  readonly page: number;
  readonly totalPages: number;
  /** Total rows across all pages, for the legend. */
  readonly total?: number;
  readonly onPageChange: (page: number) => void;
  readonly className?: string;
};

/**
 * Prev/Next around a "Page X of Y" legend, for numbered server-side paging.
 *
 * This is not what the `DataPort` gives you. The port's
 * `hasNextPage`/`fetchNextPage` drive an append-as-you-go "Load more", which is
 * what the queue, thread list and schedule list use. Numbered pages are a
 * different thing — you can go back, and you can tell how much there is — and
 * they suit a table you are working through rather than a feed you are reading.
 * Reach for this when the user needs to know where they are.
 *
 * Renders nothing at one page or fewer, so a list that fits shows no chrome.
 *
 * The legend is an `aria-live` region: after pressing Next, focus stays on the
 * button, and without this nothing tells a screen-reader user the page changed.
 */
export function Pagination({ page, totalPages, total, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <p aria-live="polite">
        Page <AnimatedNumber value={page} className="text-foreground" /> of{" "}
        <AnimatedNumber value={totalPages} className="text-foreground" />
        {total === undefined ? null : (
          <>
            {" · "}
            <AnimatedNumber value={total} /> total
          </>
        )}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
