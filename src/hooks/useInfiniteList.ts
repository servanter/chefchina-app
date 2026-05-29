// src/hooks/useInfiniteList.ts
// 通用分页 hook — 不依赖 React Query
import { useState, useCallback, useRef } from 'react';

interface PageData<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface UseInfiniteListOptions<T> {
  queryFn: (page: number) => Promise<PageData<T>>;
  enabled?: boolean;
}

export function useInfiniteList<T>({ queryFn, enabled = true }: UseInfiniteListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pageRef = useRef(0);

  const load = useCallback(
    async (reset = false) => {
      if (!enabled) return;
      if (reset) {
        pageRef.current = 0;
        setItems([]);
        setHasNextPage(true);
        setIsRefreshing(true);
        setIsLoading(true);
      } else {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
      }
      const nextPage = pageRef.current + 1;
      try {
        const res = await queryFn(nextPage);
        pageRef.current = nextPage;
        setItems((prev) => (reset ? res.data : [...prev, ...res.data]));
        setHasNextPage(nextPage < res.pagination.totalPages);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetchingNextPage(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryFn, enabled],
  );

  const refetch = useCallback(() => load(true), [load]);
  const fetchNextPage = useCallback(() => load(false), [load]);

  return { items, isLoading, isRefreshing, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage };
}

export default useInfiniteList;
