import { useState, useCallback, useEffect } from 'react';
import {
  clearViewHistoryRemote,
  deleteViewHistoryRemote,
  fetchViewHistory,
  PAGE_SIZE,
  ViewHistoryPage,
  ViewHistoryRecipe,
} from '../lib/api';

export const useViewHistory = (enabled = true) => {
  const [items, setItems] = useState<ViewHistoryRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const load = useCallback(
    async (reset = false) => {
      if (!enabled) return;
      if (reset) {
        setItems([]);
        setHasNextPage(true);
        setIsRefreshing(true);
        setIsLoading(true);
        setCurrentPage(0);
      } else {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
      }
      const nextPage = reset ? 1 : currentPage + 1;
      try {
        const res: ViewHistoryPage = await fetchViewHistory(nextPage, PAGE_SIZE);
        setCurrentPage(nextPage);
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
    [enabled, hasNextPage, isFetchingNextPage, currentPage],
  );

  useEffect(() => {
    if (enabled) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const refetch = useCallback(() => load(true), [load]);
  const fetchNextPage = useCallback(() => load(false), [load]);

  return { items, isLoading, isRefreshing, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage };
};

export const useDeleteViewHistory = (refetch?: () => void) => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async ({ historyId, recipeId }: { historyId: string; recipeId?: string }) => {
    setIsPending(true);
    try {
      await deleteViewHistoryRemote(historyId, recipeId);
      refetch?.();
    } finally {
      setIsPending(false);
    }
  }, [refetch]);

  return { mutate, isPending };
};

export const useClearViewHistory = (refetch?: () => void) => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async () => {
    setIsPending(true);
    try {
      await clearViewHistoryRemote();
      refetch?.();
    } finally {
      setIsPending(false);
    }
  }, [refetch]);

  return { mutate, isPending };
};

// 工具函数（向后兼容，不再需要但保留）
export const flattenHistoryPages = (pages?: ViewHistoryPage[]): ViewHistoryRecipe[] =>
  (pages ?? []).flatMap((page) => page.data);
