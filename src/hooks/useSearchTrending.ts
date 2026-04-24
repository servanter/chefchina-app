import { useQuery } from '@tanstack/react-query';
import { fetchSearchTrending, TrendingItem } from '../lib/api';

/**
 * FEAT-20260422-23: 拉取热门搜索词 TOP 榜。
 *
 * staleTime 5 分钟 —— 热词榜不需要实时刷新，避免每次展开搜索面板都打后端。
 * gcTime 保持 react-query 默认即可。
 *
 * @param win '24h' | '7d' 滚动窗口；UI 可切 Tab
 */
export const useSearchTrending = (win: '24h' | '7d' = '24h') => {
  return useQuery<TrendingItem[]>({
    queryKey: ['search-trending', win],
    queryFn: () => fetchSearchTrending(win),
    staleTime: 1000 * 60 * 5,
  });
};
