import { useState, useEffect } from 'react';
import { fetchSearchTrending, TrendingItem } from '../lib/api';

/**
 * FEAT-20260422-23: 拉取热门搜索词 TOP 榜。
 *
 * @param win '24h' | '7d' 滚动窗口；UI 可切 Tab
 */
export const useSearchTrending = (win: '24h' | '7d' = '24h') => {
  const [data, setData] = useState<TrendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchSearchTrending(win)
      .then(setData)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [win]);

  return { data, isLoading };
};
