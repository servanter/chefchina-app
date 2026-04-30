import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchRecipes,
  fetchRecipeById,
  fetchFeaturedRecipes,
  fetchCategories,
  fetchTags,
  toggleLike,
  toggleFavorite,
  fetchFavorites,
  fetchFavoritesPaged,
  fetchComments,
  fetchCommentsPaged,
  fetchMyRecipes,
  postComment,
  updateRecipe,
  deleteRecipe,
  unpublishRecipe,
  updateComment,
  deleteComment,
  republishRecipe,
  fetchHomeInit,
  fetchRecipeDetailFull,
  fetchTagRecipes,
  fetchCategoryRecipes,
  PAGE_SIZE,
  Recipe,
  Comment,
  Category,
  Tag,
  HomeInitData,
  RecipeDetailFullData,
} from '../lib/api';
import { MOCK_RECIPES, MOCK_COMMENTS } from '../lib/mockData';
import { useInfiniteList } from './useInfiniteList';

// Toggle to use mock data when backend is unavailable
const USE_MOCK = false;

// ─── Recipes ──────────────────────────────────────────────────────────────────

export const useRecipes = (params?: {
  category?: string;
  difficulty?: string;
  search?: string;
  sort?: 'recommended' | 'latest' | 'popular';
  tagId?: string;
}) => {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: async () => {
      if (USE_MOCK) {
        let data = [...MOCK_RECIPES];
        if (params?.category && params.category !== 'all') {
          data = data.filter((r) => r.category === params.category);
        }
        if (params?.difficulty && params.difficulty !== 'all') {
          data = data.filter((r) => r.difficulty === params.difficulty);
        }
        if (params?.search) {
          const q = params.search.toLowerCase();
          data = data.filter(
            (r) =>
              r.title.toLowerCase().includes(q) ||
              r.title_zh.includes(q) ||
              r.description.toLowerCase().includes(q),
          );
        }
        return { data, page: 1, limit: 20, total: data.length, hasMore: false };
      }
      return fetchRecipes(params);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useInfiniteRecipes = (params?: {
  category?: string;
  difficulty?: string;
  search?: string;
  sort?: 'recommended' | 'latest' | 'popular';
  tagId?: string;
}) => {
  return useInfiniteQuery({
    queryKey: ['recipes', 'infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      if (USE_MOCK) {
        let data = [...MOCK_RECIPES];
        if (params?.category && params.category !== 'all') {
          data = data.filter((r) => r.category === params.category);
        }
        if (params?.difficulty && params.difficulty !== 'all') {
          data = data.filter((r) => r.difficulty === params.difficulty);
        }
        if (params?.search) {
          const q = params.search.toLowerCase();
          data = data.filter(
            (r) =>
              r.title.toLowerCase().includes(q) ||
              r.title_zh.includes(q),
          );
        }
        return {
          data,
          pagination: { page: pageParam as number, pageSize: PAGE_SIZE, total: data.length, totalPages: 1 },
          page: pageParam as number,
          limit: PAGE_SIZE,
          total: data.length,
          hasMore: false,
        };
      }
      return fetchRecipes({ ...params, page: pageParam as number, pageSize: PAGE_SIZE });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 1000 * 60 * 5,
  });
};

export const useFeaturedRecipes = () => {
  return useQuery({
    queryKey: ['recipes', 'featured'],
    queryFn: async () => {
      if (USE_MOCK) return MOCK_RECIPES.slice(0, 3);
      return fetchFeaturedRecipes();
    },
    staleTime: 1000 * 60 * 10,
  });
};

export const useRecipeById = (id: string) => {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      if (USE_MOCK) {
        const found = MOCK_RECIPES.find((r) => r.id === id);
        if (!found) throw new Error('Recipe not found');
        return found;
      }
      return fetchRecipeById(id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useHomeInit = (userId?: string | null, authLoading?: boolean) => {
  // 统一处理：guest 视为未登录，不传 userId
  const normalizedUserId = userId && userId !== 'guest' ? userId : undefined;
  const cacheMinutes = normalizedUserId ? 2 : 5;

  return useQuery<HomeInitData>({
    queryKey: ['home-init', normalizedUserId ?? 'anonymous'],
    queryFn: () => fetchHomeInit(normalizedUserId),
    enabled: !authLoading, // 等待 auth 加载完成
    staleTime: 1000 * 60 * cacheMinutes,
  });
};

export const useRecipeDetailFull = (id: string, userId?: string | null, authLoading?: boolean) => {
  // 统一处理：guest 视为未登录，不传 userId
  const normalizedUserId = userId && userId !== 'guest' ? userId : undefined;

  return useQuery<RecipeDetailFullData>({
    queryKey: ['recipe-detail-full', id, normalizedUserId ?? 'anonymous'],
    queryFn: () => fetchRecipeDetailFull(id, normalizedUserId),
    enabled: !!id && !authLoading, // 等待 auth 加载完成
    staleTime: 0, // 不缓存，每次都重新请求
  });
};

export const useMyRecipes = (status: 'all' | 'draft' | 'published' = 'all') => {
  return useInfiniteQuery({
    queryKey: ['my-recipes', status],
    queryFn: async ({ pageParam = 1 }) => fetchMyRecipes(pageParam as number, PAGE_SIZE, status),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 1000 * 60,
  });
};

export const useUpdateRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, payload }: { recipeId: string; payload: any }) =>
      updateRecipe(recipeId, payload),
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipe.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => deleteRecipe(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

export const useRepublishRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => republishRecipe(recipeId),
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipe.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

export const useUnpublishRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => unpublishRecipe(recipeId),
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipe.id] });
      queryClient.invalidateQueries({ queryKey: ['recipe-detail-full', recipe.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

// ─── Likes ────────────────────────────────────────────────────────────────────

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, userId }: { recipeId: string; userId: string }) =>
      toggleLike(recipeId, userId),
    onSuccess: (data, variables) => {
      // 立即重新请求详情页数据（匹配完整的 queryKey）
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const [key, id] = query.queryKey as [string, string, string?];
          return key === 'recipe-detail-full' && id === variables.recipeId;
        }
      });
    },
  });
};

