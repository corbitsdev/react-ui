import type * as React from "react";

import { cn } from "@/registry/corbits/lib/utils";

/**
 * A placeholder for content that has not arrived.
 *
 * Sizing and shape come from the caller's className — a skeleton is a shape,
 * and a `variant="text" | "avatar"` prop would only be a lookup table for
 * classes the caller can write directly.
 *
 * `aria-hidden`, always. A screen reader should hear "Loading…" once from a
 * sibling `role="status"`, not the geometry of six grey boxes. If you render
 * these, render a status line with them.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
