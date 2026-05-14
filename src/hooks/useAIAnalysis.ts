// src/hooks/useAIAnalysis.ts
// AI 分析相关的 React Query hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAIQuota, analyzeRecipeForUser, AIQuotaInfo, AIAnalysisResult } from '../lib/api';

/**
 * 获取 AI 配额信息
 */
export const useAIQuota = (options?: { enabled?: boolean }) => {
  return useQuery<AIQuotaInfo>({
    queryKey: ['ai', 'quota'],
    queryFn: fetchAIQuota,
    enabled: options?.enabled !== false, // 默认启用，除非明确设置为 false
    staleTime: 1000 * 60 * 5, // 5 分钟内认为数据新鲜
    gcTime: 1000 * 60 * 10, // 10 分钟缓存
  });
};

/**
 * 请求 AI 分析菜谱
 */
export const useAnalyzeRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { recipeId: string; language: 'zh' | 'en' }) => {
      const result = await analyzeRecipeForUser(params.recipeId, params.language);
      if (!result.success) {
        // 抛出错误，包含 error code
        const error = new Error(result.error);
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      // 刷新配额信息
      queryClient.invalidateQueries({ queryKey: ['ai', 'quota'] });
    },
  });
};
