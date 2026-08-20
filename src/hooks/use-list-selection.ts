import { useCallback, useMemo, useReducer } from "react";

export type UseListSelectionOptions<TId extends string> = {
  /** The full, currently visible row order — range selection is anchored against this. */
  readonly ids: readonly TId[];
};

export type ToggleModifiers = {
  /** Extends the anchored range through the clicked row, like a Finder/Sheets shift-click. */
  readonly shiftKey?: boolean;
};

export type UseListSelectionResult<TId extends string> = {
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

const initialState: State<never> = { selectedIds: new Set(), anchorId: undefined, baseSelection: new Set() };

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
 */
export function useListSelection<TId extends string>({
  ids,
}: UseListSelectionOptions<TId>): UseListSelectionResult<TId> {
  const [state, dispatch] = useReducer(reducer<TId>, initialState as State<TId>);

  const toggle = useCallback(
    (id: TId, modifiers?: ToggleModifiers) =>
      dispatch({ type: "toggle", id, shiftKey: modifiers?.shiftKey ?? false, ids }),
    [ids],
  );

  const selectAll = useCallback(() => dispatch({ type: "selectAll", ids }), [ids]);

  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const isSelected = useCallback((id: TId) => state.selectedIds.has(id), [state.selectedIds]);

  return useMemo(
    () => ({
      selectedIds: state.selectedIds,
      selectedCount: state.selectedIds.size,
      isSelected,
      toggle,
      selectAll,
      clear,
    }),
    [state.selectedIds, isSelected, toggle, selectAll, clear],
  );
}

function toggleOne<TId>(current: ReadonlySet<TId>, id: TId): ReadonlySet<TId> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
