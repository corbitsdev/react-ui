import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";

import { useControllableState } from "./use-controllable-state.js";

/** Anything shown as a tab: its `value` names it and is unique in the row. */
export type TabItem = { readonly value: string };

/**
 * The element ids that tie a tab to its pane. `value` is encoded, so a value
 * with spaces or punctuation still makes one valid id each.
 */
export function panelTabIds(
  idPrefix: string,
  value: string,
): { readonly tab: string; readonly pane: string } {
  // `.` never survives as itself, so the encoding cannot collide.
  const key = value.replace(
    /[^A-Za-z0-9_-]/g,
    (char) => `.${char.charCodeAt(0).toString(36)}.`,
  );
  return { tab: `${idPrefix}-tab-${key}`, pane: `${idPrefix}-pane-${key}` };
}

export type UseTabsOptions<Tab extends TabItem> = {
  /** The tabs open at first, in order. */
  readonly defaultTabs?: readonly Tab[] | undefined;
  /** Called with the new row whenever a tab opens, updates, closes or moves. */
  readonly onTabsChange?: ((tabs: readonly Tab[]) => void) | undefined;
  /** Controlled selected tab; `null` when no tab is open. */
  readonly value?: string | null | undefined;
  /** Seeds the selected tab when `value` is not supplied; the first tab by default. */
  readonly defaultValue?: string | null | undefined;
  readonly onValueChange?: ((value: string | null) => void) | undefined;
};

/** Spread onto `PanelTabs`. */
export type PanelTabsStateProps = {
  readonly value: string | null;
  readonly onValueChange: (value: string) => void;
  readonly onClose: (value: string) => void;
  readonly onMove: (value: string, toIndex: number) => void;
  readonly idPrefix: string;
};

/** Spread onto the pane a tab shows, such as a `PanelPane`. */
export type PanelTabPaneProps = {
  readonly id: string;
  readonly role: "tabpanel";
  readonly "aria-labelledby": string;
};

export type UseTabsResult<Tab extends TabItem> = {
  readonly tabs: readonly Tab[];
  /** The selected tab; `null` once every tab has closed. */
  readonly value: string | null;
  /** Adds `tab` at the end and selects it; a tab already open is replaced in place and selected. */
  readonly open: (tab: Tab) => void;
  /**
   * Merges `patch` into the open tab named `value`, such as a title that
   * arrives late. It keeps the tab's place and the selection, and does
   * nothing when that tab is not open or nothing in `patch` differs.
   */
  readonly update: (value: string, patch: Partial<Omit<Tab, "value">>) => void;
  readonly select: (value: string) => void;
  /**
   * Closes a tab. Closing the selected one selects its right neighbour, else
   * its left; closing another leaves the selection alone and reports nothing.
   */
  readonly close: (value: string) => void;
  /** Moves a tab to `toIndex`, held within the row. */
  readonly move: (value: string, toIndex: number) => void;
  readonly tabsProps: PanelTabsStateProps;
  readonly paneProps: (value: string) => PanelTabPaneProps;
};

const NO_TABS: readonly never[] = [];

/**
 * The open tabs of a panel, in order, and which one is selected: everything
 * `PanelTabs` asks its parent to decide. Spread `tabsProps` on `PanelTabs`
 * and `paneProps(value)` on each pane so every tab names the pane it shows.
 *
 * The row itself is this hook's state, reported through `onTabsChange`; the
 * selected tab can also be controlled with `value` and `onValueChange`. The
 * selected value is always one of the open tabs, or `null` when none is open.
 */
export function useTabs<Tab extends TabItem>(
  options: UseTabsOptions<Tab> = {},
): UseTabsResult<Tab> {
  const { defaultTabs = NO_TABS, onTabsChange } = options;
  const [tabs, setTabsState] = useState<readonly Tab[]>(defaultTabs);
  // Mirrors the row synchronously, so two changes in one event chain.
  const latestTabs = useRef(tabs);
  const [value, setSelected] = useControllableState<string | null>({
    value: options.value,
    defaultValue:
      options.defaultValue === undefined
        ? (defaultTabs[0]?.value ?? null)
        : options.defaultValue,
    onChange: options.onValueChange,
    name: "useTabs",
  });
  // The selection as this event has left it, so a close sees an open or
  // close before it in the same event, controlled or not. Each commit puts
  // back the rendered selection, which is what a controlled parent decided.
  const latestValue = useRef(value);
  useLayoutEffect(() => {
    latestValue.current = value;
  });
  const controlled = options.value !== undefined;
  const idPrefix = useId();

  /** Selects alongside a change to the row, which always renders. */
  const setValue = useCallback(
    (next: string | null) => {
      latestValue.current = next;
      setSelected(next);
    },
    [setSelected],
  );

  const setTabs = useCallback(
    (next: readonly Tab[]) => {
      latestTabs.current = next;
      setTabsState(next);
      onTabsChange?.(next);
    },
    [onTabsChange],
  );

  const open = useCallback(
    (tab: Tab) => {
      const previous = latestTabs.current;
      const index = previous.findIndex((item) => item.value === tab.value);
      setTabs(
        index === -1
          ? [...previous, tab]
          : previous.map((item, at) => (at === index ? tab : item)),
      );
      setValue(tab.value);
    },
    [setTabs, setValue],
  );

  const update = useCallback(
    (updating: string, patch: Partial<Omit<Tab, "value">>) => {
      const previous = latestTabs.current;
      const index = previous.findIndex((item) => item.value === updating);
      const tab = previous[index];
      if (tab === undefined) return;
      const changed = Object.entries(patch).some(
        ([key, next]) => !Object.is(tab[key as keyof Tab], next),
      );
      if (!changed) return;
      setTabs(
        previous.map((item, at) =>
          at === index ? { ...item, ...patch } : item,
        ),
      );
    },
    [setTabs],
  );

  const select = useCallback(
    (next: string) => {
      if (!latestTabs.current.some((item) => item.value === next)) return;
      // A controlled parent can turn a bare select down without rendering,
      // and then no commit would put the ref back.
      if (!controlled) latestValue.current = next;
      setSelected(next);
    },
    [controlled, setSelected],
  );

  const close = useCallback(
    (closing: string) => {
      const previous = latestTabs.current;
      const index = previous.findIndex((item) => item.value === closing);
      if (index === -1) return;
      const after = (previous[index + 1] ?? previous[index - 1])?.value ?? null;
      setTabs(previous.filter((_, at) => at !== index));
      if (latestValue.current === closing) setValue(after);
    },
    [setTabs, setValue],
  );

  const move = useCallback(
    (moving: string, toIndex: number) => {
      const previous = latestTabs.current;
      const from = previous.findIndex((item) => item.value === moving);
      const to = Math.min(Math.max(toIndex, 0), previous.length - 1);
      const tab = previous[from];
      if (tab === undefined || to === from) return;
      const next = previous.filter((_, at) => at !== from);
      next.splice(to, 0, tab);
      setTabs(next);
    },
    [setTabs],
  );

  const paneProps = useCallback(
    (paneValue: string): PanelTabPaneProps => {
      const ids = panelTabIds(idPrefix, paneValue);
      return { id: ids.pane, role: "tabpanel", "aria-labelledby": ids.tab };
    },
    [idPrefix],
  );

  return {
    tabs,
    value,
    open,
    update,
    select,
    close,
    move,
    tabsProps: {
      value,
      onValueChange: select,
      onClose: close,
      onMove: move,
      idPrefix,
    },
    paneProps,
  };
}
