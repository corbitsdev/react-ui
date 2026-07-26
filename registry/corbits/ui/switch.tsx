"use client";

import { cn } from "@/registry/corbits/lib/utils";

export type SwitchProps = {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  /** Accessible name. Omit only when a `<label htmlFor>` already names it. */
  readonly label?: string;
  readonly id?: string;
  readonly disabled?: boolean;
  /** Ids of the text describing the setting, for `aria-describedby`. */
  readonly describedBy?: string;
  readonly className?: string;
};

/**
 * An on/off setting.
 *
 * `role="switch"` on a real `<button>`, not a styled checkbox: a switch takes
 * effect immediately and a checkbox implies a form you still have to submit.
 * Screen readers say "on/off" for a switch and "checked/unchecked" for a
 * checkbox, and that difference is the whole reason the role exists.
 *
 * The knob is a `<span>` inside the button rather than a `::after`, so its
 * transform animates independently of the track's colour transition.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
  disabled = false,
  describedBy,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent p-0.5 transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-4 rounded-full bg-background transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
