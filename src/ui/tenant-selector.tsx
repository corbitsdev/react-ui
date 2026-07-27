import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "../lib/utils.js";

export type Tenant = {
  readonly id: string;
  readonly name: string;
};

export type TenantSelectorProps = {
  readonly tenants: readonly Tenant[];
  readonly activeId: string | null;
  readonly onSelect: (id: string) => void;
  /** Accessible name for the trigger, e.g. "Workbench". */
  readonly label: string;
  readonly className?: string;
};

/**
 * Which tenant/workspace the app is pointed at. The list and the selection are
 * props — this never learns where tenants come from.
 *
 * The popup is a real `listbox`: the list itself takes focus and moves a
 * highlight with `aria-activedescendant`, rather than tabbing through options.
 * That is the ARIA APG listbox pattern, and it is why the options are `<li>`
 * and not buttons — a button per option would put every tenant in the tab
 * order, which is exactly what a listbox exists to avoid.
 */
export function TenantSelector({ tenants, activeId, onSelect, label, className }: TenantSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const active = tenants.find((tenant) => tenant.id === activeId) ?? null;

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
  }, [open]);

  // Pointer-down rather than click: a click elsewhere that also opens something
  // else should close this first, on the way down.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const openAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const commit = (index: number) => {
    const tenant = tenants[index];
    if (tenant !== undefined) onSelect(tenant.id);
    close();
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  if (tenants.length === 0) return null;

  const selectedIndex = Math.max(
    tenants.findIndex((tenant) => tenant.id === activeId),
    0,
  );

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAt(selectedIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(tenants.length - 1);
    }
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, tenants.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(tenants.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      commit(activeIndex);
    } else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      close();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${active?.name ?? "none selected"}`}
        onClick={() => (open ? close() : openAt(selectedIndex))}
        onKeyDown={onTriggerKeyDown}
        className="flex w-full items-center gap-2 rounded-md border border-input px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
      >
        <span className="min-w-0 flex-1 truncate text-left">{active?.name ?? label}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${activeIndex}`}
          onKeyDown={onListKeyDown}
          className="absolute bottom-full left-0 z-50 mb-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {tenants.map((tenant, index) => (
            <li
              key={tenant.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={tenant.id === activeId}
              onClick={() => commit(index)}
              onPointerMove={() => setActiveIndex(index)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                index === activeIndex && "bg-muted",
              )}
            >
              <Check
                className={cn("size-4 shrink-0", tenant.id === activeId ? "text-primary-emphasis" : "opacity-0")}
                aria-hidden
              />
              <span className="min-w-0 truncate">{tenant.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
