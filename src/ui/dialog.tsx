import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils.js";

/**
 * The modal surface, in the three places a modal arrives from: the centre of
 * the page, the right edge, the left edge.
 *
 * One file rather than a dialog and a separate drawer. A side sheet *is* a
 * dialog — same Radix root, same focus trap, Escape, scroll lock and focus
 * restoration, same header/title/description/footer — and the only real
 * differences are which edge it is pinned to and which keyframes carry it in.
 * That is a `side` prop, not a second component: two files meant every fix to
 * the close button, the labelling or the animation had to be made twice, and
 * anyone adopting both surfaces copied the same eighty lines into their repo
 * under two names.
 *
 * `side="center"` is the default because the unqualified word "dialog" means a
 * centred one. Centre dialogs own max-height and overflow so tall forms scroll
 * inside `DialogBody` rather than growing past the viewport. `left` and
 * `right` are full-height sheets; they also use `DialogBody` so the header and
 * footer stay put while the middle scrolls.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export type DialogSide = "center" | "left" | "right";

const SIDE_CLASS: Record<DialogSide, string> = {
  // Guttered width + capped height so the surface never kisses the viewport
  // edge or spills past ~one form-screen of content. Overflow is clipped here;
  // scroll lives on DialogBody.
  center:
    "top-1/2 left-1/2 w-[min(calc(100vw-2rem),32rem)] max-h-[min(90dvh,42rem)] " +
    "overflow-hidden -translate-x-1/2 -translate-y-1/2 rounded-lg border " +
    "max-sm:w-[min(calc(100vw-1.25rem),32rem)] max-sm:max-h-[min(92dvh,42rem)] " +
    "data-[state=open]:animate-[corbits-dialog-in_150ms_ease-out] data-[state=closed]:animate-[corbits-dialog-out_120ms_ease-in]",
  right:
    "inset-y-0 right-0 w-full max-w-lg border-l " +
    "data-[state=open]:animate-[corbits-drawer-in-right_200ms_ease-out] data-[state=closed]:animate-[corbits-drawer-out-right_160ms_ease-in]",
  left:
    "inset-y-0 left-0 w-full max-w-lg border-r " +
    "data-[state=open]:animate-[corbits-drawer-in-left_200ms_ease-out] data-[state=closed]:animate-[corbits-drawer-out-left_160ms_ease-in]",
};

export function DialogContent({
  className,
  children,
  side = "center",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: DialogSide }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-[corbits-fade-in_150ms_ease-out] data-[state=closed]:animate-[corbits-fade-out_120ms_ease-in]" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 border-border bg-popover p-6 text-popover-foreground shadow-lg",
          // Keyframes are installed into your globals.css by this registry item.
          SIDE_CLASS[side],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className={cn(
            "absolute top-[0.85rem] right-[0.85rem] inline-flex size-[1.8rem] items-center justify-center",
            "rounded-[0.45rem] p-0 text-muted-foreground transition-colors",
            "hover:bg-foreground/5 hover:text-foreground",
            // Soft primary-tint focus instead of the theme outline — the close
            // control sits on the popover surface and a hard ring reads heavy.
            "focus-visible:text-foreground focus-visible:outline-none",
            "focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
          )}
        >
          <XIcon className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** `pr-8` keeps the title clear of the close control in the corner. */
export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex shrink-0 flex-col gap-1 pr-8", className)} {...props} />
  );
}

/** Scrolls; the header and footer stay put. Needed by tall centre dialogs and side sheets. */
export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("min-h-0 flex-auto overflow-y-auto overscroll-contain [scrollbar-width:thin]", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // Stable bar: pinned to the bottom of the flex column, subtle top rule
        // and wash so actions read as chrome rather than more body content.
        "mt-auto flex shrink-0 flex-wrap items-center justify-end gap-2",
        "border-t border-foreground/10 bg-foreground/[0.025] pt-[0.85rem]",
        // Narrow viewports: stack full-width so primary/secondary hit areas
        // don't compete for a single row of thumb space.
        "max-sm:flex-col max-sm:flex-nowrap max-sm:items-stretch max-sm:[&>*]:w-full",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("m-0 text-[0.95rem] font-[650] leading-[1.3] tracking-[-0.01em] text-foreground", className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("m-0 text-[0.8125rem] leading-[1.4] text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Uppercase field label used inside dialog forms. */
export function DialogFieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="dialog-field-label"
      className={cn(
        "text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
