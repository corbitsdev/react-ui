import { Check, Minus } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { cn } from "../lib/utils.js";

export type CheckboxProps = {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  /**
   * Row label. Omit to render just the control, with `id`/`describedBy`
   * passthrough — for composing into an externally labeled row, the way
   * `ToggleList` composes `Switch`.
   */
  readonly label?: string;
  /** Explanatory text under the label, tied to the control via `aria-describedby`. Labeled-row mode only. */
  readonly description?: string;
  /**
   * A checkbox is neither on nor off — some of its children are checked and
   * some are not. There is no HTML attribute for this: it exists only as a DOM
   * property, so it has to be set imperatively via a ref.
   */
  readonly indeterminate?: boolean;
  readonly id?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** Id of external text describing the control, for `aria-describedby`. Bare-control mode only. */
  readonly describedBy?: string;
  readonly className?: string;
};

const CONTROL_CLASS = "relative mt-0.5 flex size-4 shrink-0 items-center justify-center";

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  indeterminate = false,
  id,
  disabled = false,
  invalid = false,
  describedBy,
  className,
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = description === undefined ? undefined : `${checkboxId}-description`;
  const ref = useRef<HTMLInputElement>(null);
  const isBare = label === undefined;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const control = (
    <div className={cn(CONTROL_CLASS, isBare && className)}>
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        checked={checked}
        disabled={disabled}
        aria-describedby={isBare ? describedBy : descriptionId}
        aria-invalid={invalid}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className={cn(
          "peer size-4 shrink-0 appearance-none rounded-sm border border-input bg-card shadow-xs transition-colors",
          "checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary",
          "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      <Check
        aria-hidden
        className="pointer-events-none absolute size-3 scale-0 text-primary-foreground transition-transform peer-checked:scale-100"
      />
      <Minus
        aria-hidden
        className="pointer-events-none absolute size-3 scale-0 text-primary-foreground transition-transform peer-indeterminate:scale-100 peer-checked:scale-0"
      />
    </div>
  );

  if (isBare) return control;

  return (
    <label
      htmlFor={checkboxId}
      className={cn("flex items-start gap-2", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer", className)}
    >
      {control}
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description === undefined ? null : (
          <span id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
