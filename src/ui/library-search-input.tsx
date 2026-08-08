import { useRef, useState } from "react";

import { cn } from "../lib/utils.js";

export type LibrarySearchInputProps = {
  /** Accessible name, and the default placeholder. */
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  /** `bordered` (default) for catalog pages; `ghost` for denser lists. */
  readonly variant?: "bordered" | "ghost";
  readonly className?: string;
};

const VARIANT_CLASS = {
  bordered: "rounded-md border border-input bg-background",
  ghost: "rounded-md border border-transparent bg-transparent focus:border-input focus:bg-background",
} as const;

const COLLAPSED_WIDTH = "180px";
const EXPANDED_WIDTH = "340px";

/**
 * The search box for library headers. Controlled — the page owns the query
 * state and any filtering derived from it.
 *
 * Reserves a fixed-width slot in the header's flex flow at all times, so
 * neighbouring controls never shift; the input itself is positioned absolutely
 * inside that slot and grows leftward — over the header's flexible spacer,
 * never over another control — while focused or holding a value. Escape clears
 * an active query first, then relinquishes focus once already empty, so it
 * never traps the keyboard.
 */
export function LibrarySearchInput({
  label,
  value,
  onChange,
  placeholder,
  variant = "bordered",
  className,
}: LibrarySearchInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const expanded = focused || value.length > 0;

  return (
    <div className="relative h-[34px] shrink-0" style={{ width: COLLAPSED_WIDTH }}>
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          if (value.length > 0) {
            event.stopPropagation();
            onChange("");
          } else {
            inputRef.current?.blur();
          }
        }}
        className={cn(
          "absolute top-0 right-0 h-[34px] px-[11px] text-[12.5px] placeholder:text-muted-foreground transition-[width] duration-150 ease-out",
          expanded ? "z-20" : "z-10",
          VARIANT_CLASS[variant],
          className,
        )}
        style={{ width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
      />
    </div>
  );
}
