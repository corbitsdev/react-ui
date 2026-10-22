"use client";

import { Plus, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import type * as React from "react";
import { flushSync } from "react-dom";

import { useScrollCurrentIntoView } from "../hooks/use-scroll-current-into-view.js";
import { useTabDrag } from "../hooks/use-tab-drag.js";
import { panelTabIds } from "../hooks/use-tabs.js";
import { cn } from "../lib/utils.js";
import { Button } from "./button.js";

const isProduction =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production";

const TAB_SELECTOR = "[data-slot='panel-tab']";

type PanelTabsContextValue = {
  readonly value: string | null;
  readonly idPrefix: string;
  /** Whether tabs point at their panes with `aria-controls`. */
  readonly linked: boolean;
  readonly closable: boolean;
  readonly movable: boolean;
  readonly activeRef: React.RefObject<HTMLDivElement | null>;
  readonly select: (value: string) => void;
  readonly close: (value: string) => void;
  readonly onTabKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    value: string,
  ) => void;
  readonly onTabPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    value: string,
  ) => void;
};

const PanelTabsContext = createContext<PanelTabsContextValue | null>(null);

function tabElements(list: HTMLElement): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>(TAB_SELECTOR)];
}

function tabButton(list: HTMLElement, value: string): HTMLElement | null {
  const tab = tabElements(list).find(
    (element) => element.dataset["value"] === value,
  );
  return tab?.querySelector<HTMLElement>("[role='tab']") ?? null;
}

export type PanelTabsProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange" | "role"
> & {
  /** Names the row for assistive technology: "Open items". */
  readonly label: string;
  /** The selected tab, or `null` when none is open. */
  readonly value: string | null;
  /** Called with the tab to select: by click, or by the arrow keys. */
  readonly onValueChange: (value: string) => void;
  /**
   * Called to close a tab: by its ×, a middle-click, or Delete or
   * Backspace. The parent removes it, and selects another when it was the
   * selected one. Without it tabs have no ×.
   */
  readonly onClose?: ((value: string) => void) | undefined;
  /** Called to move a tab to `toIndex`: by drag, or Ctrl/Cmd+Shift+Arrow. */
  readonly onMove?: ((value: string, toIndex: number) => void) | undefined;
  /**
   * The prefix of each tab's id and its pane's id (see `panelTabIds`). With
   * it the selected tab points at its pane through `aria-controls`; give
   * each pane its id, `role="tabpanel"` and `aria-labelledby`. `useTabs`
   * supplies it in `tabsProps` and the pane's in `paneProps`.
   */
  readonly idPrefix?: string | undefined;
};

/**
 * A row of tabs for a `Panel`, holding `PanelTab`s. It owns no state: the
 * parent passes which tab is selected and what to do on select, close and
 * move, usually by spreading `useTabs`' `tabsProps`.
 *
 * Keyboard: Left/Right arrows, Home and End move between tabs, selecting as
 * they go; Delete or Backspace (the Mac "delete" key) closes the focused tab;
 * Ctrl/Cmd+Shift with an arrow moves it along the row. Pointer: click
 * selects, drag reorders (the others make room as it passes), middle-click
 * or the × closes. A long row scrolls sideways and keeps the selected tab in
 * view.
 *
 * The × is pointer-only by design: a tablist may contain only tabs, so it is
 * hidden from assistive technology and never takes focus. Keyboard users
 * close with Delete or Backspace instead. A touch screen-reader user (no
 * keyboard, and swipe navigation skips the ×) cannot close a tab from the
 * row, so a host serving them should also offer a named close control for
 * the selected tab, such as a button in the `PanelHeader` that calls
 * `useTabs`' `close`.
 *
 * It sits on the panel header's lower edge, with the selected tab joined to
 * the content below. Give the `PanelHeader` that holds it
 * `className="items-end bg-muted pt-1.5 pb-0"` so the row sits on the
 * header's border and the selected tab covers it. A `PanelTabAdd` goes
 * beside it in the header, not inside it.
 */
