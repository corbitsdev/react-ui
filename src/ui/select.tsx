import { ChevronDown } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils.js";

// Same border/focus-ring/disabled treatment as `Input`; the chevron is a
// decorative overlay since a native `<select>` cannot be given its own icon.
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="group relative">
      <select
        data-slot="select"
        className={cn(
          "flex h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-card px-3 py-1 pr-8 text-sm shadow-xs transition-colors",
          "selection:bg-primary selection:text-primary-foreground",
          "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-has-[:disabled]:opacity-50"
      />
    </div>
  );
}
