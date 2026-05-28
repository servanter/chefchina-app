import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      if (USE_MOCK) {
        let d = [...MOCK_RECIPES];
        if (params?.category && params.category !== 'all') {
          d = d.filter((r) => r.category === params.category);
        }
        if (params?.difficulty && params.difficulty !== 'all') {
          d = d.filter((r) => r.difficulty === params.difficulty);
        }
        if (params?.search) {
          const q = params.search.toLowerCase();
          d = d.filter(
            (r) =>
              r.title.toLowerCase().includes(q) ||
              r.title_zh.includes(q) ||
              r.description.toLowerCase().includes(q),
          );
        }
        setData({ data: d, page: 1, limit: 20, total: d.length, hasMore: false });
      } else {
        const result = await fetchRecipes(params);
        setData(result);
      }
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
};

export const useInfiniteRecipes = (params?: {
  category?: string;
  difficulty?: string;
  search?: string;
  sort?: 'recommended' | 'latest' | 'popular';
  tagId?: string;
}) => {
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pageRef = useRef(0);
  const paramsKey = JSON.stringify(params);

  const load = useCallback(
    async (reset: boolean) => {
      const nextPage = reset ? 1 : pageRef.current + 1;
      if (reset) {
        setIsLoading(true);
        setPages([]);
        pageRef.current = 0;
      } else {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
      }
      try {
        let page: any;
        if (USE_MOCK) {
          let d = [...MOCK_RECIPES];
          if (params?.category && params.category !== 'all')
            d = d.filter((r) => r.category === params.category);
          if (params?.difficulty && params.difficulty !== 'all')
            d = d.filter((r) => r.difficulty === params.difficulty);
          if (params?.search) {
            const q = params.search.toLowerCase();
            d = d.filter((r) => r.title.toLowerCase().includes(q) || r.title_zh.includes(q));
          }
          page = {
            data: d,
            pagination: { page: nextPage, pageSize: PAGE_SIZE, total: d.length, totalPages: 1 },
          };
        } else {
          page = await fetchRecipes({ ...params, page: nextPage, pageSize: PAGE_SIZE });
        }
        pageRef.current = nextPage;
        setPages((prev) => (reset ? [page] : [...prev, page]));
        setHasNextPage(page.pagination.page < page.pagination.totalPages);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsKey],
  );

  useEffect(() => {
    load(true);
  }, [paramsKey]);

  const refetch = useCallback(() => load(true), [load]);
  const fetchNextPage = useCallback(() => load(false), [load]);
  const data = pages.length > 0 ? { pages } : undefined;

  return { data, isLoading, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage };
};

export const useFeaturedRecipes = () => {
  const [data, setData] = useState<Recipe[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      if (USE_MOCK) setData(MOCK_RECIPES.slice(0, 3));
      else setData(await fetchFeaturedRecipes());
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, error, refetch: load };
};

export const useRecipeById = (id: string) => {
  const [data, setData] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      if (USE_MOCK) {
        const found = MOCK_RECIPES.find((r) => r.id === id);
        if (!found) throw new Error('Recipe not found');
        setData(found);
      } else {
        setData(await fetchRecipeById(id));
      }
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  return { data, isLoading, error, refetch: load };
};

export const useHomeInit = (userId?: string | null, authLoading?: boolean) => {
  const normalizedUserId = userId && userId !== 'guest' ? userId : undefined;
  const [data, setData] = useState<HomeInitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    setIsLoading(true);
    try {
      setData(await fetchHomeInit(normalizedUserId));
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [normalizedUserId, authLoading]);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, error, refetch: load };
};

export const useRecipeDetailFull = (id: string, userId?: string | null, authLoading?: boolean) => {
  const normalizedUserId = userId && userId !== 'guest' ? userId : undefined;
  const [data, setData] = useState<RecipeDetailFullData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!id || authLoading) return;
    setIsLoading(true);
    try {
      setData(await fetchRecipeDetailFull(id, normalizedUserId));
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [id, normalizedUserId, authLoading]);

  useEffect(() => { if (id && !authLoading) load(); }, [id, authLoading, load]);

  return { data, isLoading, error, refetch: load };
};