// ─── Favorites ────────────────────────────────────────────────────────────────

export const useFavorites = (userId: string) => {
  return useQuery({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      if (USE_MOCK) return MOCK_RECIPES.slice(0, 2);
      return fetchFavorites(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useInfiniteFavorites = (userId: string) => {
  return useInfiniteQuery({
    queryKey: ['favorites', 'infinite', userId],
    queryFn: async ({ pageParam = 1 }) => {
      if (USE_MOCK) {
        const data = MOCK_RECIPES.slice(0, 2);
        return {
          data,
          pagination: { page: pageParam as number, pageSize: PAGE_SIZE, total: data.length, totalPages: 1 },
        };
      }
      return fetchFavoritesPaged(userId, pageParam as number, PAGE_SIZE);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: !!userId && userId !== 'guest',
    staleTime: 1000 * 60 * 2,
  });
};

/**
 * useInfiniteFavoritesList · 基于需求 12 的 useInfiniteList 的薄包装。
 *
 * 对外暴露 cursor 契约：fetcher 接受 `{ cursor, limit }`（cursor 为下一页 page 字符串，
 * null 即第一页），内部仍调用 `fetchFavoritesPaged`（page/pageSize 分页），
 * 由包装层把 page ↔ cursor 做字符串化转换。
 *
 * 同时返回 `total` 字段，方便页面显示"x 条收藏"。
 */
export const useInfiniteFavoritesList = (userId: string) => {
  // 手动追踪 total（useInfiniteList 本身不感知业务 total 字段）
  const queryClient = useQueryClient();

  const enabled = !!userId && userId !== 'guest';

  const list = useInfiniteList<Recipe>({
    queryKey: ['favorites', 'infinite', 'cursor', userId],
    enabled,
    limit: PAGE_SIZE,
    fetcher: async ({ cursor, limit }) => {
      if (USE_MOCK) {
        const data = MOCK_RECIPES.slice(0, 2);
        return { items: data, nextCursor: null };
      }
      const page = cursor ? Number(cursor) : 1;
      const res = await fetchFavoritesPaged(userId, page, limit);
      // 把 total 顺带缓存，供 UI 显示
      queryClient.setQueryData(
        ['favorites', 'infinite', 'cursor', userId, 'total'],
        res.pagination.total,
      );
      const hasMore = res.pagination.page < res.pagination.totalPages;
      return {
        items: res.data,
        nextCursor: hasMore ? String(res.pagination.page + 1) : null,
      };
    },
  });

  const total =
    queryClient.getQueryData<number>([
      'favorites',
      'infinite',
      'cursor',
      userId,
      'total',
    ]) ?? list.items.length;

  return { ...list, total };
};

export const useTagRecipes = (tagId: string) => {
  return useInfiniteQuery({
    queryKey: ['tag-recipes', tagId],
    queryFn: async ({ pageParam = 1 }) => fetchTagRecipes(tagId, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: !!tagId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, userId }: { recipeId: string; userId: string }) =>
      toggleFavorite(recipeId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['favorites', 'infinite', variables.userId] });
      queryClient.invalidateQueries({
        queryKey: ['favorites', 'infinite', 'cursor', variables.userId],
      });
      // 立即重新请求详情页数据（匹配完整的 queryKey）
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const [key, id] = query.queryKey as [string, string, string?];
          return key === 'recipe-detail-full' && id === variables.recipeId;
        }
      });
    },
  });
};

