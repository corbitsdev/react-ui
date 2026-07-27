
import { type CollectionRequest, useDataPort } from "../lib/data-port.js";

/**
 * Collapses a `CollectionResult` into the four states every collection surface
 * has to render, so a table, a list, a grid or a step rail can each branch on
 * the same thing instead of re-deriving it. It renders nothing — the surface
 * owns its own markup.
 */
export type CollectionState<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: Error }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly items: readonly T[] };

export type UseCollectionStateResult<T> = {
  readonly state: CollectionState<T>;
  /** True during background refetches too — wire this to `aria-busy`. */
  readonly isFetching: boolean;
  readonly refetch: () => void;
  readonly hasNextPage: boolean;
  readonly fetchNextPage: () => void;
};

export function useCollectionState<T>(request: CollectionRequest<T>): UseCollectionStateResult<T> {
  const { items, isLoading, isFetching, error, refetch, hasNextPage, fetchNextPage } =
    useDataPort().useCollection(request);

  const state: CollectionState<T> = isLoading
    ? { status: "loading" }
    : error !== null
      ? { status: "error", error }
      : items.length === 0
        ? { status: "empty" }
        : { status: "ready", items };

  return { state, isFetching, refetch, hasNextPage, fetchNextPage };
}
