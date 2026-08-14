import { useEffect, useId, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";
import { useCommandPaletteNavigation } from "../hooks/use-command-palette-navigation.js";
import { Dialog, DialogContent, DialogTitle } from "./dialog.js";

/**
 * One result row. `title` (and optional `subtitle`) are the only text ever
 * rendered — a consumer that hands in a raw identifier as the title has
 * nothing else to blame, but the component itself never falls back to `id`
 * for display.
 */
export type CommandPaletteItem = {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly icon?: ReactNode;
};

/** A labelled cluster of results — a static command section, an entity kind, whatever the consumer's data shape is. */
export type CommandPaletteGroup = {
  readonly id: string;
  readonly heading: string;
  readonly items: readonly CommandPaletteItem[];
};

export type CommandPaletteProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  /** Pre-grouped, pre-ordered results. Ranking and matching are the consumer's job. */
  readonly groups: readonly CommandPaletteGroup[];
  readonly onSelect: (id: string) => void;
  readonly loading?: boolean;
  /** A message to show in place of results; presence alone marks the errored state. */
  readonly error?: ReactNode;
  readonly hasMore?: boolean;
  readonly onLoadMore?: () => void;
  readonly placeholder?: string;
  /** Leading content in the input row — a scope chip, a source badge. Sits before the input, inside the same row. */
  readonly inputAccessory?: ReactNode;
  /** A legend or hint strip pinned under the results, e.g. keyboard shortcut hints. */
  readonly footer?: ReactNode;
  readonly className?: string;
};

function flatten(groups: readonly CommandPaletteGroup[]): CommandPaletteItem[] {
  return groups.flatMap((group) => group.items);
}

function statusMessage(loading: boolean, error: ReactNode, hasQuery: boolean): ReactNode {
  if (error !== undefined) return error;
  if (loading) return "Searching…";
  if (hasQuery) return "No matches found.";
  return "Type to search.";
}

/**
 * The palette: a dialog whose content is a search input over consumer-supplied,
 * pre-grouped results. It knows nothing about what those results represent —
 * matching, ranking, pagination source and what a selection *means* all live
 * with the caller. This file owns the overlay, the keyboard contract and the
 * grouped/loading/empty/error/load-more states that every such surface needs.
 *
 * Motion is the dialog's own opacity-only fade (`Dialog`'s `corbits-fade-in`/
 * `corbits-fade-out` keyframes), which already collapses under
 * `prefers-reduced-motion` at the theme level — a palette opened many times a
 * day earns no scale or position animation on top of that.
 */
export function CommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  groups,
  onSelect,
  loading = false,
  error,
  hasMore = false,
  onLoadMore,
  placeholder = "Search or jump to…",
  inputAccessory,
  footer,
  className,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const items = useMemo(() => flatten(groups), [groups]);

  const onClose = () => onOpenChange(false);
  const navigation = useCommandPaletteNavigation({
    items,
    onSelect: (id) => {
      onSelect(id);
      onClose();
    },
    onClose,
  });

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [navigation.activeId]);

  const optionId = (id: string) => `${baseId}-option-${id}`;
  const trimmed = query.trim();
  const message = statusMessage(loading, error, trimmed.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-w-xl gap-0 p-0 [&_[aria-label=Close]]:hidden", className)}
        onKeyDown={navigation.onKeyDown}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          {inputAccessory === undefined ? null : (
            <div data-slot="command-palette-input-accessory" className="shrink-0">
              {inputAccessory}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            aria-label="Search"
            aria-expanded
            aria-controls={`${baseId}-list`}
            aria-activedescendant={navigation.activeId === undefined ? undefined : optionId(navigation.activeId)}
            aria-autocomplete="list"
            aria-busy={loading}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <ul
          ref={listRef}
          id={`${baseId}-list`}
          role="listbox"
          aria-label="Results"
          className="max-h-96 min-h-0 flex-1 overflow-y-auto p-2"
        >
          {items.length === 0 ? (
            <li role="presentation" className="px-2 py-8 text-center text-sm text-muted-foreground">
              {message}
            </li>
          ) : (
            groups.map((group) =>
              group.items.length === 0 ? null : (
                <li key={group.id} role="presentation">
                  <p className="px-2 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                    {group.heading}
                  </p>
                  <ul role="presentation">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        id={optionId(item.id)}
                        role="option"
                        aria-selected={item.id === navigation.activeId}
                        data-active={item.id === navigation.activeId}
                        onPointerMove={() => navigation.setActiveId(item.id)}
                        onClick={() => {
                          onSelect(item.id);
                          onClose();
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm",
                          item.id === navigation.activeId && "bg-muted",
                        )}
                      >
                        {item.icon === undefined ? null : (
                          <span className="grid size-4 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4" aria-hidden>
                            {item.icon}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{item.title}</span>
                          {item.subtitle === undefined ? null : (
                            <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ),
            )
          )}
        </ul>

        {hasMore && onLoadMore ? (
          <div className="border-t border-border p-2">
            <button
              type="button"
              data-slot="command-palette-load-more"
              onClick={onLoadMore}
              disabled={loading}
              className="w-full rounded-md px-2.5 py-2 text-center text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}

        {footer === undefined ? null : (
          <div data-slot="command-palette-footer" className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Binds ⌘K / Ctrl-K to a toggle.
 *
 * A hook and not built into the palette, because plenty of apps already own
 * their global key handling and a second listener fighting theirs is worse
 * than no listener at all. It ignores repeats from a held key and lets the
 * browser keep its own ⌘K where the user is typing into a text field —
 * stealing it there is how a palette becomes the thing that eats your search
 * box.
 */
export function useCommandShortcut(onToggle: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable === true || /^(input|textarea|select)$/i.test(target?.tagName ?? "")) return;
      event.preventDefault();
      onToggle();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onToggle, enabled]);
}
