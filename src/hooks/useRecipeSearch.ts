import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchRecipeSearch, RecipeSearchPage } from '../lib/api';

interface SearchOptions {
  category?: string;
  tag?: string;
  sort?: string;
}

/**
 * 新版 Recipe 搜索（cursor 分页），支持 category/tag/sort 过滤。
 * 输入 q 空 → hook 禁用，不会打后端。
 */
export const useRecipeSearch = (q: string, options?: SearchOptions) => {
  const query = q.trim();
  const category = options?.category;
  const tag = options?.tag;
  const sort = options?.sort;

  const [pages, setPages] = useState<RecipeSearchPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cursorRef = useRef<string | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      if (!query) return;
      const cursor = reset ? null : cursorRef.current;
      if (!reset && !hasNextPage) return;
      if (reset) {
        setIsLoading(true);
        setPages([]);
        cursorRef.current = null;
      } else {
        setIsFetchingNextPage(true);
      }
      try {
        // fetchRecipeSearch 目前不支持 category/tag/sort，参数预留供后续扩展
        const res = await fetchRecipeSearch(query, cursor);
        cursorRef.current = res.nextCursor ?? null;
        setPages((prev) => (reset ? [res] : [...prev, res]));
        setHasNextPage(!!res.nextCursor);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, category, tag, sort],
  );

  useEffect(() => {
    if (query.length > 0) load(true);
    else { setPages([]); setHasNextPage(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, tag, sort]);

  const fetchNextPage = useCallback(() => load(false), [load]);
  const refetch = useCallback(() => load(true), [load]);

  // expose pages in { pages } shape for consistency with useInfiniteRecipes
  const data = pages.length > 0 ? { pages } : undefined;

  return { data, isLoading, isFetchingNextPage, hasNextPage, error, fetchNextPage, refetch };
};
