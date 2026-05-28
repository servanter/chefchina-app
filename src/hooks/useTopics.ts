import { useState, useEffect, useCallback } from 'react';
import {
  fetchTopicDetail,
  fetchTopicRecipes,
  toggleTopicFollow,
  fetchFollowedTopics,
  fetchTrendingKeywords,
  recordSearch,
  type TopicDetail,
  type TopicRecipesResponse,
  type FollowedTopicsResponse,
  type TrendingResponse
} from '@/lib/api';

// 话题详情
export const useTopicDetail = (topicId: string) => {
  const [data, setData] = useState<TopicDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!topicId) return;
    setIsLoading(true);
    try {
      const result = await fetchTopicDetail(topicId);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    if (topicId) load();
  }, [topicId, load]);

  return { data, isLoading, error, refetch: load };
};

// 话题菜谱列表
export const useTopicRecipes = (
  topicId: string,
  sort: 'latest' | 'hot' = 'latest',
  page = 1
) => {
  const [data, setData] = useState<TopicRecipesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!topicId) return;
    setIsLoading(true);
    try {
      const result = await fetchTopicRecipes(topicId, sort, page);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [topicId, sort, page]);

  useEffect(() => {
    if (topicId) load();
  }, [topicId, load]);

  return { data, isLoading, error, refetch: load };
};

// 关注/取消关注话题
export const useToggleTopicFollow = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (
    { topicId, action }: { topicId: string; action: 'follow' | 'unfollow' },
    callbacks?: { onSuccess?: () => void }
  ) => {
    setIsPending(true);
    try {
      const result = await toggleTopicFollow(topicId, action);
      callbacks?.onSuccess?.();
      return result;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
};

// 我关注的话题列表
export const useFollowedTopics = (page = 1) => {
  const [data, setData] = useState<FollowedTopicsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchFollowedTopics(page);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
};

// 热门搜索词
export const useTrendingKeywords = (limit = 10) => {
  const [data, setData] = useState<TrendingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchTrendingKeywords(limit);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
};

// 记录搜索行为
export const useRecordSearch = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async ({ query, resultCount, clicked }: { query: string; resultCount: number; clicked: boolean }) => {
    setIsPending(true);
    try {
      return await recordSearch(query, resultCount, clicked);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
};
