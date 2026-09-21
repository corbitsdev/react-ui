import { useId, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import { useCommandPaletteNavigation } from "../hooks/use-command-palette-navigation.js";
import { cn } from "../lib/utils.js";
import { Badge } from "./badge.js";
import { EmptyState } from "./empty-state.js";
import { Input } from "./input.js";

export type ToolPickerStatus = "pending" | "disabled";

/**
 * One entry in the caller-supplied catalog — a tool the picker can list,
 * search and select. Shaped like a `DataTable` row: plain data in, no
 * behaviour, so the same catalog can back a table elsewhere without a
 * reshape.
 */
export type ToolPickerItem = {
  readonly id: string;
  readonly name: string;
  /** Groups the list — the picker's one piece of structure over the flat catalog. */
  readonly package: string;
  readonly description?: string;
  /** Absent means available. `disabled` blocks selection; `pending` allows it. */
  readonly status?: ToolPickerStatus;
};

export type ToolPickerProps = {
  readonly items: readonly ToolPickerItem[];
  /** Selected ids. A single-select picker still carries at most one entry here. */
  readonly value: readonly string[];
  readonly onChange: (value: readonly string[]) => void;
  /** Defaults to single-select: a new pick replaces the current one. */
  readonly multiple?: boolean;
  /** First load — the catalog has not arrived yet, distinct from an empty catalog. */
  readonly loading?: boolean;
  /** Shown when the catalog itself is empty. Failed searches use a separate default. */
  readonly empty?: ReactNode;
  readonly searchPlaceholder?: string;
  readonly className?: string;
};

const STATUS_LABEL: Record<ToolPickerStatus, string> = {
  pending: "Pending",
  disabled: "Disabled",
};

function matches(item: ToolPickerItem, query: string): boolean {
  if (query.length === 0) return true;
  const haystack = `${item.name} ${item.package} ${item.description ?? ""}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function groupByPackage(items: readonly ToolPickerItem[]): { readonly id: string; readonly items: ToolPickerItem[] }[] {
  const groups = new Map<string, ToolPickerItem[]>();
  for (const item of items) {
    const group = groups.get(item.package);
    if (group === undefined) groups.set(item.package, [item]);
    else group.push(item);
  }
  return [...groups.entries()].map(([id, groupItems]) => ({ id, items: groupItems }));
}

/** Visible group title: a display name if the catalog already sent one, else a humanized slug. */
function groupHeading(id: string): string {
  if (/[A-Z]/.test(id) || /\s/.test(id)) return id;
  return id
    .split(/[-_./]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Browse, search and select tools from a caller-supplied catalog, grouped by
 * package. Controlled like a form field (`value`/`onChange`) rather than
 * owning selection itself — a caller wiring this into a bigger form needs
 * the same value it would get from any other control.
 *
 * Disabled items stay in the list rather than disappearing — a tool a
 * caller cannot pick right now is still information ("already attached
 * elsewhere", "needs a credential") that vanishing would hide.
 */
export function ToolPicker({
  items,
  value,
  onChange,
  multiple = false,
  loading = false,
  empty,
  searchPlaceholder = "Search tools…",
  className,
}: ToolPickerProps) {
  const baseId = useId();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => items.filter((item) => matches(item, query)), [items, query]);
  const groups = useMemo(() => groupByPackage(filtered), [filtered]);
  const selectableIds = useMemo(() => new Set(value), [value]);

  const toggle = (item: ToolPickerItem) => {
    if (item.status === "disabled") return;
    const isSelected = selectableIds.has(item.id);
    if (!multiple) {
      onChange(isSelected ? [] : [item.id]);
      return;
    }
    onChange(isSelected ? value.filter((id) => id !== item.id) : [...value, item.id]);
  };

  const navigation = useCommandPaletteNavigation({
    items: filtered,
    onSelect: (id) => {
      const item = filtered.find((candidate) => candidate.id === id);
      if (item !== undefined) toggle(item);
    },
    onClose: () => {
      /* Escape is handled below so an empty query does not swallow the key. */
    },
  });

  const optionId = (id: string) => `${baseId}-option-${id}`;

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape") {
      if (query.length > 0) {
        event.preventDefault();
        setQuery("");
      }
      return;
    }
    navigation.onKeyDown(event);
  };

  const emptyCatalog = items.length === 0;
  const noMatches = !emptyCatalog && filtered.length === 0;

  return (
    <div data-slot="tool-picker" className={cn("flex min-h-0 flex-col gap-2", className)}>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={searchPlaceholder}
        aria-label="Search tools"
        role="combobox"
        aria-expanded
        aria-controls={`${baseId}-list`}
        aria-activedescendant={navigation.activeId === undefined ? undefined : optionId(navigation.activeId)}
        autoComplete="off"
      />

      <div
        id={`${baseId}-list`}
        role="listbox"
        aria-label="Tools"
        aria-multiselectable={multiple}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto"
      >
        {loading ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : emptyCatalog ? (
          (empty ?? <EmptyState title="No tools" description="Nothing in the catalog yet." />)
        ) : noMatches ? (
          <EmptyState title="No tools match" description="Try a different search." />
        ) : (
          groups.map((group) => (
            <div key={group.id} role="presentation" className="flex flex-col gap-1">
              <p className="px-2 text-[11px] font-semibold text-muted-foreground">
                {groupHeading(group.id)}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <ToolPickerOption
                    key={item.id}
                    id={optionId(item.id)}
                    item={item}
                    selected={selectableIds.has(item.id)}
                    active={navigation.activeId === item.id}
                    onSelect={() => toggle(item)}
                    onPointerMove={() => navigation.setActiveId(item.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ToolPickerOption({
  id,
  item,
  selected,
  active,
  onSelect,
  onPointerMove,
}: {
  readonly id: string;
  readonly item: ToolPickerItem;
  readonly selected: boolean;
  readonly active: boolean;
  readonly onSelect: () => void;
  readonly onPointerMove: () => void;
}) {
  const disabled = item.status === "disabled";
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      data-active={active}
      onPointerMove={disabled ? undefined : onPointerMove}
      onClick={disabled ? undefined : onSelect}
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border px-3.5 py-3 text-left transition-colors ease-out",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted",
        selected ? "border-primary-emphasis bg-primary/10" : "border-border bg-card",
        active && !disabled && "bg-muted",
      )}
    >
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold">{item.name}</span>
        {item.status === undefined ? null : <Badge tone={item.status === "pending" ? "accent" : "neutral"}>{STATUS_LABEL[item.status]}</Badge>}
      </span>
      {item.description === undefined ? null : (
        <span className="text-xs leading-snug text-muted-foreground">{item.description}</span>
      )}
    </div>
  );
}
