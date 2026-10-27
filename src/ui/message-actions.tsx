"use client";

import { Ellipsis } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ComponentProps, KeyboardEvent, ReactNode } from "react";

import { useDismissablePopover } from "../hooks/use-dismissable-popover.js";
import { cn } from "../lib/utils.js";

type MenuContextValue = {
  /** Closes the menu and returns focus to its trigger. */
  readonly close: () => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

export type MessageActionsProps = ComponentProps<"div">;

/**
 * The row of actions under a message: `MessageAction` buttons, then a
 * `MessageActionMenu` for the extras. Named "Message actions" unless the host
 * passes its own `aria-label`.
 */
export function MessageActions({
  "aria-label": label = "Message actions",
  className,
  ...props
}: MessageActionsProps) {
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="message-actions"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  );
}

export type MessageActionProps = Omit<
  ComponentProps<"button">,
  "aria-label" | "children"
> & {
  /**
   * What the action does. In the row it is the button's accessible name and
   * tooltip; in a `MessageActionMenu` it is the item's visible text.
   */
  readonly label: string;
  /** The icon. Decorative: mark it `aria-hidden`. */
  readonly children?: ReactNode;
};

/**
 * One action: an icon button in `MessageActions`, or an item (icon and
 * label) inside a `MessageActionMenu`. Pass `aria-pressed` for an action that
 * toggles, such as a vote.
 */
export function MessageAction({
  label,
  className,
  children,
  onClick,
  "aria-pressed": pressed,
  ...props
}: MessageActionProps) {
  const menu = useContext(MenuContext);
  if (menu !== null) {
    // A toggle in a menu is a checkbox item: menus have no pressed state.
    const toggle = pressed !== undefined;
    const checked = pressed === true || pressed === "true";
    return (
      <button
        type="button"
        role={toggle ? "menuitemcheckbox" : "menuitem"}
        aria-checked={toggle ? checked : undefined}
        tabIndex={-1}
        data-slot="message-action"
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm whitespace-nowrap text-popover-foreground transition-colors outline-none hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50 aria-checked:font-semibold [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
          className,
        )}
        {...props}
        onClick={(event) => {
          // Close (and refocus the trigger) first, so an action that moves
          // focus itself, such as opening a dialog, keeps it.
          menu.close();
          onClick?.(event);
        }}
      >
        {children}
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      data-slot="message-action"
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-muted aria-pressed:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

export type MessageActionMenuProps = Omit<ComponentProps<"div">, "children"> & {
  /** The trigger's accessible name and the menu's. Default "More actions". */
  readonly label?: string;
  /** The trigger's icon. Defaults to an ellipsis. */
  readonly icon?: ReactNode;
  /** Which side of the trigger the menu opens on. Default `bottom`. */
  readonly side?: "top" | "bottom";
  /** Which edge of the trigger the menu lines up with. Default `start`. */
  readonly align?: "start" | "end";
  /** Controlled open flag. Pair with `onOpenChange`. */
  readonly open?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  /** `MessageAction`s, shown as menu items. */
  readonly children: ReactNode;
};

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  if (menu === null) return [];
  return [
    ...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)'),
  ];
}

/** The box a menu must fit inside: its nearest clipping ancestor, or the
 * viewport. */
function clipBounds(element: HTMLElement): { top: number; bottom: number } {
  for (
    let node = element.parentElement;
    node !== null;
    node = node.parentElement
  ) {
    if (getComputedStyle(node).overflowY !== "visible") {
      const rect = node.getBoundingClientRect();
      return {
        top: Math.max(rect.top, 0),
        bottom: Math.min(rect.bottom, window.innerHeight),
      };
    }
  }
  return { top: 0, bottom: window.innerHeight };
}

/**
 * The overflow menu at the end of `MessageActions`. Its items mount only
 * while it is open, so a long conversation carries one button per message.
 *
 * Opening it moves focus to the first item (ArrowUp on the trigger: the
 * last). Arrow keys, Home and End move between items; Escape closes it and
 * returns focus to the trigger, as do choosing an item, Shift+Tab and
 * pressing the trigger again; focus leaving it or a click outside closes it.
 * It opens on `side` unless that side would clip it and the other has more
 * room.
 */
