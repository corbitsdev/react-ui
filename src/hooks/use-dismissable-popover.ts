import { useCallback, useEffect, useRef, type RefObject } from "react";

import { useControllableState, type ControllableStateAction } from "./use-controllable-state.js";

export type UseDismissablePopoverOptions = {
  /** Controlled open flag. Supply this with `onOpenChange` to lift state to a parent. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Seeds the hook's own state when `open` is not supplied. */
  readonly defaultOpen?: boolean;
  /** Escape closes the popover and returns focus to the trigger. Default `true`. */
  readonly closeOnEscape?: boolean;
};

export type UseDismissablePopoverResult<Root extends HTMLElement, Trigger extends HTMLElement> = {
  readonly open: boolean;
  readonly setOpen: (action: ControllableStateAction<boolean>) => void;
  readonly rootRef: RefObject<Root | null>;
  readonly triggerRef: RefObject<Trigger | null>;
  /** Closes and returns focus to the trigger. */
  readonly close: () => void;
};

/**
 * The behavior every dismissable popover trigger shares: an open flag, a
 * pointer-down outside `rootRef` that closes it, and (by default) Escape that
 * closes it and returns focus to `triggerRef`. `NotificationsBell`,
 * `TenantSelector` and `ThreadSwitcher` each hand-rolled this before it moved
 * here — one hook now, not three near-identical `useEffect` pairs.
 *
 * Controlled when `open` is supplied (pair it with `onOpenChange`);
 * uncontrolled otherwise, seeded from `defaultOpen`. A caller with its own
 * Escape handling (a listbox that also closes on Tab, say) sets
 * `closeOnEscape: false` and wires Escape itself.
 *
 * The controlled/uncontrolled resolution — including the dev-mode warning if
 * a caller switches between them after mount — is `useControllableState`;
 * this hook only adds the popover-specific dismissal behavior on top.
 * `setOpen` takes a value or an updater, same as `useState`.
 */
export function useDismissablePopover<
  Root extends HTMLElement = HTMLElement,
  Trigger extends HTMLElement = HTMLElement,
>(options: UseDismissablePopoverOptions = {}): UseDismissablePopoverResult<Root, Trigger> {
  const { open: controlledOpen, onOpenChange, defaultOpen = false, closeOnEscape = true } = options;
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: "useDismissablePopover",
  });
  const rootRef = useRef<Root>(null);
  const triggerRef = useRef<Trigger>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) === false) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== "Escape") return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close, setOpen, closeOnEscape]);

  return { open, setOpen, rootRef, triggerRef, close };
}
