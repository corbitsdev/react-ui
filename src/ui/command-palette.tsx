import { useEffect, useId, useMemo, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";

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

/**
 * Everything both presentations of the palette need: the query, the results,
 * and what a selection means. Neither surface knows what any of it represents
 * — matching, ranking and pagination source stay with the caller.
 */
export type CommandPaletteContentProps = {
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
};

export type CommandPaletteProps = CommandPaletteContentProps & {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly className?: string;
};

export type CommandPaletteInlineProps = CommandPaletteContentProps & {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /**
   * Rendered inside the field, ahead of the input, in both states — the
   * control the field morphs out of and back into. It stays mounted while
   * collapsed, which is what lets focus return to it on Escape.
   */
  readonly leading?: ReactNode;
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

type PaletteMachine = {
  readonly baseId: string;
  readonly groups: readonly CommandPaletteGroup[];
  readonly items: readonly CommandPaletteItem[];
  readonly activeId: string | undefined;
  readonly setActiveId: (id: string) => void;
  readonly onKeyDown: (event: ReactKeyboardEvent) => void;
  readonly select: (id: string) => void;
  readonly optionId: (id: string) => string;
  readonly listRef: RefObject<HTMLUListElement | null>;
};

/**
 * The half of the palette that has nothing to do with how it is presented:
 * the flattened result order, the keyboard driver over it, and the ids that
 * wire the input to the listbox. Shared so the dialog and the inline surface
 * can never drift into two different keyboard contracts.
 */
function usePaletteMachine(
  groups: readonly CommandPaletteGroup[],
  onSelect: (id: string) => void,
  onClose: () => void,
): PaletteMachine {
  const baseId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const items = useMemo(() => flatten(groups), [groups]);

  const select = (id: string) => {
    onSelect(id);
    onClose();
  };

  const navigation = useCommandPaletteNavigation({ items, onSelect: select, onClose });

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [navigation.activeId]);

  return {
    baseId,
    groups,
    items,
    activeId: navigation.activeId,
    setActiveId: navigation.setActiveId,
    onKeyDown: navigation.onKeyDown,
    select,
    optionId: (id: string) => `${baseId}-option-${id}`,
    listRef,
  };
}

function PaletteInput({
  machine,
  inputRef,
  query,
  onQueryChange,
  loading,
  placeholder,
  className,
}: {
  readonly machine: PaletteMachine;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly loading: boolean;
  readonly placeholder: string;
  readonly className: string;
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      role="combobox"
      data-slot="command-palette-input"
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder}
      aria-label="Search"
      aria-expanded
      aria-controls={`${machine.baseId}-list`}
      aria-activedescendant={machine.activeId === undefined ? undefined : machine.optionId(machine.activeId)}
      aria-autocomplete="list"
      aria-busy={loading}
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      className={className}
    />
  );
}

