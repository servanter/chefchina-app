import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  clearViewHistoryRemote,
  deleteViewHistoryRemote,
  fetchViewHistory,
  PAGE_SIZE,
  ViewHistoryPage,
  ViewHistoryRecipe,
} from '../lib/api';

export const useViewHistory = () => {
  return useInfiniteQuery<ViewHistoryPage>({
    queryKey: ['view-history'],
    queryFn: ({ pageParam = 1 }) => fetchViewHistory(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 1000 * 30,
  });
};

export const useDeleteViewHistory = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { historyId: string; recipeId?: string }>({
    mutationFn: ({ historyId, recipeId }) => deleteViewHistoryRemote(historyId, recipeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['view-history'] }),
  });
};

export const useClearViewHistory = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => clearViewHistoryRemote(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['view-history'] }),
  });
};

export const flattenHistoryPages = (pages?: ViewHistoryPage[]): ViewHistoryRecipe[] =>
  (pages ?? []).flatMap((page) => page.data);