export function MessageActionMenu({
  label = "More actions",
  icon,
  side = "bottom",
  align = "start",
  open: openProp,
  onOpenChange,
  className,
  children,
  ref,
  ...props
}: MessageActionMenuProps) {
  const { open, setOpen, rootRef, triggerRef, close } = useDismissablePopover<
    HTMLDivElement,
    HTMLButtonElement
  >({ open: openProp, onOpenChange });
  // The host's ref must not replace the root ref: outside-click dismissal
  // and the side flip both measure the root.
  const setRoot = useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref != null) ref.current = element;
    },
    [ref, rootRef],
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last">("first");
  // Set by a press on the trigger while open. Safari, and Firefox on macOS,
  // do not focus a button on click, so the press blurs the menu with no
  // `relatedTarget`; that blur must leave closing to the trigger's click.
  const pressingTrigger = useRef(false);
  const menuId = useId();
  const [placement, setPlacement] = useState(side);

  // Opens on `side` unless that would clip it and the other side has room.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const root = rootRef.current;
    if (!open || menu === null || root === null) {
      setPlacement(side);
      return;
    }
    const bounds = clipBounds(root);
    const trigger = root.getBoundingClientRect();
    const height = menu.getBoundingClientRect().height;
    const below = bounds.bottom - trigger.bottom;
    const above = trigger.top - bounds.top;
    if (side === "bottom" && below < height && above > below) {
      setPlacement("top");
    } else if (side === "top" && above < height && below > above) {
      setPlacement("bottom");
    } else {
      setPlacement(side);
    }
  }, [open, side, rootRef]);

  useEffect(() => {
    if (!open) return;
    const items = menuItems(menuRef.current);
    const target = focusOnOpen.current === "last" ? items.at(-1) : items[0];
    (target ?? menuRef.current)?.focus();
    focusOnOpen.current = "first";
  }, [open]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    focusOnOpen.current = event.key === "ArrowUp" ? "last" : "first";
    setOpen(true);
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab" && event.shiftKey) {
      // Shift+Tab lands on the trigger, inside the root: close on the way.
      event.preventDefault();
      close();
      return;
    }
    const items = menuItems(menuRef.current);
    if (items.length === 0) return;
    const current = items.findIndex((item) => item === document.activeElement);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    else if (event.key === "ArrowUp")
      next = current <= 0 ? items.length - 1 : current - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next === null) return;
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div
      ref={setRoot}
      data-slot="message-action-menu"
      className={cn("relative inline-flex", className)}
      {...props}
      onBlur={(event) => {
        props.onBlur?.(event);
        if (pressingTrigger.current) {
          pressingTrigger.current = false;
          return;
        }
        // Focus left for somewhere else (Tab, a screen reader's cursor).
        const next = event.relatedTarget;
        if (open && (next === null || !event.currentTarget.contains(next))) {
          setOpen(false);
        }
      }}
    >
      <MessageAction
        ref={triggerRef}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onPointerDown={() => {
          pressingTrigger.current = open;
        }}
        onClick={() => {
          pressingTrigger.current = false;
          if (open) close();
          else setOpen(true);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        {icon ?? <Ellipsis aria-hidden />}
      </MessageAction>
      {open ? (
        <MenuContext.Provider value={{ close }}>
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            tabIndex={-1}
            data-slot="message-action-menu-content"
            data-side={placement}
            onKeyDown={onMenuKeyDown}
            className={cn(
              "absolute z-50 flex min-w-40 flex-col rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
              placement === "bottom" ? "top-full mt-1" : "bottom-full mb-1",
              align === "start" ? "start-0" : "end-0",
            )}
          >
            {children}
          </div>
        </MenuContext.Provider>
      ) : null}
    </div>
  );
}
