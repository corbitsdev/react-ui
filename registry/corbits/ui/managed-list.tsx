"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";

export type ManagedItem = {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  /** Status line — "Connected as ada@example.com", "Expired". */
  readonly status?: string;
  readonly icon?: ReactNode;
  /** Row control: a Connect button, a Reconnect, a menu. Replaces remove. */
  readonly action?: ReactNode;
};

export type ManagedListProps = {
  /** Names the collection. Required. */
  readonly label: string;
  readonly items: readonly ManagedItem[];
  /** Omit for read-only lists — a row with no way out needs no remove button. */
  readonly onRemove?: (item: ManagedItem) => void;
  /** The add control: a picker, a "Connect account" button. */
  readonly add?: ReactNode;
  readonly empty?: ReactNode;
  readonly className?: string;
};

/**
 * A collection the user curates: pinned skills, connected accounts, allowed
 * senders.
 *
 * Connections and pinned items are the same list with a different row control,
 * so `action` replaces the remove button per row rather than there being a
 * second component for the connected-accounts case.
 *
 * Remove is labelled with the item's name, not "Remove". Ten buttons all
 * announced as "Remove" are ten identical buttons to anyone navigating by
 * control.
 */
export function ManagedList({ label, items, onRemove, add, empty, className }: ManagedListProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty ?? "Nothing here yet."}</p>
      ) : (
        <ul aria-label={label} className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              {item.icon === undefined ? null : (
                <span className="grid size-5 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4" aria-hidden>
                  {item.icon}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{item.label}</span>
                {item.description === undefined ? null : (
                  <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                )}
                {item.status === undefined ? null : (
                  <span className="truncate text-xs text-muted-foreground">{item.status}</span>
                )}
              </div>
              {item.action ??
                (onRemove === undefined ? null : (
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    aria-label={`Remove ${item.label}`}
                    className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
      {add}
    </div>
  );
}
