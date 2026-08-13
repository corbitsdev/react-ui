import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type FilterChipProps = {
  readonly selected?: boolean;
  readonly onClick?: () => void;
  readonly children: ReactNode;
  readonly count?: number;
  readonly className?: string;
};

/**
 * A toggleable filter pill — a category, a tag, a facet value. A real
 * `<button>` with `aria-pressed`, not a styled label, so the selection state
 * is announced and the control is reachable with Space/Enter alone.
 */
export function FilterChip({ selected = false, onClick, children, count, className }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        // active:brightness-95 mirrors Button's press state: it lands on
        // pointer-down, so it sits outside transition-colors.
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ease-out active:brightness-95",
        selected
          ? "border-border bg-card text-foreground shadow-sm"
          : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {children}
      {count === undefined ? null : (
        <span className={cn("text-[10.5px] font-bold", selected ? "text-primary-emphasis" : "text-muted-foreground")}>
          {count}
        </span>
      )}
    </button>
  );
}
