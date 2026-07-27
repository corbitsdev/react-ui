import type * as React from "react";

import { cn } from "../lib/utils.js";

// `border-input` is the control-boundary token: it clears the 3:1 UI-component
// threshold against both the page and the card, so the field actually has an
// edge. `border-border` is the soft decorative one and must not be used here.
// The focus ring comes from the theme's base layer, not from this file.
export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors",
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
