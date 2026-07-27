import { LayoutGrid, Rows3 } from "lucide-react";

import { cn } from "../lib/utils.js";

export type ViewMode = "grid" | "rows";

const OPTIONS: readonly { mode: ViewMode; label: string; Icon: typeof LayoutGrid }[] = [
  { mode: "grid", label: "Grid view", Icon: LayoutGrid },
  { mode: "rows", label: "Rows view", Icon: Rows3 },
];

/**
 * Grid or rows, as a segmented control.
 *
 * `role="group"` with `aria-pressed` toggles rather than a radiogroup: these
 * are two buttons that change a view, and radios promise arrow-key navigation
 * between options plus form-submission semantics that do not apply.
 *
 * Each button carries a text label for assistive tech; the icon alone is not a
 * name. Stateless — the page owns `mode`, because the choice usually outlives
 * the component and gets persisted.
 */
export function ViewToggle({
  mode,
  onChange,
  className,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="View"
      className={cn("flex items-center gap-0.5 rounded-md border border-border p-0.5", className)}
    >
      {OPTIONS.map(({ mode: option, label, Icon }) => {
        const active = mode === option;
        return (
          <button
            key={option}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              "grid size-7 place-items-center rounded-sm transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
