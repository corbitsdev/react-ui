import { createContext, useContext, useId } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

type RadioGroupContextValue = {
  readonly name: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export type RadioGroupProps = {
  /** Distinguishes this group's inputs so arrow-key roving works between them. */
  readonly name: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** Accessible name for the group. */
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * A compact single-select list — "pick an agent/mode" — not a card grid.
 *
 * `role="radiogroup"` on the container names the set; each `RadioOption`
 * inside is a real native `<input type="radio">` sharing `name`, which is
 * what gives arrow-key roving between options for free.
 */
export function RadioGroup({ name, value, onValueChange, label, children, className }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ name, value, onValueChange }}>
      <div role="radiogroup" aria-label={label} className={cn("flex flex-col divide-y divide-border", className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export type RadioOptionProps = {
  readonly value: string;
  /**
   * Row label. Omit to render just the control, with `id`/`describedBy`
   * passthrough — for composing into an externally labeled row, the way
   * `ToggleList` composes `Switch`.
   */
  readonly label?: string;
  /** Secondary text under the label, tied to the input via `aria-describedby`. Labeled-row mode only. */
  readonly description?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly id?: string;
  /** Id of external text describing the control, for `aria-describedby`. Bare-control mode only. */
  readonly describedBy?: string;
  readonly className?: string;
};

const CONTROL_CLASS = "relative mt-0.5 flex size-4 shrink-0 items-center justify-center";

export function RadioOption({
  value,
  label,
  description,
  disabled = false,
  invalid = false,
  id,
  describedBy,
  className,
}: RadioOptionProps) {
  const context = useContext(RadioGroupContext);
  if (context === null) {
    throw new Error("RadioOption must be rendered inside a RadioGroup");
  }
  const { name, value: groupValue, onValueChange } = context;

  const generatedId = useId();
  const optionId = id ?? `${generatedId}-${value}`;
  const descriptionId = description === undefined ? undefined : `${optionId}-description`;
  const isBare = label === undefined;

  const control = (
    <span className={cn(CONTROL_CLASS, isBare && className)}>
      <input
        type="radio"
        id={optionId}
        name={name}
        value={value}
        checked={groupValue === value}
        disabled={disabled}
        aria-describedby={isBare ? describedBy : descriptionId}
        aria-invalid={invalid}
        onChange={() => onValueChange(value)}
        className={cn(
          "peer size-4 shrink-0 appearance-none rounded-full border border-input bg-card shadow-xs transition-colors",
          "checked:border-primary aria-invalid:border-destructive disabled:cursor-not-allowed",
        )}
      />
      <span className="pointer-events-none absolute size-1.5 scale-0 rounded-full bg-primary transition-transform peer-checked:scale-100" />
    </span>
  );

  if (isBare) return control;

  return (
    <label
      htmlFor={optionId}
      className={cn(
        "flex items-start gap-2 py-2 first:pt-0 last:pb-0",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
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
