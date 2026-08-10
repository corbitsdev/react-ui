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
 * centred one. `left` and `right` are full-height sheets; they are the only
 * variants that need `DialogBody`, which scrolls while the header and footer
 * stay put.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export type DialogSide = "center" | "left" | "right";

const SIDE_CLASS: Record<DialogSide, string> = {
  center:
    "top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border " +
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
          className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
        >
          <XIcon className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** `pr-8` keeps the title clear of the close control in the corner. */
export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1 pr-8", className)} {...props} />;
}

/** Scrolls; the header and footer stay put. Mostly wanted by the side variants. */
export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-body" className={cn("min-h-0 flex-1 overflow-y-auto", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-base leading-snug font-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
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
