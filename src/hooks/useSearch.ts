import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';

export type SearchType = 'recipe' | 'user' | 'topic';

export interface SearchRecipeResult {
  id: string;
  title: string;
  title_zh: string;
  description?: string;
  description_zh?: string;
  cover_image?: string;
  author_name: string;
  cook_time: number;
  prep_time: number; // 添加以满足 RecipeCard
  difficulty: string;
  avg_rating: number;
  likes_count: number;
  // RecipeCard 需要的其他字段
  category: string;
  servings: number;
  ingredients: any[];
  steps: any[];
  comments_count: number;
  favorites_count: number;
  ratings_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
  tags?: any[];
}

export interface SearchUserResult {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  recipes_count: number;
  followers_count: number;
}

export interface SearchTopicResult {
  id: string;
  name: string;
  name_zh: string;
  description?: string;
  description_zh?: string;
  recipes_count: number;
  followers_count: number;
}

export interface SearchResponse {
  recipes: SearchRecipeResult[];
  users: SearchUserResult[];
  topics: SearchTopicResult[];
  total: {
    recipes: number;
    users: number;
    topics: number;
  };
}

export interface SearchFilters {
  category?: string;
  difficulty?: string;
  cookTime?: string;
  sort?: string;
}

export function useSearch(
  query: string,
  type: SearchType = 'recipe',
  filters: SearchFilters = {},
  enabled: boolean = true
) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    if (!enabled || !query.trim()) {
      setData(null);
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.get<SearchResponse>('/search', {
        params: {
          q: query.trim(),
          type,
          ...filters,
        },
      });
      setData(response.data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, filtersKey, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
