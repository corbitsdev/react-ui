"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { Button } from "@/registry/corbits/ui/button";

export type FilterOption = {
  readonly value: string;
  readonly label: string;
};

export type FilterSpec = {
  readonly id: string;
  readonly label: string;
  readonly options: readonly FilterOption[];
  /** The selected option's value, or `null` for "no filter". */
  readonly value: string | null;
  /** The wording for the unfiltered choice — "All kinds", "Everyone". */
  readonly anyLabel: string;
};

export type FilterBarProps = {
  readonly filters: readonly FilterSpec[];
  readonly onChange: (id: string, value: string | null) => void;
  /** Rendered at the end — a time range, an export button. */
  readonly children?: ReactNode;
  readonly className?: string;
};

/**
 * A row of filters, and — the part that is usually missing — a readable summary
 * of which ones are on.
 *
 * The chips are not decoration. A `<select>` collapsed to its chosen value is
 * easy to scroll past, and "why is this dashboard empty" is almost always a
 * filter someone forgot they set three tabs ago. The chips say what is applied
 * in a sentence-shaped row, each one removable, with a single "Clear all"
 * beside them.
 *
 * Native `<select>`, not a custom listbox. A hand-built one has to re-implement
 * type-ahead, arrow keys, page-up, the mobile wheel and the platform's own
 * rendering, and the usual result is a control that looks better and works
 * worse. When a filter genuinely needs search or multi-select, that is a
 * different control — reach for the command palette, not a bigger select.
 *
 * Filter state lives with the caller because it almost always also lives in the
 * URL. Owning it here would mean every consumer fights the component to make
 * their filters linkable.
 */
export function FilterBar({ filters, onChange, children, className }: FilterBarProps) {
  const active = filters.filter((filter) => filter.value !== null);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((filter) => (
          <label key={filter.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {filter.label}
            <select
              value={filter.value ?? ""}
              onChange={(event) => onChange(filter.id, event.target.value === "" ? null : event.target.value)}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground"
            >
              <option value="">{filter.anyLabel}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {children}
      </div>

      {active.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {active.map((filter) => {
            const option = filter.options.find((candidate) => candidate.value === filter.value);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onChange(filter.id, null)}
                // The whole chip is the remove control, and its accessible name
                // says so — an "×" alone is announced as "times".
                aria-label={`Remove filter ${filter.label}: ${option?.label ?? filter.value}`}
                className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="font-medium text-foreground">{filter.label}</span>
                {option?.label ?? filter.value}
                <X className="size-3" aria-hidden />
              </button>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              for (const filter of active) onChange(filter.id, null);
            }}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
