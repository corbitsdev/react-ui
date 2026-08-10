import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type KindCardOption = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
};

export type KindCardGridProps = {
  readonly options: readonly KindCardOption[];
  readonly value?: string;
  readonly onChange?: (id: string) => void;
  /** Accessible name for the radiogroup. */
  readonly label: string;
  readonly columns?: 2 | 3 | 4;
  readonly className?: string;
};

const COLUMNS: Record<NonNullable<KindCardGridProps["columns"]>, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

/**
 * Selectable card grid for channel-kind, grant-effect, provider, and
 * workbench-type pickers. Each card is a real button with `aria-pressed`;
 * the group is labelled for assistive tech.
 */
export function KindCardGrid({
  options,
  value,
  onChange,
  label,
  columns = 2,
  className,
}: KindCardGridProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("grid gap-2", COLUMNS[columns], className)}
    >
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled === true}
            onClick={() => onChange?.(option.id)}
            className={cn(
              "flex flex-col gap-1 border px-3.5 py-3 text-left transition-colors ease-out",
              "hover:bg-muted active:brightness-95 disabled:pointer-events-none disabled:opacity-50",
              selected
                ? "border-primary-emphasis bg-primary/10"
                : "border-border bg-card",
            )}
          >
            {option.icon === undefined ? null : (
              <span className="mb-0.5 text-muted-foreground" aria-hidden>
                {option.icon}
              </span>
            )}
            <span className="text-sm font-semibold">{option.title}</span>
            {option.description === undefined ? null : (
              <span className="text-xs leading-snug text-muted-foreground">
                {option.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
