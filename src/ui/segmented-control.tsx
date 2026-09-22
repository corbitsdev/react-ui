import { cn } from "../lib/utils.js";

export type SegmentedControlOption<Id extends string> = {
  readonly id: Id;
  readonly label: string;
};

export type SegmentedControlProps<Id extends string> = {
  readonly options: readonly SegmentedControlOption<Id>[];
  readonly value: Id;
  readonly onValueChange: (value: Id) => void;
  /** Names the set for assistive tech: "Theme". */
  readonly label: string;
  readonly className?: string;
};

/**
 * A small set of mutually exclusive choices as joined segments — theme,
 * protocol, density. `role="group"` with `aria-pressed` toggles rather than a
 * radiogroup: these change something immediately (same reasoning as
 * ViewToggle), and radios promise form semantics that do not apply.
 *
 * Stateless — the host owns the value, because the choice usually outlives the
 * component and gets persisted.
 */
export function SegmentedControl<Id extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: SegmentedControlProps<Id>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex items-center gap-0.5 rounded-md border border-border p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(option.id)}
            className={cn(
              "rounded-sm px-3 py-1 font-mono text-xs transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
