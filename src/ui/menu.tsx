import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type * as React from "react";

import { cn } from "../lib/utils.js";

/**
 * The popover menu used by toolbars and selectors.
 *
 * Radix owns anchored positioning, focus management, keyboard navigation and
 * dismissal; this layer only paints. Every menu gets the same fully opaque
 * popover surface — a see-through menu over a busy page is the bug this
 * primitive exists to prevent — and the same item hover, so a menu opened from
 * a toolbar and one opened from a table row read as the same control.
 */
export const Menu = DropdownMenuPrimitive.Root;
export const MenuTrigger = DropdownMenuPrimitive.Trigger;
export const MenuGroup = DropdownMenuPrimitive.Group;

export function MenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-32 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function MenuItem({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none select-none transition-colors data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="menu-label"
      className={cn("px-2.5 py-1.5 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    />
  );
}

export function MenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
