import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { twMerge } from "tailwind-merge";

import { cn } from "../lib/utils.js";

// The focus ring lives in the theme's base layer, not here — one ring for the
// whole app, declared once.
//
// NOTE FOR THE NEXT IMPLEMENTER: DESIGN.md:377 specifies a white label on the
// orange primary. That measures 2.69:1, a hard AA failure. `text-primary-
// foreground` resolves to ink in light (5.53:1) and black in dark (5.34:1),
// which is correct. DESIGN.md is wrong; do not "fix" this back.
const buttonVariantsBase = cva(
  // active:brightness-95 is the press state for every variant: it darkens the
  // rendered fill whatever that fill is, so it needs no per-variant pressed
  // token. Deliberately outside `transition-colors` — a press should land on
  // the frame the pointer goes down, not ease in. The scale feedback gets its
  // own `transition-transform` for the same reason: sharing `transition-colors`
  // would delay the press-down scale behind the color easing.
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors active:brightness-95 motion-safe:transition-transform motion-safe:duration-100 motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-active",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
        outline: "border border-input bg-transparent hover:bg-muted",
        ghost: "hover:bg-muted",
        link: "text-primary-emphasis underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
    // link reads as inline text, not a control — it opts out of every size's
    // fixed height/padding rather than getting a box of its own.
    compoundVariants: [{ variant: "link", size: ["sm", "md", "lg", "icon"], class: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

// cva concatenates variant, size, and compound-variant classes as plain
// strings with no dedup, so the compound override above only wins once
// tailwind-merge resolves the h-*/px-* conflicts — hence the wrapper instead
// of exporting buttonVariantsBase directly.
function buttonVariants(props?: VariantProps<typeof buttonVariantsBase>): string {
  return twMerge(buttonVariantsBase(props));
}

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariantsBase> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
