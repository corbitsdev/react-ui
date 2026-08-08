import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type LibraryPageHeaderProps = {
  readonly title: string;
  /** `lg` (21px, default) for catalog pages; `sm` (17px) for denser lists. */
  readonly titleSize?: "sm" | "lg";
  /** When provided, renders an "{count} items" chip beside the title. */
  readonly count?: number;
  /** One line under the title — what this library holds. */
  readonly subtitle?: string;
  /** Trailing controls: search, view toggle, action buttons. */
  readonly children?: ReactNode;
  readonly className?: string;
};

const TITLE_CLASS = {
  lg: "text-[21px] font-semibold tracking-[-0.02em]",
  sm: "text-[17px] font-semibold tracking-[-0.01em]",
} as const;

/**
 * The header row every library page shares: title, item count, then trailing
 * controls after a flexible spacer. The spacer is a real element rather than
 * `justify-between` so a `LibrarySearchInput` can expand leftward over it
 * without shifting its neighbours.
 */
export function LibraryPageHeader({
  title,
  titleSize = "lg",
  count,
  subtitle,
  children,
  className,
}: LibraryPageHeaderProps) {
  return (
    <div
      data-slot="library-page-header"
      className={cn("flex min-w-0 flex-wrap items-center gap-[14px] px-4 pt-5 pb-[14px] sm:px-7", className)}
    >
      <div className="flex min-w-0 shrink-0 flex-col gap-0.5">
        <h1 className={TITLE_CLASS[titleSize]}>{title}</h1>
        {subtitle === undefined || subtitle === "" ? null : (
          <p className="truncate text-[12px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {count === undefined ? null : (
        <span className="shrink-0 rounded-md bg-muted px-[9px] py-[3px] font-mono text-[12px] text-muted-foreground">
          {count} items
        </span>
      )}
      <div className="min-w-2 flex-1" />
      {children}
    </div>
  );
}
