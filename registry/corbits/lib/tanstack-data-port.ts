"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { CollectionRequest, CollectionResult, DataPort } from "@/registry/corbits/lib/data-port";

/**
 * Default DataPort. Requires a TanStack `QueryClientProvider` above it; the
 * host owns the client so its cache, retry and devtools settings apply.
 *
 * Every collection is an infinite query — a source that returns everything at
 * once simply reports `nextOffset: null` and never grows a second page. One
 * code path, no paginated/non-paginated branching.
 */
function useCollection<T>(request: CollectionRequest<T>): CollectionResult<T> {
  const query = useInfiniteQuery({
    queryKey: request.key,
    queryFn: ({ signal, pageParam }) => request.fetch({ signal, offset: pageParam, pageSize: request.pageSize }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset,
    enabled: request.enabled ?? true,
  });
  return {
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    // isPending is "no data yet". isFetching also covers background refetches
    // over cached rows, which isPending reports as idle — keep both.
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => void query.refetch(),
    hasNextPage: query.hasNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
  };
}

export function createTanstackDataPort(): DataPort {
  return { useCollection };
}
