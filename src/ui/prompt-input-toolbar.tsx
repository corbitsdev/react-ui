"use client";

import { Check, ChevronDown, Plus, Reply, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type * as React from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { useDismissablePopover } from "../hooks/use-dismissable-popover.js";
import { useScrollCurrentIntoView } from "../hooks/use-scroll-current-into-view.js";
import { cn } from "../lib/utils.js";
import { usePromptInputDisabled } from "./prompt-input.js";

function assignRef<T>(ref: React.Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref !== null && ref !== undefined) ref.current = node;
}

/** Where a key moves the current item in a list of `length`: arrows step
 * (wrapping when `wrap`, stopping at the ends otherwise), Home and End jump.
 * `undefined` for any other key. */
function stepIndex(
  key: string,
  current: number,
  length: number,
  wrap: boolean,
): number | undefined {
  if (length === 0) return undefined;
  switch (key) {
    case "ArrowDown":
      return wrap ? (current + 1) % length : Math.min(current + 1, length - 1);
    case "ArrowUp":
      if (current < 0) return length - 1;
      return wrap ? (current - 1 + length) % length : Math.max(current - 1, 0);
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return undefined;
  }
}

/** The root of a toolbar popup while it is open; each root carries
 * `data-state="open"` only then. */
const OPEN_POPUP = [
  "prompt-input-add-menu",
  "prompt-input-model-select",
  "prompt-input-mode-select",
]
  .map((slot) => `[data-slot=${slot}][data-state=open]`)
  .join(",");

/**
 * While `open`, claims Escape for the popup so that one Escape closes only
 * the popup, not an enclosing dialog as well. A dialog dismisses on Escape
 * from a capture listener on the document unless the event is already
 * prevented, so this prevents it earlier, in the window's capture phase.
 * Escape pressed inside `rootRef` is then the popup's own keys' to close.
 * Escape pressed elsewhere in the enclosing `PromptInput` (in the textarea,
 * say, beside a popup the host opened) closes the popup here and leaves
 * focus where it is. Left alone are an Escape from outside the
 * `PromptInput`, which belongs to whatever layer it was pressed in, one
 * inside another open toolbar popup, which that popup closes, and any while
 * the `PromptInput`'s suggestion list is showing, which the list takes.
 */
function useClaimEscape(
  open: boolean,
  rootRef: React.RefObject<HTMLElement | null>,
  setOpen: (open: boolean) => void,
) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current;
      const { target } = event;
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        root === null ||
        !(target instanceof Element)
      ) {
        return;
      }
      const inside = root.contains(target);
      if (!inside) {
        const box = root.closest("[data-slot=prompt-input]");
        if (
          box === null ||
          target.closest("[data-slot=prompt-input]") !== box
        ) {
          return;
        }
        const listShowing =
          box.querySelector("[data-slot=prompt-input-suggestions]") !== null;
        const inOther = target.closest(OPEN_POPUP) !== null;
        if (listShowing || inOther) return;
      }
      event.preventDefault();
      if (!inside) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, rootRef, setOpen]);
}

/**
 * What a popup shows of its `open` state: closed while `disabled`, whatever
 * its owner holds, so a disabled part offers nothing to choose. Turning
 * disabled while open closes it for the owner too, so it stays closed once
 * the part is enabled again.
 */
function useClosedWhileDisabled(
  open: boolean,
  disabled: boolean,
  setOpen: (open: boolean) => void,
): boolean {
  // The latest `setOpen`, which is new on every render of a popup the owner
  // controls, so the owner is asked once per change rather than each render.
  const setOpenRef = useRef(setOpen);
  useLayoutEffect(() => {
    setOpenRef.current = setOpen;
  });
  useEffect(() => {
    if (disabled && open) setOpenRef.current(false);
  }, [disabled, open]);
  return open && !disabled;
}

/** Open state a parent may own, as on every popup here. */
type PopupStateProps = {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
};

/** Which edge of its trigger a popup lines up with. */
export type PromptInputPopupAlign = "start" | "end";

