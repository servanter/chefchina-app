import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, QueryKey } from '@tanstack/react-query';

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface UseInfiniteListOptions<T> {
  queryKey: QueryKey;
  /**
   * Cursor-based fetcher. Receives `{ cursor, limit }` and must return
   * `{ items, nextCursor }`.
   */
  fetcher: (params: { cursor: string | null; limit: number }) => Promise<CursorPage<T>>;
  /** Page size sent as `limit` to the fetcher. */
  limit?: number;
  /** When false, the query is disabled (same semantics as React Query). */
  enabled?: boolean;
  /** staleTime in ms. Defaults to 2 minutes. */
  staleTime?: number;
}

/**
 * useInfiniteList · 需求 12
 *
 * 统一包装 React Query 的 `useInfiniteQuery`，提供一套和页面层更贴近的返回：
 *   { items, isLoading, isRefreshing, isFetchingNextPage, refetch,
 *     fetchNextPage, hasNextPage, error }
 *
 * fetcher 契约：接受 `{ cursor?, limit }`，返回 `{ items, nextCursor }`。
 *   - 第一页 cursor 为 null
 *   - 若 nextCursor 为 null，表示没有更多
 */
export function useInfiniteList<T>({
  queryKey,
  fetcher,
  limit = 20,
  enabled = true,
  staleTime = 1000 * 60 * 2,
}: UseInfiniteListOptions<T>) {
  // 手动追踪 pull-to-refresh 状态 —— refetch 并不会改 isRefetching（足够但语义不清）
  const [isRefreshing, setIsRefreshing] = useState(false);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetcher({ cursor: (pageParam as string | null) ?? null, limit }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime,
  });

  const items = useMemo(
    () => (query.data?.pages ?? []).flatMap((p) => p.items),
    [query.data],
  );

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [query]);

  return {
    items,
    isLoading: query.isLoading,
    isRefreshing,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: !!query.hasNextPage,
    error: query.error,
  };
}

export default useInfiniteList;