// ─── Comments ─────────────────────────────────────────────────────────────────

export const useComments = (recipeId: string) => {
  return useQuery<Comment[]>({
    queryKey: ['comments', recipeId],
    queryFn: async (): Promise<Comment[]> => {
      if (USE_MOCK) {
        return MOCK_COMMENTS.filter((c) => c.recipe_id === recipeId) as Comment[];
      }
      return fetchComments(recipeId);
    },
    enabled: !!recipeId,
  });
};

export const useInfiniteComments = (recipeId: string) => {
  return useInfiniteQuery({
    queryKey: ['comments', 'infinite', recipeId],
    queryFn: async ({ pageParam = 1 }) => {
      if (USE_MOCK) {
        const data = MOCK_COMMENTS.filter((c) => c.recipe_id === recipeId) as Comment[];
        return {
          data,
          pagination: { page: pageParam as number, pageSize: PAGE_SIZE, total: data.length, totalPages: 1 },
        };
      }
      return fetchCommentsPaged(recipeId, pageParam as number, PAGE_SIZE);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: !!recipeId,
  });
};

export const usePostComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postComment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.recipe_id] });
      queryClient.invalidateQueries({ queryKey: ['comments', 'infinite', variables.recipe_id] });
      queryClient.invalidateQueries({ queryKey: ['recipe-detail-full', variables.recipe_id] });
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      updateComment(commentId, { content }),
    onSuccess: (comment) => {
      queryClient.invalidateQueries({ queryKey: ['comments', comment.recipe_id] });
      queryClient.invalidateQueries({ queryKey: ['comments', 'infinite', comment.recipe_id] });
      queryClient.invalidateQueries({ queryKey: ['recipe-detail-full', comment.recipe_id] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, recipeId }: { commentId: string; recipeId: string }) =>
      deleteComment(commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.recipeId] });
      queryClient.invalidateQueries({ queryKey: ['comments', 'infinite', variables.recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe-detail-full', variables.recipeId] });
    },
  });
};

// ─── Categories ───────────────────────────────────────────────────────────────

const ALL_CATEGORY: Category = { id: 'all', label: 'All', label_zh: '全部', slug: 'all', recipesCount: 0 };

export const useCategories = () => {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const cats = await fetchCategories();
      return [ALL_CATEGORY, ...cats];
    },
    staleTime: 1000 * 60 * 10, // 10分钟缓存
  });
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const useTags = () => {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: fetchTags,
    staleTime: 1000 * 60 * 10,
  });
};

export const useCategoryRecipes = (
  categoryId: string,
  sort: 'newest' | 'popular' | 'favorites' = 'popular'
) => {
  return useInfiniteQuery({
    queryKey: ['category-recipes', categoryId, sort],
    queryFn: async ({ pageParam = 1 }) =>
      fetchCategoryRecipes(categoryId, pageParam as number, PAGE_SIZE, sort),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
  });
};
