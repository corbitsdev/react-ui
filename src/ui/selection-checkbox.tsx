import { Check } from "lucide-react";
import { useId } from "react";

import { cn } from "../lib/utils.js";

export type SelectionCheckboxProps = {
  readonly checked: boolean;
  /**
   * Fires on both a plain click and a cmd/ctrl-click — `useListSelection`'s
   * `toggle` takes the same `shiftKey` modifier this passes through, so a
   * row wires this straight to it without branching on the click type
   * itself.
   */
  readonly onToggle: (event: { readonly shiftKey: boolean }) => void;
  /** Row label for the accessible name, e.g. `Select "Q3 rollup"`. */
  readonly rowLabel: string;
  readonly id?: string;
  readonly className?: string;
};

/**
 * A row's selection control: hidden until the row is hovered or focused, and
 * always visible on a touch device — there is no hover to reveal it on, so
 * `(hover: none)` forces it on. The consumer's row needs a `group` class
 * ancestor (e.g. `<TableRow className="group">`) for the hover reveal to
 * find; nothing here declares that ancestor itself since the row, not this
 * cell, owns that boundary.
 *
 * Built as a `role="checkbox"` button rather than `Checkbox`'s native input:
 * a native input's own focus ring and box model fight the opacity-driven
 * reveal below, where the control needs to participate in hover/focus state
 * that belongs to an ancestor it does not render.
 */
export function SelectionCheckbox({ checked, onToggle, rowLabel, id, className }: SelectionCheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <button
      type="button"
      id={checkboxId}
      role="checkbox"
      aria-checked={checked}
      aria-label={`Select ${rowLabel}`}
      onClick={(event) => onToggle({ shiftKey: event.shiftKey })}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        onToggle({ shiftKey: event.shiftKey });
      }}
      className={cn(
        "relative flex size-4 shrink-0 items-center justify-center rounded-sm border border-input bg-card shadow-xs transition-colors",
        "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
        checked && "border-primary bg-primary opacity-100 motion-safe:[animation:corbits-selection-pop_220ms_var(--ease-out)_both]",
        className,
      )}
    >
      <Check
        aria-hidden
        className={cn("size-3 text-primary-foreground transition-transform", checked ? "scale-100" : "scale-0")}
      />
    </button>
  );
}
