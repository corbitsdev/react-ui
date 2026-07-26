"use client";

import { useId } from "react";
import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { Switch } from "@/registry/corbits/ui/switch";

export type ToggleItem = {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly disabled?: boolean;
  /** Anything trailing the label — a provider marker, a badge. */
  readonly meta?: ReactNode;
};

export type ToggleListProps = {
  /** Names the group. Required — a bare list of switches has no subject. */
  readonly label: string;
  readonly items: readonly ToggleItem[];
  readonly onToggle: (item: ToggleItem, enabled: boolean) => void;
  readonly empty?: ReactNode;
  readonly className?: string;
};

/**
 * A list of things that are on or off: available tools, auto-approved actions,
 * notification preferences, the sources feeding a brief.
 *
 * One component for all of them because they are the same interaction. The
 * difference between "tools the agent may use" and "sources in your brief" is
 * the label and the data, and shipping a component per subject would be the
 * same file four times.
 *
 * Each row's description is tied to its switch with `aria-describedby`, so the
 * explanation is read out with the control instead of being visual-only.
 */
export function ToggleList({ label, items, onToggle, empty, className }: ToggleListProps) {
  const baseId = useId();

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty ?? "Nothing to configure here yet."}</p>;
  }

  return (
    <ul aria-label={label} className={cn("flex flex-col divide-y divide-border", className)}>
      {items.map((item) => {
        const switchId = `${baseId}-${item.id}`;
        const descriptionId = item.description === undefined ? undefined : `${switchId}-description`;
        return (
          <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <label htmlFor={switchId} className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {item.label}
                {item.meta}
              </label>
              {item.description === undefined ? null : (
                <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>
            <Switch
              id={switchId}
              checked={item.enabled}
              disabled={item.disabled}
              describedBy={descriptionId}
              onCheckedChange={(enabled) => onToggle(item, enabled)}
            />
          </li>
        );
      })}
    </ul>
  );
}