export function PanelTabs({
  label,
  value,
  onValueChange,
  onClose,
  onMove,
  idPrefix,
  ref,
  className,
  children,
  ...props
}: PanelTabsProps) {
  const generatedPrefix = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useScrollCurrentIntoView<HTMLDivElement>(value ?? "");

  const setList = useCallback(
    (element: HTMLDivElement | null) => {
      listRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref !== null && ref !== undefined) ref.current = element;
    },
    [ref],
  );

  useEffect(() => {
    const list = listRef.current;
    if (isProduction || list === null) return;
    const tabs = tabElements(list);
    if (tabs.length > 0 && !tabs.some((tab) => tab.dataset["value"] === value))
      console.error(
        "PanelTabs: `value` names none of its tabs, so no tab can take focus with Tab.",
      );
  });

  /** Puts focus back on the selected tab once a close or move has rendered. */
  const refocus = useCallback(
    (list: HTMLElement, panel: Element | null, moved: string | null) => {
      if (list.isConnected) {
        const target =
          moved === null
            ? list.querySelector<HTMLElement>(
                "[role='tab'][aria-selected='true']",
              )
            : tabButton(list, moved);
        if (target !== null) {
          // A move scrolls the tab into view here; after a close the new
          // selection's own scroll does that.
          target.focus({ preventScroll: moved === null });
          return;
        }
      }
      // The last tab closed and the panel stays open: go to its + if it has
      // one, else to the panel itself. A panel that closed has already
      // returned focus to whatever opened it.
      if (!(panel instanceof HTMLElement) || !panel.isConnected) return;
      const add = panel.querySelector<HTMLElement>(
        "[data-slot='panel-tab-add']",
      );
      (add ?? panel).focus();
    },
    [],
  );

  const close = useCallback(
    (closing: string) => {
      const list = listRef.current;
      if (list === null || onClose === undefined) return;
      const hadFocus = list.contains(document.activeElement);
      const panel = list.closest("[data-slot='panel']");
      // Rendered before focus moves, so a held Delete always acts on the
      // tab that has focus now.
      flushSync(() => onClose(closing));
      if (hadFocus) refocus(list, panel, null);
    },
    [onClose, refocus],
  );

  const move = useCallback(
    (moving: string, toIndex: number) => {
      const list = listRef.current;
      if (list === null || onMove === undefined) return;
      const hadFocus = list.contains(document.activeElement);
      flushSync(() => onMove(moving, toIndex));
      // React re-inserts moved nodes, which can drop focus from them.
      if (hadFocus) refocus(list, null, moving);
    },
    [onMove, refocus],
  );

  const { onPointerDown: onTabPointerDown } = useTabDrag({
    listRef,
    onMove: onMove === undefined ? undefined : move,
    itemSelector: TAB_SELECTOR,
  });

  const onTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: string,
  ) => {
    const list = listRef.current;
    if (list === null) return;
    const values = tabElements(list).map(
      (element) => element.dataset["value"] ?? "",
    );
    const index = values.indexOf(current);
    const rtl = getComputedStyle(list).direction === "rtl";
    const step =
      event.key === (rtl ? "ArrowLeft" : "ArrowRight")
        ? 1
        : event.key === (rtl ? "ArrowRight" : "ArrowLeft")
          ? -1
          : 0;

    if (step !== 0 && (event.ctrlKey || event.metaKey) && event.shiftKey) {
      if (onMove === undefined) return;
      event.preventDefault();
      const to = Math.min(Math.max(index + step, 0), values.length - 1);
      if (to !== index) move(current, to);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "Delete" || event.key === "Backspace") {
      if (onClose === undefined) return;
      event.preventDefault();
      close(current);
      return;
    }
    const next =
      step !== 0
        ? values[(index + step + values.length) % values.length]
        : event.key === "Home"
          ? values[0]
          : event.key === "End"
            ? values.at(-1)
            : undefined;
    if (next === undefined) return;
    event.preventDefault();
    onValueChange(next);
    // The selection scrolls the tab into view itself.
    tabButton(list, next)?.focus({ preventScroll: true });
  };

  return (
    <PanelTabsContext.Provider
      value={{
        value,
        idPrefix: idPrefix ?? generatedPrefix,
        linked: idPrefix !== undefined,
        closable: onClose !== undefined,
        movable: onMove !== undefined,
        activeRef,
        select: onValueChange,
        close,
        onTabKeyDown,
        onTabPointerDown,
      }}
    >
      <div
        ref={setList}
        role="tablist"
        aria-label={label}
        data-slot="panel-tabs"
        className={cn(
          "group/tabs relative -mb-px flex min-w-0 items-end overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </PanelTabsContext.Provider>
  );
}

export type PanelTabProps = Omit<
  React.ComponentProps<"button">,
  "value" | "type" | "role" | "children" | "id" | "tabIndex" | "ref"
> & {
  /** The tab's root element, which wraps the button and its ×. */
  readonly ref?: React.Ref<HTMLDivElement> | undefined;
  /** Names the tab; matched against `PanelTabs`' `value`. */
  readonly value: string;
  /** Shown before the label. */
  readonly icon?: React.ReactNode;
  /** The tab's label. */
  readonly children: React.ReactNode;
  /** The ×'s tooltip. */
  readonly closeLabel?: string;
};

/**
 * One tab. `ref` and `className` go to its root; every other prop goes to
 * its button, the element with `role="tab"`. The button's `id`, `tabIndex`,
 * `role` and ARIA state tie it to its pane and the row's single tab stop, so
 * they are not overridable. A long label is cut short, so pass `title` with
 * the full text.
 */
export function PanelTab({
  value,
  icon,
  closeLabel = "Close tab",
  ref,
  className,
  children,
  onClick,
  onKeyDown,
  ...props
}: PanelTabProps) {
  const context = useContext(PanelTabsContext);
  if (context === null) throw new Error("PanelTab must be inside PanelTabs.");
  const {
    value: selectedValue,
    idPrefix,
    linked,
    closable,
    movable,
    activeRef,
    select,
    close,
    onTabKeyDown,
    onTabPointerDown,
  } = context;
  const selected = value === selectedValue;
  const ids = panelTabIds(idPrefix, value);
  const setRoot = useCallback(
    (element: HTMLDivElement | null) => {
      if (selected) activeRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref !== null && ref !== undefined) ref.current = element;
    },
    [selected, activeRef, ref],
  );
  const shortcuts = [
    closable ? "Delete Backspace" : null,
    movable
      ? "Control+Shift+ArrowLeft Control+Shift+ArrowRight Meta+Shift+ArrowLeft Meta+Shift+ArrowRight"
      : null,
  ].filter((shortcut) => shortcut !== null);

  return (
    <div
      ref={setRoot}
      role="presentation"
      data-slot="panel-tab"
      data-state={selected ? "active" : "inactive"}
      data-value={value}
      onPointerDown={
        movable ? (event) => onTabPointerDown(event, value) : undefined
      }
      onMouseDown={
        closable
          ? (event) => {
              // Middle-click closes; without this it would start autoscroll.
              if (event.button === 1) event.preventDefault();
            }
          : undefined
      }
      onAuxClick={
        closable
          ? (event) => {
              if (event.button === 1) close(value);
            }
          : undefined
      }
      className={cn(
        "group/tab relative flex h-8 max-w-45 min-w-18 items-center rounded-t-md border border-b-0 border-transparent text-muted-foreground select-none",
        "hover:bg-background/60 hover:text-foreground",
        "data-[state=active]:z-10 data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground",
        "motion-safe:group-data-[dragging]/tabs:transition-transform motion-safe:group-data-[dragging]/tabs:duration-150 motion-safe:group-data-[dragging]/tabs:ease-out",
        "data-[dragging]:z-20 data-[dragging]:cursor-grabbing data-[dragging]:border-border data-[dragging]:bg-background data-[dragging]:shadow-surface motion-safe:data-[dragging]:transition-none",
        className,
      )}
    >
      <button
        {...props}
        type="button"
        role="tab"
        id={ids.tab}
        aria-selected={selected}
        aria-controls={linked && selected ? ids.pane : undefined}
        aria-keyshortcuts={
          shortcuts.length === 0 ? undefined : shortcuts.join(" ")
        }
        tabIndex={selected ? 0 : -1}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) select(value);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented) onTabKeyDown(event, value);
        }}
        className={cn(
          "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-t-md px-2 text-xs focus-visible:-outline-offset-2 [&_svg]:size-3.5 [&_svg]:shrink-0",
          closable &&
            "group-hover/tab:pe-6 group-data-[state=active]/tab:pe-6 [@media(hover:none)]:pe-6",
        )}
      >
        {icon === undefined ? null : (
          <span aria-hidden className="grid shrink-0 place-items-center">
            {icon}
          </span>
        )}
        <span className="truncate">{children}</span>
      </button>
      {closable ? (
        // A mouse affordance, hidden from assistive technology: the tab list
        // may hold only tabs, so keyboard and screen-reader users close the
        // focused tab with Delete or Backspace, which the tab announces in
        // `aria-keyshortcuts`. Never focusable, so focus stays on the tab.
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          title={closeLabel}
          data-slot="panel-tab-close"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => close(value)}
          className={cn(
            "absolute end-1 top-1/2 grid size-4 -translate-y-1/2 cursor-pointer place-items-center rounded-sm text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground [&_svg]:size-3",
            "group-hover/tab:opacity-100 group-data-[state=active]/tab:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        >
          <X aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export type PanelTabAddProps = Omit<
  React.ComponentProps<"button">,
  "children"
> & {
  /** The button's accessible name. */
  readonly label?: string;
};

/**
 * The + beside a `PanelTabs` row, for opening another tab. It is a plain
 * button: handle `onClick`, or wrap it in a menu trigger.
 */
export function PanelTabAdd({
  label = "Open a tab",
  className,
  ...props
}: PanelTabAddProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-slot="panel-tab-add"
      aria-label={label}
      title={label}
      className={cn("mb-0.5 size-7 self-end", className)}
      {...props}
    >
      <Plus aria-hidden />
    </Button>
  );
}
