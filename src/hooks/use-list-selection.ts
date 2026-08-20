import { useCallback, useMemo, useReducer, useRef } from "react";

export type UseListSelectionOptions<TId extends PropertyKey> = {
  /**
   * The full, currently visible row order — range selection is anchored
   * against this, and it is also what a stale selection gets reconciled
   * against (see `selectedIds` below). Ids must be unique: a duplicate
   * makes `indexOf` resolve to whichever occurrence comes first, so a
   * shift-click range would sweep rows the person never actually crossed.
   */
  readonly ids: readonly TId[];
};

export type ToggleModifiers = {
  /** Extends the anchored range through the clicked row, like a Finder/Sheets shift-click. */
  readonly shiftKey?: boolean;
};

export type UseListSelectionResult<TId extends PropertyKey> = {
  /**
   * Selected ids, reconciled against the `ids` this call was given — an id
   * a refetch or a filter change dropped from `ids` is filtered out here
   * even though the hook still remembers it internally (see below), so
   * this is always an honest subset of what is actually on screen.
   */
  readonly selectedIds: ReadonlySet<TId>;
  readonly selectedCount: number;
  readonly isSelected: (id: TId) => boolean;
  /**
   * Toggle one row. Plain click and cmd/ctrl-click both land here — the
   * distinction between "replace selection" and "add to selection" is a
   * caller-side concern this hook does not have an opinion on, since it
   * never clears the rest of the selection on your behalf. Pass
   * `shiftKey: true` to extend the last-toggled row's anchor through `id`
   * instead of toggling `id` alone.
   */
  readonly toggle: (id: TId, modifiers?: ToggleModifiers) => void;
  readonly selectAll: () => void;
  readonly clear: () => void;
};

type State<TId> = {
  readonly selectedIds: ReadonlySet<TId>;
  readonly anchorId: TId | undefined;
  // The selection as it stood right after the last plain (non-shift) toggle
  // — what a shift-click's range gets unioned onto. Without this, a second
  // shift-click in a new direction would union onto the *previous* shift
  // range instead of replacing it, leaving stray rows selected outside the
  // span the person is now looking at.
  readonly baseSelection: ReadonlySet<TId>;
};

type Action<TId> =
  | { readonly type: "toggle"; readonly id: TId; readonly shiftKey: boolean; readonly ids: readonly TId[] }
  | { readonly type: "selectAll"; readonly ids: readonly TId[] }
  | { readonly type: "clear" };

function reducer<TId>(state: State<TId>, action: Action<TId>): State<TId> {
  switch (action.type) {
    case "clear":
      return { selectedIds: new Set(), anchorId: undefined, baseSelection: new Set() };
    case "selectAll": {
      const all = new Set(action.ids);
      return { selectedIds: all, anchorId: state.anchorId, baseSelection: all };
    }
    case "toggle": {
      const { id, shiftKey, ids } = action;
      if (shiftKey && state.anchorId !== undefined) {
        const anchorIndex = ids.indexOf(state.anchorId);
        const targetIndex = ids.indexOf(id);
        if (anchorIndex === -1 || targetIndex === -1) {
          // The anchor or target scrolled out of the known set — fall back
          // to a plain toggle rather than ranging over an index that no
          // longer means anything.
          const next = toggleOne(state.selectedIds, id);
          return { selectedIds: next, anchorId: id, baseSelection: next };
        }
        const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        const range = ids.slice(start, end + 1);
        const selectedIds = new Set(state.baseSelection);
        for (const rangeId of range) selectedIds.add(rangeId);
        return { ...state, selectedIds };
      }

      const next = toggleOne(state.selectedIds, id);
      return { selectedIds: next, anchorId: id, baseSelection: next };
    }
  }
}

function createInitialState<TId>(): State<TId> {
  return { selectedIds: new Set(), anchorId: undefined, baseSelection: new Set() };
}

/**
 * Headless selection state for a list/table: toggle-by-id, shift-click range
 * selection anchored on the last row toggled outside a range, and
 * select-all/clear. Renders nothing and owns no DOM — `SelectionCheckbox` and
 * `BulkActionBar` are the rendered halves of this.
 *
 * The anchor is the last id passed to `toggle` *without* `shiftKey` — the
 * same row a Finder/Sheets shift-click ranges from. A shift-click does not
 * move the anchor, so a person can shift-click several times in a row (even
 * in different directions) and each click re-ranges from the same start
 * rather than from wherever they last landed.
 *
 * **Stale-id reconciliation.** The hook keeps whatever was selected even
 * after a row drops out of `ids` (a refetch, a filter change) rather than
 * pruning it immediately — pruning on every `ids` change would need an
 * effect, and an extra render on top of whatever caused `ids` to change in
 * the first place. Instead `selectedIds`/`selectedCount`/`isSelected` are
 * reconciled against the current `ids` on every read, so a stale id can
 * never inflate the count or reach the caller; it simply stops counting
 * once its row is gone, and starts counting again if the same id reappears
 * (e.g. a filter that got cleared) with no action needed from the caller.
 *
 * **Stable callbacks.** `toggle`/`selectAll`/`clear` read `ids` through a
 * ref rather than closing over the `ids` array directly, so their identity
 * stays stable across renders even when a caller passes a freshly allocated
 * array each time (e.g. an inline `rows.map(row => row.id)`) — a memoized
 * row downstream that depends on `toggle` does not re-render just because
 * the caller didn't bother memoizing `ids`.
 */
export function useListSelection<TId extends PropertyKey>({
  ids,
}: UseListSelectionOptions<TId>): UseListSelectionResult<TId> {
  const [state, dispatch] = useReducer(reducer<TId>, undefined, createInitialState<TId>);

  // Updated on every render, read only inside event handlers — never during
  // render — so `toggle`/`selectAll` can stay referentially stable while
  // still acting on the `ids` most recently passed in.
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const toggle = useCallback(
    (id: TId, modifiers?: ToggleModifiers) =>
      dispatch({ type: "toggle", id, shiftKey: modifiers?.shiftKey ?? false, ids: idsRef.current }),
    [],
  );

  const selectAll = useCallback(() => dispatch({ type: "selectAll", ids: idsRef.current }), []);

  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const selectedIds = useMemo(() => {
    const known = new Set(ids);
    const reconciled = new Set<TId>();
    for (const id of state.selectedIds) if (known.has(id)) reconciled.add(id);
    return reconciled;
  }, [state.selectedIds, ids]);

  const isSelected = useCallback((id: TId) => selectedIds.has(id), [selectedIds]);

  return useMemo(
    () => ({ selectedIds, selectedCount: selectedIds.size, isSelected, toggle, selectAll, clear }),
    [selectedIds, isSelected, toggle, selectAll, clear],
  );
}

function toggleOne<TId>(current: ReadonlySet<TId>, id: TId): ReadonlySet<TId> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
