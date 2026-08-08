import type { ReactNode } from "react";

import type { KindPickerItem } from "../lib/workflow-registry.js";
import { cn } from "../lib/utils.js";
import { Badge } from "./badge.js";
import { EmptyState } from "./empty-state.js";
import { FilterChip } from "./filter-chip.js";
import { Input } from "./input.js";

export type KindPickerCardProps = {
  readonly item: KindPickerItem;
  readonly selected?: boolean;
  readonly onSelect?: (item: KindPickerItem) => void;
  readonly className?: string;
};

/** One selectable kind card — a workflow kind to attach to a schedule or an
 * automation rule. A real `<button>` carrying `aria-selected`, not a `div`
 * with a click handler. */
export function KindPickerCard({ item, selected = false, onSelect, className }: KindPickerCardProps) {
  return (
    <button
      type="button"
      aria-selected={selected}
      onClick={() => onSelect?.(item)}
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border px-3.5 py-3 text-left transition-colors hover:bg-muted",
        selected ? "border-primary-emphasis bg-primary/10" : "border-border bg-card",
        className,
      )}
    >
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold">{item.label}</span>
        {item.alreadyOn === true ? <Badge tone="success">{item.alreadyOnLabel ?? "Already on"}</Badge> : null}
      </span>
      <span className="text-xs leading-snug text-muted-foreground">{item.description}</span>
      {item.categoryLabel === undefined ? null : (
        <span className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
          {item.categoryLabel}
        </span>
      )}
    </button>
  );
}

export type KindPickerCategory = {
  readonly id: string;
  readonly label: string;
};

export type KindPickerFiltersProps = {
  readonly categories: readonly KindPickerCategory[];
  readonly selectedCategory?: string;
  readonly onCategoryChange: (id: string) => void;
  readonly className?: string;
};

/** The category-facet row above a picker's results, split out so a caller
 * that has no categories can skip it entirely rather than render an empty
 * strip. */
export function KindPickerFilters({ categories, selectedCategory, onCategoryChange, className }: KindPickerFiltersProps) {
  if (categories.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {categories.map((category) => (
        <FilterChip key={category.id} selected={selectedCategory === category.id} onClick={() => onCategoryChange(category.id)}>
          {category.label}
        </FilterChip>
      ))}
    </div>
  );
}

export type KindPickerSearchProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly className?: string;
};

/** The picker's search box, standalone so a caller without search can leave
 * it out instead of wiring a no-op handler. */
export function KindPickerSearch({ value, onChange, placeholder = "Search workflows…", className }: KindPickerSearchProps) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label="Search workflow kinds"
      className={className}
    />
  );
}

export type KindPickerListProps = {
  readonly items: readonly KindPickerItem[];
  readonly selectedId?: string | null;
  readonly onSelect?: (item: KindPickerItem) => void;
  readonly empty?: ReactNode;
  readonly className?: string;
};

/** The results themselves — the one piece that actually needs the item
 * array, kept apart from search and category state so a caller can drive
 * filtering however it likes and still reuse this list. */
export function KindPickerList({ items, selectedId = null, onSelect, empty, className }: KindPickerListProps) {
  if (items.length === 0) {
    return empty ?? <EmptyState title="No workflow kinds match" description="Try a different search or category." />;
  }
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto", className)}>
      {items.map((item) => (
        <KindPickerCard key={item.id} item={item} selected={selectedId === item.id} onSelect={onSelect} />
      ))}
    </div>
  );
}