function PaletteResults({
  machine,
  query,
  loading,
  error,
  className,
}: {
  readonly machine: PaletteMachine;
  readonly query: string;
  readonly loading: boolean;
  readonly error: ReactNode;
  readonly className: string;
}) {
  const message = statusMessage(loading, error, query.trim().length > 0);
  return (
    <ul
      ref={machine.listRef}
      id={`${machine.baseId}-list`}
      role="listbox"
      aria-label="Results"
      className={className}
    >
      {machine.items.length === 0 ? (
        <li role="presentation" className="px-2 py-8 text-center text-sm text-muted-foreground">
          {message}
        </li>
      ) : (
        machine.groups.map((group) =>
          group.items.length === 0 ? null : (
            <li key={group.id} role="presentation">
              <p className="px-2 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                {group.heading}
              </p>
              <ul role="presentation">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    id={machine.optionId(item.id)}
                    role="option"
                    aria-selected={item.id === machine.activeId}
                    data-active={item.id === machine.activeId}
                    onPointerMove={() => machine.setActiveId(item.id)}
                    onClick={() => machine.select(item.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm",
                      item.id === machine.activeId && "bg-muted",
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
  );
}

function PaletteLoadMore({
  hasMore,
  onLoadMore,
  loading,
}: {
  readonly hasMore: boolean;
  readonly onLoadMore: (() => void) | undefined;
  readonly loading: boolean;
}) {
  if (!hasMore || onLoadMore === undefined) return null;
  return (
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
  );
}

function PaletteFooter({ footer }: { readonly footer: ReactNode }) {
  if (footer === undefined) return null;
  return (
    <div data-slot="command-palette-footer" className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
      {footer}
    </div>
  );
}

/**
 * The palette as a modal dialog: a search input over consumer-supplied,
 * pre-grouped results, centered over an overlay. Use it where search is a
 * destination the user goes to. Where search is a control that lives in the
 * chrome, reach for `CommandPaletteInline` instead — it is the same machine
 * without the overlay.
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
  const machine = usePaletteMachine(groups, onSelect, () => onOpenChange(false));

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-w-xl gap-0 p-0 [&_[aria-label=Close]]:hidden", className)}
        onKeyDown={machine.onKeyDown}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          {inputAccessory === undefined ? null : (
            <div data-slot="command-palette-input-accessory" className="shrink-0">
              {inputAccessory}
            </div>
          )}
          <PaletteInput
            machine={machine}
            inputRef={inputRef}
            query={query}
            onQueryChange={onQueryChange}
            loading={loading}
            placeholder={placeholder}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <PaletteResults
          machine={machine}
          query={query}
          loading={loading}
          error={error}
          className="max-h-96 min-h-0 flex-1 overflow-y-auto p-2"
        />

        <PaletteLoadMore hasMore={hasMore} onLoadMore={onLoadMore} loading={loading} />
        <PaletteFooter footer={footer} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The palette as an inline, non-modal surface: the field sits wherever the
 * consumer puts it — a top bar, a toolbar — and its results hang directly
 * beneath, anchored to that field. No overlay, no focus trap, so the page
 * behind stays visible and legible while the user searches it.
 *
 * This is the shape a magnifier that *morphs in place* needs. A dialog cannot
 * be morphed into: it is somewhere else on the screen, over everything, and
 * the control it opened from is behind an overlay. Because the field is the
 * real input here, the collapsed control and the expanded bar are one
 * continuous element rather than a button and a separate window.
 *
 * The `leading` slot stays mounted in both states — collapsing removes the
 * input and the panel, never the control focus has to return to. Sizing and
 * the morph itself are the consumer's: this component paints the panel and
 * owns the keyboard and dismissal contract, and exposes `data-slot`
 * hooks (`command-palette-inline`, `-field`, `-results`) for the rest.
 */
export function CommandPaletteInline({
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
  leading,
  footer,
  className,
}: CommandPaletteInlineProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const machine = usePaletteMachine(groups, onSelect, () => onOpenChange(false));

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Without an overlay to catch it, a press anywhere else is the dismissal.
  // `pointerdown` rather than `click` so the field collapses as the user
  // reaches for whatever they meant to press, not after it has been pressed.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent | MouseEvent) {
      if (rootRef.current?.contains(event.target as Node) === true) return;
      onOpenChange(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} data-slot="command-palette-inline" data-open={open} className={cn("relative", className)}>
      <div data-slot="command-palette-inline-field" onKeyDown={machine.onKeyDown}>
        {leading}
        {open ? (
          <>
            {inputAccessory === undefined ? null : (
              <div data-slot="command-palette-input-accessory" className="shrink-0">
                {inputAccessory}
              </div>
            )}
            <PaletteInput
              machine={machine}
              inputRef={inputRef}
              query={query}
              onQueryChange={onQueryChange}
              loading={loading}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </>
        ) : null}
      </div>

      {open ? (
        <div
          data-slot="command-palette-inline-results"
          onKeyDown={machine.onKeyDown}
          className="absolute top-full right-0 z-50 mt-1 flex w-96 max-w-[80vw] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <PaletteResults
            machine={machine}
            query={query}
            loading={loading}
            error={error}
            className="max-h-96 min-h-0 flex-1 overflow-y-auto p-2"
          />
          <PaletteLoadMore hasMore={hasMore} onLoadMore={onLoadMore} loading={loading} />
          <PaletteFooter footer={footer} />
        </div>
      ) : null}
    </div>
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
