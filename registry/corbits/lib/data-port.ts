"use client";

import { createContext, useContext } from "react";

/**
 * A data port is the seam between a corbits-ui component and whatever fetches
 * its data. Components declare *what* they need (a stable key plus a fetch
 * thunk) and never learn how it is cached, deduped or revalidated.
 *
 * It is a plain record of functions produced by a factory
 * (`createTanstackDataPort()`), not a class hierarchy — so a host can swap in
 * SWR, Relay, a websocket cache or a fixture port with no inheritance and no
 * changes to the components.
 *
 * Collections only. Single-record reads and mutations are deliberately absent:
 * nothing in the registry has a caller for them yet, and guessing at a mutation
 * shape now would bake in the wrong one. Add `useRecord` / `useMutation` to
 * `DataPort` when the first real consumer lands.
 */

export type CollectionFetchArgs = {
  readonly signal: AbortSignal;
  /** `0` for the first page; thereafter the previous page's `nextOffset`. */
  readonly offset: number;
  /** Rows the caller wants. `undefined` means "the source decides". */
  readonly pageSize: number | undefined;
};

export type CollectionPage<T> = {
  readonly items: readonly T[];
  /** Offset to fetch next, or `null` when the collection is exhausted. */
  readonly nextOffset: number | null;
};

export type CollectionRequest<T> = {
  /** Stable cache identity, e.g. `["mail", mailboxId]`. */
  readonly key: readonly unknown[];
  readonly fetch: (args: CollectionFetchArgs) => Promise<CollectionPage<T>>;
  /** Skip fetching until prerequisites resolve. Defaults to true. */
  readonly enabled?: boolean;
  /** Rows per page. Omit for sources that return everything in one page. */
  readonly pageSize?: number;
};

export type CollectionResult<T> = {
  /** Every page fetched so far, flattened. */
  readonly items: readonly T[];
  /** First load — there is nothing to show yet. */
  readonly isLoading: boolean;
  /** Any request in flight, including a background refetch over cached data. */
  readonly isFetching: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
  readonly hasNextPage: boolean;
  readonly fetchNextPage: () => void;
};

export type DataPort = {
  readonly useCollection: <T>(request: CollectionRequest<T>) => CollectionResult<T>;
};

const DataPortContext = createContext<DataPort | null>(null);

export const DataPortProvider = DataPortContext.Provider;

export function useDataPort(): DataPort {
  const port = useContext(DataPortContext);
  if (port === null) {
    throw new Error("No DataPort in scope — wrap the tree in <DataPortProvider value={createTanstackDataPort()}>.");
  }
  return port;
}