export const useMyRecipes = (status: 'all' | 'draft' | 'published' = 'all') => {
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pageRef = useRef(0);

  const load = useCallback(
    async (reset: boolean) => {
      const nextPage = reset ? 1 : pageRef.current + 1;
      if (reset) {
        setIsLoading(true);
        setPages([]);
        pageRef.current = 0;
        setHasNextPage(true);
      } else {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
      }
      try {
        const page = await fetchMyRecipes(nextPage, PAGE_SIZE, status);
        pageRef.current = nextPage;
        setPages((prev) => (reset ? [page] : [...prev, page]));
        setHasNextPage(page.pagination.page < page.pagination.totalPages);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [status],
  );

  useEffect(() => { load(true); }, [status]);

  const fetchNextPage = useCallback(() => load(false), [load]);
  const refetch = useCallback(() => load(true), [load]);
  const data = pages.length > 0 ? { pages } : undefined;

  return { data, isLoading, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage };
};

export const useUpdateRecipe = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async ({ recipeId, payload }: { recipeId: string; payload: any }) => {
    setIsPending(true);
    try {
      return await updateRecipe(recipeId, payload);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
};

export const useDeleteRecipe = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (recipeId: string) => {
    setIsPending(true);
    try {
      return await deleteRecipe(recipeId);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
};

export const useRepublishRecipe = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (recipeId: string) => {
    setIsPending(true);
    try {
      return await republishRecipe(recipeId);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
};

export const useUnpublishRecipe = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (recipeId: string) => {
    setIsPending(true);
    try {
      return await unpublishRecipe(recipeId);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
};

// ─── Likes ────────────────────────────────────────────────────────────────────

export const useToggleLike = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({ recipeId, userId }: { recipeId: string; userId: string }) => {
    setIsPending(true);
    try {
      return await toggleLike(recipeId, userId);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
};

// ─── Favorites ────────────────────────────────────────────────────────────────

export const useFavorites = (userId: string) => {
  const [data, setData] = useState<Recipe[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      if (USE_MOCK) setData(MOCK_RECIPES.slice(0, 2));
      else setData(await fetchFavorites(userId));
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (userId) load(); }, [userId, load]);

  return { data, isLoading, error, refetch: load };
};

export const useInfiniteFavorites = (userId: string) => {
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pageRef = useRef(0);
  const enabled = !!userId && userId !== 'guest';

  const load = useCallback(
    async (reset: boolean) => {
      if (!enabled) return;
      const nextPage = reset ? 1 : pageRef.current + 1;
      if (reset) {
        setIsLoading(true);
        setPages([]);
        pageRef.current = 0;
        setHasNextPage(true);
      } else {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
      }
      try {
        let page: any;
        if (USE_MOCK) {
          const d = MOCK_RECIPES.slice(0, 2);
          page = { data: d, pagination: { page: nextPage, pageSize: PAGE_SIZE, total: d.length, totalPages: 1 } };
        } else {
          page = await fetchFavoritesPaged(userId, nextPage, PAGE_SIZE);
        }
        pageRef.current = nextPage;
        setPages((prev) => (reset ? [page] : [...prev, page]));
        setHasNextPage(page.pagination.page < page.pagination.totalPages);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [userId, enabled],
  );

  useEffect(() => { if (enabled) load(true); }, [userId]);

  const fetchNextPage = useCallback(() => load(false), [load]);
  const refetch = useCallback(() => load(true), [load]);
  const data = pages.length > 0 ? { pages } : undefined;

  return { data, isLoading, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage };
};

/**
 * useInfiniteFavoritesList — cursor-style list using useInfiniteList
 */
export const useInfiniteFavoritesList = (userId: string) => {
  const enabled = !!userId && userId !== 'guest';
  const [total, setTotal] = useState(0);

  const list = useInfiniteList<Recipe>({
    enabled,
    queryFn: async (page: number) => {
      if (USE_MOCK) {
        const data = MOCK_RECIPES.slice(0, 2);
        return { data, pagination: { page, pageSize: PAGE_SIZE, total: data.length, totalPages: 1 } };
      }
      const res = await fetchFavoritesPaged(userId, page, PAGE_SIZE);
      setTotal(res.pagination.total);
      return res;
    },
  });

  return { ...list, total: total || list.items.length };
};

export const useTagRecipes = (tagId: string) => {
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pageRef = useRef(0);

  const load = useCallback(
    async (reset: boolean) => {
      if (!tagId) return;
      const nextPage = reset ? 1 : pageRef.current + 1;
      if (reset) {
        setIsLoading(true);
        setPages([]);
        pageRef.current = 0;
        setHasNextPage(true);
      } else {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
      }
      try {
        const page = await fetchTagRecipes(tagId, nextPage, PAGE_SIZE);
        pageRef.current = nextPage;
        setPages((prev) => (reset ? [page] : [...prev, page]));
        setHasNextPage(page.pagination.page < page.pagination.totalPages);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [tagId],
  );

  useEffect(() => { if (tagId) load(true); }, [tagId]);

  const fetchNextPage = useCallback(() => load(false), [load]);
  const refetch = useCallback(() => load(true), [load]);
  const data = pages.length > 0 ? { pages } : undefined;

  return { data, isLoading, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage };
};

export const useToggleFavorite = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({ recipeId, userId }: { recipeId: string; userId: string }) => {
    setIsPending(true);
    try {
      return await toggleFavorite(recipeId, userId);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
};

// ─── Comments ─────────────────────────────────────────────────────────────────

export const useComments = (recipeId: string) => {
  const [data, setData] = useState<Comment[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!recipeId) return;
    setIsLoading(true);
    try {
      if (USE_MOCK) setData(MOCK_COMMENTS.filter((c) => c.recipe_id === recipeId) as Comment[]);
      else setData(await fetchComments(recipeId));
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [recipeId]);

  useEffect(() => { if (recipeId) load(); }, [recipeId, load]);

  return { data, isLoading, error, refetch: load };
};

export const useInfiniteComments = (recipeId: string) => {
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pageRef = useRef(0);

  const load = useCallback(
    async (reset: boolean) => {
      if (!recipeId) return;
      const nextPage = reset ? 1 : pageRef.current + 1;
      if (reset) {
        setIsLoading(true);
        setPages([]);
        pageRef.current = 0;
        setHasNextPage(true);
      } else {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
      }
      try {
        let page: any;
        if (USE_MOCK) {
          const d = MOCK_COMMENTS.filter((c) => c.recipe_id === recipeId) as Comment[];
          page = { data: d, pagination: { page: nextPage, pageSize: PAGE_SIZE, total: d.length, totalPages: 1 } };
        } else {
          page = await fetchCommentsPaged(recipeId, nextPage, PAGE_SIZE);
        }
        pageRef.current = nextPage;
        setPages((prev) => (reset ? [page] : [...prev, page]));
        setHasNextPage(page.pagination.page < page.pagination.totalPages);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [recipeId],
  );

  useEffect(() => { if (recipeId) load(true); }, [recipeId]);

  const fetchNextPage = useCallback(() => load(false), [load]);
  const refetch = useCallback(() => load(true), [load]);
  const data = pages.length > 0 ? { pages } : undefined;

  return { data, isLoading, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage };
};

export const usePostComment = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (variables: Parameters<typeof postComment>[0]) => {
    setIsPending(true);
    try {
      return await postComment(variables);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
};

export const useUpdateComment = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({ commentId, content }: { commentId: string; content: string }) => {
    setIsPending(true);
    try {
      return await updateComment(commentId, { content });
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
};

export const useDeleteComment = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({ commentId }: { commentId: string; recipeId: string }) => {
    setIsPending(true);
    try {
      return await deleteComment(commentId);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
};

// ─── Categories ───────────────────────────────────────────────────────────────

const ALL_CATEGORY: Category = { id: 'all', label: 'All', label_zh: '全部', slug: 'all', recipesCount: 0 };

export const useCategories = () => {
  const [data, setData] = useState<Category[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const cats = await fetchCategories();
      setData([ALL_CATEGORY, ...cats]);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, error, refetch: load };
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const useTags = () => {
  const [data, setData] = useState<Tag[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await fetchTags());
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, error, refetch: load };
};

export const useCategoryRecipes = (
  categoryId: string,
  sort: 'newest' | 'popular' | 'favorites' = 'popular'
) => {
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pageRef = useRef(0);

  const load = useCallback(
    async (reset: boolean) => {
      if (!categoryId) return;
      const nextPage = reset ? 1 : pageRef.current + 1;
      if (reset) {
        setIsLoading(true);
        setPages([]);
        pageRef.current = 0;
        setHasNextPage(true);
      } else {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
      }
      try {
        const page = await fetchCategoryRecipes(categoryId, nextPage, PAGE_SIZE, sort);
        pageRef.current = nextPage;
        setPages((prev) => (reset ? [page] : [...prev, page]));
        setHasNextPage(page.pagination.page < page.pagination.totalPages);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [categoryId, sort],
  );

  useEffect(() => { if (categoryId) load(true); }, [categoryId, sort]);

  const fetchNextPage = useCallback(() => load(false), [load]);
  const refetch = useCallback(() => load(true), [load]);
  const data = pages.length > 0 ? { pages } : undefined;

  return { data, isLoading, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage };
};
