import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils.js";

// The focus ring lives in the theme's base layer, not here — one ring for the
// whole app, declared once.
//
// NOTE FOR THE NEXT IMPLEMENTER: DESIGN.md:377 specifies a white label on the
// orange primary. That measures 2.69:1, a hard AA failure. `text-primary-
// foreground` resolves to ink in light (5.53:1) and black in dark (5.34:1),
// which is correct. DESIGN.md is wrong; do not "fix" this back.
const buttonVariants = cva(
  // active:brightness-95 is the press state for every variant: it darkens the
  // rendered fill whatever that fill is, so it needs no per-variant pressed
  // token. Deliberately outside `transition-colors` — a press should land on
  // the frame the pointer goes down, not ease in.
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors active:brightness-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-active",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
        outline: "border border-input bg-transparent hover:bg-muted",
        ghost: "hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