// Above the textarea (z-10) and the suggestion list (z-20); the popups open
// upward, over the box, since the box sits at the bottom of the screen.
const POPUP =
  "absolute bottom-full z-30 mb-2 flex max-h-72 w-max max-w-80 min-w-48 flex-col gap-px overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg";

const ICON_BUTTON =
  "grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50";

export type PromptInputToolbarProps = React.ComponentProps<"div">;

/**
 * The row of controls under the text. Rendered last inside `PromptInput`, it
 * takes a row of its own; without it the box stays a single row. Put `ms-auto`
 * on the first control that belongs at the far end (a model select, say, or
 * `PromptInputSubmit`).
 *
 * Inside a disabled `PromptInput`, the add menu, the selects and
 * `PromptInputButton` are disabled too unless given their own `disabled`.
 */
export function PromptInputToolbar({
  className,
  ...props
}: PromptInputToolbarProps) {
  return (
    <div
      {...props}
      data-slot="prompt-input-toolbar"
      className={cn("flex basis-full items-center gap-1", className)}
    />
  );
}

export type PromptInputButtonProps = Omit<
  React.ComponentProps<"button">,
  "type" | "aria-label"
> & {
  /** Toolbar buttons show only an icon, so the name is required. */
  readonly "aria-label": string;
};

/** An icon button sized for the toolbar: voice, attach, anything the host
 * adds. Never submits the form it sits in. `disabled` defaults to the
 * enclosing `PromptInput`'s. */
export function PromptInputButton({
  disabled,
  className,
  ...props
}: PromptInputButtonProps) {
  const boxDisabled = usePromptInputDisabled();
  return (
    <button
      {...props}
      type="button"
      disabled={disabled ?? boxDisabled}
      data-slot="prompt-input-button"
      className={cn(ICON_BUTTON, className)}
    />
  );
}

/** One action in `PromptInputAddMenu`. */
export type PromptInputAddMenuItem = {
  readonly id: string;
  readonly label: string;
  /** Decorative; hidden from assistive technology. */
  readonly icon?: React.ReactNode;
  readonly detail?: string;
  /** Listed but not choosable; the arrow keys pass over it. */
  readonly disabled?: boolean;
  /** Runs after the menu has closed and focus is back on its trigger, so an
   * action that moves focus (into the textarea, a file picker) keeps it. */
  readonly onSelect: () => void;
};

export type PromptInputAddMenuProps = Omit<
  React.ComponentProps<"div">,
  "children"
> &
  PopupStateProps & {
    readonly items: readonly PromptInputAddMenuItem[];
    /** Defaults to the enclosing `PromptInput`'s `disabled`. */
    readonly disabled?: boolean;
    /** The trigger's and the menu's accessible name. */
    readonly label?: string;
    readonly align?: PromptInputPopupAlign;
  };

/**
 * The `+` button and its menu of ways to add to the message: files, a
 * mention, a command. What each one does is the host's, through `onSelect`.
 *
 * A menu button: Enter, Space or ArrowDown opens it on the first item,
 * ArrowUp on the last; the arrows move round the items, Home and End jump,
 * Escape closes and returns focus to the trigger, Tab closes and moves on.
 * A press outside closes it without taking focus back, as does Escape from
 * elsewhere in the enclosing `PromptInput` (the textarea, beside a menu the
 * host opened).
 */
