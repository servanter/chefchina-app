// src/hooks/useAIAnalysis.ts
// AI 分析相关 hooks — 不依赖 React Query

import { useState, useCallback, useEffect } from 'react';
import { fetchAIQuota, analyzeRecipeForUser, AIQuotaInfo, AIAnalysisResult } from '../lib/api';

/**
 * 获取 AI 配额信息
 */
export const useAIQuota = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled !== false;
  const [data, setData] = useState<AIQuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const result = await fetchAIQuota();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
};

/**
 * 请求 AI 分析菜谱
 */
export const useAnalyzeRecipe = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (params: { recipeId: string; language: 'zh' | 'en' }): Promise<AIAnalysisResult | undefined> => {
    setIsPending(true);
    setError(null);
    try {
      const result = await analyzeRecipeForUser(params.recipeId, params.language);
      if (!result.success) {
        const err = new Error(result.error);
        setError(err);
        throw err;
      }
      return result.data;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
};
