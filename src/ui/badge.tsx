import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils.js";

// A compact label chip. Tones are semantic, not decorative: `accent` is the one
// orange tone and — like the primary button — should stay rare on a screen.
// Orange here is `primary-emphasis`, the orange that clears text contrast on the
// page and card grounds; the fill orange does not.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        accent: "border-primary-emphasis/40 bg-primary/10 text-primary-emphasis",
        info: "border-accent bg-accent text-accent-foreground",
        success: "border-success bg-success text-success-foreground",
        danger: "border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

/** The tone names, exported so callers can type a state → tone lookup table. */
export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
