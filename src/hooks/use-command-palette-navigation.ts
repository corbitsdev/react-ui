import { useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export type UseCommandPaletteNavigationOptions<TItem extends { readonly id: string }> = {
  /** The flat, visible result order — grouping is a display concern only. */
  readonly items: readonly TItem[];
  readonly onSelect: (id: string) => void;
  readonly onClose: () => void;
};

export type UseCommandPaletteNavigationResult = {
  readonly activeId: string | undefined;
  readonly setActiveId: (id: string) => void;
  readonly onKeyDown: (event: ReactKeyboardEvent) => void;
};

/**
 * Keyboard driver for a command palette: Up/Down move the selection and wrap
 * at the ends, Enter activates it, Escape closes without selecting.
 *
 * Selection is held as an id rather than an index so it survives the list
 * reordering that happens every keystroke (fresh search results land at
 * different positions) — an index would silently point at the wrong row.
 */
export function useCommandPaletteNavigation<TItem extends { readonly id: string }>({
  items,
  onSelect,
  onClose,
}: UseCommandPaletteNavigationOptions<TItem>): UseCommandPaletteNavigationResult {
  const [requestedId, setRequestedId] = useState<string | undefined>(undefined);

  const activeId = useMemo(() => {
    if (items.length === 0) return undefined;
    if (requestedId !== undefined && items.some((item) => item.id === requestedId)) return requestedId;
    return items[0]?.id;
  }, [items, requestedId]);

  function moveBy(delta: number) {
    if (items.length === 0) return;
    const currentIndex = activeId === undefined ? -1 : items.findIndex((item) => item.id === activeId);
    const nextIndex = (currentIndex + delta + items.length) % items.length;
    setRequestedId(items[nextIndex]?.id);
  }

  function onKeyDown(event: ReactKeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveBy(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveBy(-1);
        return;
      case "Enter":
        event.preventDefault();
        if (activeId !== undefined) onSelect(activeId);
        return;
      case "Escape":
        event.preventDefault();
        onClose();
        return;
      default:
        return;
    }
  }

  return { activeId, setActiveId: setRequestedId, onKeyDown };
}
