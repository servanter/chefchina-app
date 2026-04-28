import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getApiUrl } from '@/lib/api';

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
  difficulty: string;
  avg_rating: number;
  likes_count: number;
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
  return useQuery({
    queryKey: ['search', query, type, filters],
    queryFn: async () => {
      if (!query.trim()) {
        return {
          recipes: [],
          users: [],
          topics: [],
          total: { recipes: 0, users: 0, topics: 0 },
        };
      }

      const params = new URLSearchParams({
        q: query.trim(),
        type,
        ...filters,
      });

      const url = `${getApiUrl()}/search?${params}`;
      const response = await axios.get<SearchResponse>(url);
      return response.data;
    },
    enabled: enabled && !!query.trim(),
    staleTime: 30000, // 30 seconds
  });
}
