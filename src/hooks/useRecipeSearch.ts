import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchRecipeSearch } from '../lib/api';

/**
 * 新版 Recipe 搜索（cursor 分页）的 infinite query。
 * 输入 q 空 → hook 禁用（enabled=false），不会打后端。
 *
 * 用于 `app/(tabs)/explore.tsx` 的搜索结果面板。
 */
export const useRecipeSearch = (q: string) => {
  const query = q.trim();
  return useInfiniteQuery({
    queryKey: ['recipe-search', query],
    queryFn: ({ pageParam }) =>
      fetchRecipeSearch(query, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 2,
  });
};
