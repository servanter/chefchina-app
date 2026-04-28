import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  return useQuery<TopicDetail>({
    queryKey: ['topic', topicId],
    queryFn: () => fetchTopicDetail(topicId),
    enabled: !!topicId
  });
};

// 话题菜谱列表
export const useTopicRecipes = (
  topicId: string,
  sort: 'latest' | 'hot' = 'latest',
  page = 1
) => {
  return useQuery<TopicRecipesResponse>({
    queryKey: ['topic-recipes', topicId, sort, page],
    queryFn: () => fetchTopicRecipes(topicId, sort, page),
    enabled: !!topicId
  });
};

// 关注/取消关注话题
export const useToggleTopicFollow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicId, action }: { topicId: string; action: 'follow' | 'unfollow' }) =>
      toggleTopicFollow(topicId, action),
    onSuccess: (_, variables) => {
      // 刷新话题详情
      queryClient.invalidateQueries({ queryKey: ['topic', variables.topicId] });
      // 刷新我关注的话题列表
      queryClient.invalidateQueries({ queryKey: ['followed-topics'] });
    }
  });
};

// 我关注的话题列表
export const useFollowedTopics = (page = 1) => {
  return useQuery<FollowedTopicsResponse>({
    queryKey: ['followed-topics', page],
    queryFn: () => fetchFollowedTopics(page)
  });
};

// 热门搜索词
export const useTrendingKeywords = (limit = 10) => {
  return useQuery<TrendingResponse>({
    queryKey: ['trending-keywords', limit],
    queryFn: () => fetchTrendingKeywords(limit),
    staleTime: 5 * 60 * 1000 // 5分钟缓存
  });
};

// 记录搜索行为
export const useRecordSearch = () => {
  return useMutation({
    mutationFn: ({ query, resultCount, clicked }: { query: string; resultCount: number; clicked: boolean }) =>
      recordSearch(query, resultCount, clicked)
  });
};