export function PromptInputAddMenu({
  items,
  disabled: disabledProp,
  label = "Add",
  align = "start",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  ref,
  ...props
}: PromptInputAddMenuProps) {
  const popover = useDismissablePopover<HTMLDivElement, HTMLButtonElement>({
    open: openProp,
    defaultOpen,
    onOpenChange,
    closeOnEscape: false,
  });
  const { setOpen, rootRef, triggerRef, close } = popover;
  const boxDisabled = usePromptInputDisabled();
  const disabled = disabledProp ?? boxDisabled;
  const open = useClosedWhileDisabled(popover.open, disabled, setOpen);
  useClaimEscape(open, rootRef, setOpen);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  // Set only when the person opens the menu from its trigger, so a menu that
  // is open from the start (or opened by the host) does not take focus.
  // Dropped when the owner does not open the menu at once, so the owner's
  // own later open does not take focus either.
  const [focusOnOpen, setFocusOnOpen] = useState<"first" | "last" | null>(null);
  if (focusOnOpen !== null && !open) setFocusOnOpen(null);

  function enabledItems(): HTMLElement[] {
    const menu = menuRef.current;
    if (menu === null) return [];
    return [
      ...menu.querySelectorAll<HTMLElement>(
        "[role='menuitem']:not([aria-disabled='true'])",
      ),
    ];
  }

  function focusItem(which: "first" | "last") {
    const enabled = enabledItems();
    (which === "first" ? enabled[0] : enabled.at(-1))?.focus();
  }

  useEffect(() => {
    if (open && focusOnOpen !== null) focusItem(focusOnOpen);
  }, [open, focusOnOpen]);

  function openOn(which: "first" | "last") {
    if (open) {
      focusItem(which);
      return;
    }
    setFocusOnOpen(which);
    setOpen(true);
  }

  if (items.length === 0) return null;
  return (
    <div
      {...props}
      ref={(node) => {
        rootRef.current = node;
        assignRef(ref, node);
      }}
      data-slot="prompt-input-add-menu"
      data-state={open ? "open" : undefined}
      className={cn("relative inline-flex", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        data-slot="prompt-input-add-menu-trigger"
        className={cn(ICON_BUTTON, "aria-expanded:bg-muted")}
        onClick={() => (open ? setOpen(false) : openOn("first"))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openOn(event.key === "ArrowDown" ? "first" : "last");
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
      >
        <Plus className="size-4" aria-hidden />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          data-slot="prompt-input-add-menu-list"
          className={cn(POPUP, align === "start" ? "start-0" : "end-0")}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
              return;
            }
            if (event.key === "Tab") {
              // Back on the trigger before the browser moves focus, so Tab
              // and Shift+Tab carry on from where the menu was opened.
              setOpen(false);
              triggerRef.current?.focus();
              return;
            }
            const enabled = enabledItems();
            const current = enabled.findIndex(
              (item) => item === document.activeElement,
            );
            const next = stepIndex(event.key, current, enabled.length, true);
            if (next === undefined) return;
            event.preventDefault();
            enabled[next]?.focus();
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={item.disabled === true ? true : undefined}
              data-slot="prompt-input-add-menu-item"
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-start text-sm",
                "hover:bg-muted focus-visible:bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent",
              )}
              onClick={() => {
                if (item.disabled === true) return;
                close();
                item.onSelect();
              }}
            >
              {item.icon === undefined ? null : (
                <span
                  aria-hidden
                  className="grid size-4 shrink-0 place-items-center text-muted-foreground [&_svg]:size-3.5"
                >
                  {item.icon}
                </span>
              )}
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0">{item.label}</span>
                {item.detail === undefined ? null : (
                  <span className="truncate text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** An option as the shared select draws it. */
type SelectOption = {
  readonly id: string;
  /** What the trigger shows while this option is chosen. */
  readonly short: string;
  readonly name: string;
  readonly detail?: string | undefined;
  readonly group?: string | undefined;
};

type SelectGroup = {
  readonly name: string | undefined;
  readonly options: readonly SelectOption[];
};

/** Options grouped in order of each group's first appearance. */
function groupOptions(options: readonly SelectOption[]): SelectGroup[] {
  const groups: { name: string | undefined; options: SelectOption[] }[] = [];
  for (const option of options) {
    const group = groups.find((entry) => entry.name === option.group);
    if (group === undefined) {
      groups.push({ name: option.group, options: [option] });
    } else {
      group.options.push(option);
    }
  }
  return groups;
}

/** The value, open-state and layout props both selects share. */
type SelectStateProps = Omit<
  React.ComponentProps<"div">,
  "children" | "defaultValue" | "onChange"
> &
  PopupStateProps & {
    /** The chosen option's `id`. Supply it with `onValueChange` to own it. */
    readonly value?: string;
    /** Seeds the select's own state when `value` is not given. Without it,
     * the select shows the first option until one is chosen, including
     * options that arrive after mount; that default is not a choice, so it
     * does not call `onValueChange`. */
    readonly defaultValue?: string;
    readonly onValueChange?: (id: string) => void;
    /** Defaults to the enclosing `PromptInput`'s `disabled`. */
    readonly disabled?: boolean;
    readonly align?: PromptInputPopupAlign;
  };

type OptionSelectProps = SelectStateProps & {
  readonly slot: string;
  /** The trigger's and the list's accessible name; also what the trigger
   * shows while the value matches no option. */
  readonly label: string;
  readonly options: readonly SelectOption[];
};

/**
 * A select-only combobox: focus stays on the trigger, which points at the
 * current option with `aria-activedescendant` while the list is open, so
 * focus is already home when the list closes. Enter, Space or the arrows
 * open it on the chosen option, Home and End on the first or last; the
 * arrows move, Home and End jump, Enter or Space chooses, Escape and Tab
 * close without choosing. Escape from elsewhere in the enclosing
 * `PromptInput` (the textarea, beside a list the host opened) closes it too
 * and leaves focus where it is.
 */
function OptionSelect({
  slot,
  label,
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled: disabledProp,
  align = "start",
  className,
  ref,
  ...props
}: OptionSelectProps) {
  // Undefined until something is chosen: the first option then stands in,
  // read from the current list so options that load late still get it.
  const [picked, setPicked] = useControllableState<string | undefined>({
    value: valueProp,
    defaultValue,
    onChange:
      onValueChange === undefined
        ? undefined
        : (id) => {
            if (id !== undefined) onValueChange(id);
          },
    name: slot,
  });
  const popover = useDismissablePopover<HTMLDivElement, HTMLButtonElement>({
    open: openProp,
    defaultOpen,
    onOpenChange,
    closeOnEscape: false,
  });
  const { setOpen, rootRef, triggerRef, close } = popover;
  const boxDisabled = usePromptInputDisabled();
  const disabled = disabledProp ?? boxDisabled;
  const open = useClosedWhileDisabled(popover.open, disabled, setOpen);
  useClaimEscape(open, rootRef, setOpen);
  const listId = useId();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  // However the list closed (a press outside, the host), the next open
  // starts on the chosen option, so the highlight is dropped on close.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setActiveId(undefined);
  }

  const groups = groupOptions(options);
  // The order the arrows walk is the order on screen, groups and all.
  const ordered = groups.flatMap((group) => group.options);
  const value = picked ?? ordered[0]?.id;
  const chosen = ordered.find((option) => option.id === value);
  const current =
    ordered.find((option) => option.id === activeId) ?? chosen ?? ordered[0];
  const currentRef = useScrollCurrentIntoView<HTMLDivElement>(
    open ? (current?.id ?? "") : "",
  );

  const optionId = (option: SelectOption) =>
    `${listId}-${ordered.indexOf(option)}`;

  function show(option: SelectOption | undefined) {
    setActiveId(option?.id);
    setOpen(true);
  }

  function hide() {
    setActiveId(undefined);
    close();
  }

  function choose(option: SelectOption) {
    setPicked(option.id);
    hide();
  }

  if (ordered.length === 0) return null;

  const renderOption = (option: SelectOption) => {
    const active = option.id === current?.id;
    const selected = option.id === chosen?.id;
    return (
      <div
        key={option.id}
        ref={active ? currentRef : undefined}
        id={optionId(option)}
        role="option"
        aria-selected={selected}
        data-active={active ? "" : undefined}
        data-slot="prompt-input-select-option"
        className={cn(
          "flex cursor-default items-center gap-2 rounded-md px-2 py-1 text-sm data-[active]:bg-muted",
        )}
        // Focus stays on the trigger.
        onMouseDown={(event) => event.preventDefault()}
        onPointerMove={() => {
          if (!active) setActiveId(option.id);
        }}
        onClick={() => choose(option)}
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="shrink-0">{option.name}</span>
          {option.detail === undefined ? null : (
            <span className="truncate text-xs text-muted-foreground">
              {option.detail}
            </span>
          )}
        </span>
        <Check
          aria-hidden
          className={cn("size-3.5 shrink-0", !selected && "invisible")}
        />
      </div>
    );
  };

  return (
    <div
      {...props}
      ref={(node) => {
        rootRef.current = node;
        assignRef(ref, node);
      }}
      data-slot={slot}
      data-state={open ? "open" : undefined}
      className={cn("relative inline-flex min-w-0", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && current !== undefined ? optionId(current) : undefined
        }
        disabled={disabled}
        data-slot="prompt-input-select-trigger"
        className={cn(
          "inline-flex h-8 min-w-0 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground disabled:pointer-events-none disabled:opacity-50",
        )}
        onClick={() => (open ? hide() : show(chosen))}
        onKeyDown={(event) => {
          const { key } = event;
          if (!open) {
            if (key === "Home" || key === "End") {
              event.preventDefault();
              show(key === "Home" ? ordered[0] : ordered.at(-1));
            } else if (
              key === "ArrowDown" ||
              key === "ArrowUp" ||
              key === "Enter" ||
              key === " "
            ) {
              // Prevented so Enter's click does not toggle it straight back.
              event.preventDefault();
              show(chosen);
            }
            return;
          }
          if (key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            hide();
            return;
          }
          if (key === "Tab") {
            hide();
            return;
          }
          if (key === "Enter" || key === " ") {
            event.preventDefault();
            if (current !== undefined) choose(current);
            return;
          }
          const index = current === undefined ? -1 : ordered.indexOf(current);
          const next = stepIndex(key, index, ordered.length, false);
          if (next === undefined) return;
          event.preventDefault();
          setActiveId(ordered[next]?.id);
        }}
        // Space clicks a button on keyup; the keydown above has handled it.
        onKeyUp={(event) => {
          if (event.key === " ") event.preventDefault();
        }}
      >
        <span className="truncate">{chosen?.short ?? label}</span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0" />
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          data-slot="prompt-input-select-list"
          className={cn(POPUP, align === "start" ? "start-0" : "end-0")}
        >
          {groups.map((group, groupIndex) =>
            group.name === undefined ? (
              group.options.map(renderOption)
            ) : (
              <div
                key={group.name}
                role="group"
                aria-labelledby={`${listId}-group-${groupIndex}`}
                className="flex flex-col gap-px"
              >
                <div
                  id={`${listId}-group-${groupIndex}`}
                  className="px-2 pt-1.5 pb-0.5 text-xs font-medium text-muted-foreground"
                >
                  {group.name}
                </div>
                {group.options.map(renderOption)}
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/** A model to choose from in `PromptInputModelSelect`. */
export type PromptInputModelOption = {
  readonly id: string;
  readonly name: string;
  /** What the trigger shows while it is chosen; defaults to `name`. */
  readonly short?: string;
  readonly detail?: string;
  /** Models with the same group (a provider, say) are listed together
   * under it. */
  readonly group?: string;
};

export type PromptInputModelSelectProps = SelectStateProps & {
  readonly models: readonly PromptInputModelOption[];
  /** The accessible name; also shown when `value` matches no model. */
  readonly label?: string;
};

/**
 * Which model answers. The trigger shows the chosen model's short name; the
 * list groups models by `group`. A model only: anything finer, such as a
 * reasoning level, is a separate control, so `onValueChange` stays a single
 * model id.
 */
export function PromptInputModelSelect({
  models,
  label = "Model",
  align = "end",
  ...props
}: PromptInputModelSelectProps) {
  return (
    <OptionSelect
      {...props}
      slot="prompt-input-model-select"
      label={label}
      align={align}
      options={models.map((model) => ({
        id: model.id,
        short: model.short ?? model.name,
        name: model.name,
        detail: model.detail,
        group: model.group,
      }))}
    />
  );
}

/** A way of working, offered by `PromptInputModeSelect`. */
export type PromptInputModeOption = {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
};

export type PromptInputModeSelectProps = SelectStateProps & {
  readonly modes: readonly PromptInputModeOption[];
  /** The accessible name; also shown when `value` matches no mode. */
  readonly label?: string;
};

/** How the agent works this turn. The modes' labels and details are the
 * host's own strings; the trigger shows the chosen mode's label. */
export function PromptInputModeSelect({
  modes,
  label = "Mode",
  ...props
}: PromptInputModeSelectProps) {
  return (
    <OptionSelect
      {...props}
      slot="prompt-input-mode-select"
      label={label}
      options={modes.map((mode) => ({
        id: mode.id,
        short: mode.label,
        name: mode.label,
        detail: mode.detail,
      }))}
    />
  );
}

export type PromptInputFloatProps = React.ComponentProps<"div">;

/**
 * What floats above the box: the reply context, attachments, a notice.
 * Rendered inside `PromptInput`, it sits over the content above the box
 * rather than pushing it. It steps aside while the suggestion list or a
 * toolbar popup is open, since those open over the same spot.
 */
export function PromptInputFloat({
  className,
  ...props
}: PromptInputFloatProps) {
  return (
    <div
      {...props}
      data-slot="prompt-input-float"
      className={cn(
        "absolute inset-x-0 bottom-full z-10 mb-2 flex flex-col items-start gap-2",
        "[[data-slot=prompt-input]:has([data-slot=prompt-input-suggestions],[data-slot=prompt-input-select-list],[data-slot=prompt-input-add-menu-list])_&]:invisible",
        className,
      )}
    />
  );
}

export type PromptInputContextProps = Omit<
  React.ComponentProps<"div">,
  "children"
> & {
  /** What the next message answers, e.g. "Replying to". */
  readonly label: string;
  readonly detail?: string;
  /** Replaces the reply arrow. Decorative. */
  readonly icon?: React.ReactNode;
  /** Offered as a clear button when given. */
  readonly onClear?: () => void;
  /** The clear button's accessible name. */
  readonly clearLabel?: string;
};

/** A chip saying what the next message is about: the message it replies
 * to, the item it refers to. Usually inside `PromptInputFloat`. */
export function PromptInputContext({
  label,
  detail,
  icon,
  onClear,
  clearLabel = "Clear",
  className,
  ...props
}: PromptInputContextProps) {
  return (
    <div
      {...props}
      data-slot="prompt-input-context"
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted py-1 ps-2 pe-1 text-xs text-foreground",
        onClear === undefined && "pe-2",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid shrink-0 place-items-center text-muted-foreground [&_svg]:size-3.5"
      >
        {icon ?? <Reply />}
      </span>
      <span className="min-w-0 truncate">
        <span className="font-semibold">{label}</span>
        {detail === undefined ? null : <> {detail}</>}
      </span>
      {onClear === undefined ? null : (
        <button
          type="button"
          aria-label={clearLabel}
          data-slot="prompt-input-context-clear"
          className="grid size-5 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={onClear}
        >
          <X aria-hidden className="size-3" />
        </button>
      )}
    </div>
  );
}

export type PromptInputNoteProps = React.ComponentProps<"p">;

/** Small print under the box, such as a reminder that answers can be
 * wrong. Rendered after `PromptInput`, not inside it. */
export function PromptInputNote({ className, ...props }: PromptInputNoteProps) {
  return (
    <p
      {...props}
      data-slot="prompt-input-note"
      className={cn(
        "mt-2 px-2 text-center text-xs text-muted-foreground",
        className,
      )}
    />
  );
}
