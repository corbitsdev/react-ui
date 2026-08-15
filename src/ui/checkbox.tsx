import { Check, Minus } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { cn } from "../lib/utils.js";

export type CheckboxProps = {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly label: string;
  /** Explanatory text under the label, tied to the control via `aria-describedby`. */
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
  readonly className?: string;
};

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  indeterminate = false,
  id,
  disabled = false,
  invalid = false,
  className,
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = description === undefined ? undefined : `${checkboxId}-description`;
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <div className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
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
          className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
        />
        <Minus
          aria-hidden
          className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-indeterminate:opacity-100 peer-checked:opacity-0"
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={checkboxId} className="text-sm font-medium">
          {label}
        </label>
        {description === undefined ? null : (
          <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
