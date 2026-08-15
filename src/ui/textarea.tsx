import type * as React from "react";
import { useEffect, useRef } from "react";

import { cn } from "../lib/utils.js";

// Matches ChatInput's MAX_ROWS_PX — the same cap, so a textarea grown by
// autoResize behaves identically wherever it's used.
const DEFAULT_MAX_HEIGHT_PX = 200;

export type TextareaProps = React.ComponentProps<"textarea"> & {
  /** Grows the textarea to fit its content instead of scrolling internally. */
  readonly autoResize?: boolean;
  /** Pixel height autoResize grows to before it caps and scrolls. */
  readonly maxHeight?: number;
};

export function Textarea({
  className,
  autoResize,
  maxHeight = DEFAULT_MAX_HEIGHT_PX,
  onChange,
  ...props
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
  };

  useEffect(() => {
    if (autoResize && ref.current) resize(ref.current);
  }, [autoResize, maxHeight]);

  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      style={autoResize ? { maxHeight } : undefined}
      className={cn(
        "flex min-h-16 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors",
        autoResize && "resize-none overflow-y-auto",
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onChange={(event) => {
        if (autoResize) resize(event.currentTarget);
        onChange?.(event);
      }}
      {...props}
    />
  );
}
