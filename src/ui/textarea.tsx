import type * as React from "react";
import { useEffect, useRef } from "react";

import { cn } from "../lib/utils.js";

export type TextareaProps = React.ComponentProps<"textarea"> & {
  /** Grows the textarea to fit its content instead of scrolling internally. */
  readonly autoResize?: boolean;
};

export function Textarea({ className, autoResize, onChange, ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    if (autoResize && ref.current) resize(ref.current);
  }, [autoResize]);

  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors",
        autoResize && "resize-none overflow-hidden",
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
