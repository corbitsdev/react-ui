import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils.js";

export type SortDirection = "asc" | "desc";

export const ariaSort = (direction: SortDirection | null) =>
  direction === null
    ? undefined
    : direction === "asc"
      ? "ascending"
      : "descending";

/**
 * The control inside a sortable column header. Inactive columns show a neutral
 * affordance so it is discoverable which columns can be sorted at all; the
 * `<th>` around it carries `aria-sort`, since a caret is invisible to a screen
 * reader.
 */
export function SortHeaderButton({
  direction,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  readonly direction: SortDirection | null;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground",
        direction === null && "text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {direction === null ? (
        <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />
      ) : direction === "asc" ? (
        <ChevronUp className="size-3.5" aria-hidden />
      ) : (
        <ChevronDown className="size-3.5" aria-hidden />
      )}
    </button>
  );
}
