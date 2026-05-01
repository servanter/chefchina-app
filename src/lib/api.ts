import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { getAuthToken } from './storage';

// 根据平台自动选择 API 地址
// EXPO_PUBLIC_API_BASE 可覆盖默认值，上线时建议用该环境变量指向生产域名
// - Web / iOS 模拟器：localhost:3000
// - Android 模拟器：10.0.2.2:3000（映射宿主机 localhost）
// - 真机扫码调试：改成 Mac 的局域网 IP，例如 http://192.168.0.104:3000/api
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE ||
  (Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api'
    : 'http://localhost:3000/api');

// ─── 分页常量（FEAT-20260421-11）─────────────────────────────────────────────
export const PAGE_SIZE = 20;

// ─── 网络错误判断 + 重试策略（FEAT-20260421-13）────────────────────────────
export const isNetworkError = (error: unknown): boolean => {
  if (!error) return false;
  const err = error as AxiosError & { message?: string };
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') return true;
  if (!err.response && (err.request || err.message?.toLowerCase().includes('network'))) {
    return true;
  }
  return false;
};

const isServerError = (error: unknown): boolean => {
  const err = error as AxiosError;
  const status = err?.response?.status;
  return typeof status === 'number' && status >= 500 && status < 600;
};

const MAX_RETRY = 2;
const RETRY_DELAYS = [500, 1500];

type RetriableConfig = AxiosRequestConfig & { _retryCount?: number };

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    // 需要鉴权的接口（通知相关 + push-token）自动附上 Bearer token。
    // 其他请求不加，保持对老 API 的向后兼容（登录/注册自己返回 token，不需要）。
    const url = config.url ?? '';
    const needsAuth =
      url.startsWith('/notifications') ||
      url.startsWith('/history') ||
      url.startsWith('/comments') ||
      url.startsWith('/likes') ||
      url.startsWith('/favorites') ||
      url.startsWith('/users/') ||
      url.includes('/push-token') ||
      url.includes('/recipes/mine');
    if (needsAuth) {
      try {
        const token = await getAuthToken();
        if (token) {
          config.headers = config.headers ?? {};
          (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        }
      } catch {
        // storage 读失败就不加头，后端 401 调用方会看到
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    // 仅对幂等 GET 请求做自动重试；写操作绝不重试（防重复提交）
    const method = (config?.method ?? 'get').toLowerCase();
    const shouldRetry =
      config &&
      method === 'get' &&
      (isNetworkError(error) || isServerError(error));

    if (shouldRetry) {
      config._retryCount = config._retryCount ?? 0;
      if (config._retryCount < MAX_RETRY) {
        const delay = RETRY_DELAYS[config._retryCount] ?? 1500;
        config._retryCount += 1;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return apiClient.request(config);
      }
    }

    const message =
      (error?.response?.data as any)?.error ??
      error?.message ??
      'Unknown error';
    const wrapped = new Error(message) as Error & { isNetworkError?: boolean };
    wrapped.isNetworkError = isNetworkError(error);
    return Promise.reject(wrapped);
  },
);

// ─── App 内部使用的统一类型（前端视角）─────────────────────────────────────────

export interface Ingredient {
  name: string;
  name_zh: string;
  amount: string;
  unit?: string;
}

export interface Step {
  order: number;
  description: string;
  description_zh: string;
  image?: string | string[];
  duration_min?: number;
}

export interface Recipe {
  id: string;
  title: string;
  title_zh: string;
  description: string;
  description_zh: string;
  cover_image: string;
  updated_at?: string;
  category: string;
  category_slug?: string;
  author_name?: string;
  // 需求 15：difficulty 可能为 null（菜谱未指定难度）→ App 端按 null 隐藏对应 icon
  difficulty: 'easy' | 'medium' | 'hard' | null;
  cook_time: number;
  prep_time: number;
  servings: number;
  calories?: number;
  // 营养成分 (REQ-4.4)
  protein?: number;      // 蛋白质(g)
  fat?: number;          // 脂肪(g)
  carbs?: number;        // 碳水化合物(g)
  fiber?: number;        // 纤维(g)
  sodium?: number;       // 钠(mg)
  sugar?: number;        // 糖(g)
  ingredients: Ingredient[];
  steps: Step[];
  likes_count: number;
  comments_count: number;
  favorites_count: number;
  avg_rating: number;
  ratings_count: number;
  is_published: boolean;
  created_at: string;
  tags: { id: string; label: string; label_zh: string }[];
}

export interface HomeInitData {
  featured: Recipe[];
  quick: Recipe[];
  categories: Category[];
  ranking: RankedRecipe[];
  unreadCount: number;
}

export interface RecipeDetailFullData {
  recipe: Recipe;
  related: Recipe[];
  comments: Comment[];
  userStatus: {
    liked: boolean;
    favorited: boolean;
  };
  commentLikeStatus?: Record<string, boolean>; // 新增：评论点赞状态 map
  authorLevel?: {
    level: number;
    exp: number;
    nextLevelExp: number;
  };
}

export interface Comment {
  id: string;
  user_id: string;
  userId?: string;
  recipe_id: string;
  content: string;
  rating: number;
  images?: string[];  // 评论图片
  parent_id?: string; // 父评论 ID
  replies?: Comment[]; // 子评论
  created_at: string;
  updated_at?: string;
  is_visible?: boolean;
  likes_count?: number; // 点赞数 (REQ-11.2)
  recipe?: {
    id: string;
    title: string;
    title_zh: string;
    cover_image: string;
  };
  reply_to_user?: {
    id?: string;
    name: string;
  };
  user?: {
    id?: string;
    name: string;
    avatar_url: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  avatar?: string;
  bio: string;
  cover?: string;  // REQ-12.4: 用户头图
  specialties?: string[];  // REQ-12.4: 擅长菜系
  location?: string;  // REQ-12.4: 所在地区
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PRIVATE';  // REQ-12.4: 性别
  favorites_count: number;
  comments_count: number;
  recipes_count: number;  // REQ-4.1: 用户发布的菜谱数
  followers_count?: number; // REQ-5.4: 粉丝数
  following_count?: number; // REQ-5.4: 关注数
  level?: number;  // REQ-12.9: 等级 1-10
  exp?: number;  // REQ-12.9: 经验值
  levelInfo?: {  // REQ-12.9: 等级详情
    exp: number;
    level: number;
    currentLevelName: { en: string; zh: string } | null;
    currentLevelBenefits: any;
    nextLevelExp: number | null;
    expToNextLevel: number;
    progressPercent: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ─── 分类 ─────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  label: string;
  label_zh: string;
  slug: string;
  recipesCount: number;
  icon?: string;
}

interface BackendCategory {
  id: string;
  name?: string;
  nameEn?: string;
  nameZh: string;
  slug: string;
  icon?: string | null;
  image?: string | null;
  recipeCount?: number;
  _count?: { recipes: number };
}

export function adaptCategory(c: BackendCategory): Category {
  return {
    id: c.id,
    label: c.name ?? c.nameEn ?? '',
    label_zh: c.nameZh,
    slug: c.slug,
    recipesCount: c.recipeCount ?? c._count?.recipes ?? 0,
    icon: c.icon ?? c.image ?? undefined,
  };
}

export const fetchCategories = async (): Promise<Category[]> => {
  const res = await apiClient.get('/categories');
  const cats = (res.data.data?.data ?? res.data.data) as BackendCategory[];
  return cats.map(adaptCategory);
};

// ─── 话题 (REQ-12.3) ───────────────────────────────────────

export interface Topic {
  id: string;
  nameEn: string;
  nameZh: string;
  descEn?: string;
  descZh?: string;
  icon?: string;
  coverImage?: string;
  isHot: boolean;
  recipesCount?: number;
}

interface BackendTopic {
  id: string;
  nameEn: string;
  nameZh: string;
  descEn?: string;
  descZh?: string;
  icon?: string;
  coverImage?: string;
  isHot: boolean;
  _count?: { recipes: number };
}

export const fetchTopics = async (isHot?: boolean): Promise<Topic[]> => {
  const params = isHot !== undefined ? { isHot: isHot.toString() } : {};
  const res = await apiClient.get('/topics', { params });
  const topics = res.data.data.topics as BackendTopic[];
  return topics.map(t => ({
    id: t.id,
    nameEn: t.nameEn,
    nameZh: t.nameZh,
    descEn: t.descEn,
    descZh: t.descZh,
    icon: t.icon,
    coverImage: t.coverImage,
    isHot: t.isHot,
    recipesCount: t._count?.recipes ?? 0
  }));
};



// ─── 推荐 (REQ-12.7) ──────────────────────────────────────
export const fetchRecommendedRecipes = async (userId: string, page = 1): Promise<PaginatedResponse<Recipe>> => {
  const res = await apiClient.get('/recommend', {
    params: { userId, page, limit: PAGE_SIZE }
  });
  const recipes = res.data.data.recipes.map(adaptRecipe);
  const pagination = res.data.data.pagination;
  return {
    data: recipes,
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    hasMore: pagination.page < pagination.totalPages
  };
};

export const recordBrowseHistory = async (userId: string, recipeId: string): Promise<void> => {
  try {
    await apiClient.post('/browse-history', { userId, recipeId });
  } catch (error) {
    console.warn('Failed to record browse history:', error);
    // 静默失败,不影响用户浏览
  }
};

// ─── 后台 API 原始类型（Prisma 返回格式）────────────────────────────────────────

interface BackendIngredient {
  id: string;
  nameEn: string;
  nameZh: string;
  amount: string;
  unit?: string;
  isOptional: boolean;
}

interface BackendStep {
  id: string;
  stepNumber: number;
  titleEn?: string;
  titleZh?: string;
  contentEn: string;
  contentZh: string;
  image?: string | string[];
  images?: string[];
  durationMin?: number;
}

interface BackendRecipe {
  id: string;
  titleEn: string;
  titleZh: string;
  descriptionEn?: string;
  descriptionZh?: string;
  coverImage?: string;
  updatedAt?: string;
  // 需求 15：以下 4 个 meta 字段均允许 null（对应 Prisma 的 nullable 列）
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
  prepTime?: number | null;
  cookTimeMin?: number | null;
  servings?: number | null;
  calories?: number | null;
  // 营养成分 (REQ-4.4)
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  fiber?: number | null;
  sodium?: number | null;
  sugar?: number | null;
  isPublished: boolean;
  createdAt: string;
  category?: { id: string; nameEn: string; nameZh: string; slug: string };
  steps?: BackendStep[];
  ingredients?: BackendIngredient[];
  tags?: { tag: { id: string; nameEn: string; nameZh: string } }[];
  _count?: { likes: number; comments: number; favorites: number };
  avgRating?: number;
  ratingsCount?: number;
}

interface BackendComment {
  id: string;
  content: string;
  rating?: number;
  images?: string[];
  parentId?: string;
  replies?: BackendComment[];
  recipeId: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  isVisible?: boolean;
  user?: { id: string; name?: string; avatar?: string };
  recipe?: { id: string; titleEn?: string; titleZh?: string; coverImage?: string | null };
  replyToUser?: { id: string; name?: string };
  _count?: { likes: number };
}

interface BackendHomeInitData {
  featured?: BackendRecipe[];
  quick?: BackendRecipe[];
  categories?: BackendCategory[];
  ranking?: (BackendRecipe & { rank: number; score: number })[];
  unreadCount?: number;
}

interface BackendRecipeDetailFullData {
  recipe: BackendRecipe;
  related?: BackendRecipe[];
  comments?: BackendComment[];
  userStatus?: {
    liked?: boolean;
    favorited?: boolean;
  };
  commentLikeStatus?: Record<string, boolean>;
  authorLevel?: {
    level: number;
    exp: number;
    nextLevelExp: number;
  };
}

// ─── 适配器：后台格式 → App 前端格式 ──────────────────────────────────────────

function adaptDifficulty(d: string | null | undefined): 'easy' | 'medium' | 'hard' | null {
  // 需求 15：DB 中 difficulty 可能为 null —— 保留为 null，App 端详情页按 null 隐藏
  // 对应 meta icon。RecipeCard 中的 DifficultyBadge 会对 null 做兜底（fallback 'easy'）
  // 以保证卡片列表视觉一致。
  if (!d) return null;
  return d.toLowerCase() as 'easy' | 'medium' | 'hard';
}

export function adaptRecipe(r: BackendRecipe): Recipe {
  return {
    id: r.id,
    title: r.titleEn,
    title_zh: r.titleZh,
    description: r.descriptionEn ?? '',
    description_zh: r.descriptionZh ?? '',
    cover_image: r.coverImage ?? 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
    updated_at: r.updatedAt,
    category: r.category?.nameEn ?? '',
    category_slug: r.category?.slug ?? '',
    author_name: (r as any).author?.name ?? undefined,
    difficulty: adaptDifficulty(r.difficulty),
    // null → 0：由 App 详情页按 > 0 条件隐藏对应 icon
    cook_time: r.cookTimeMin ?? 0,
    prep_time: r.prepTime ?? 0,
    servings: r.servings ?? 0,
    calories: r.calories ?? undefined,
    // 营养成分 (REQ-4.4)
    protein: r.protein ?? undefined,
    fat: r.fat ?? undefined,
    carbs: r.carbs ?? undefined,
    fiber: r.fiber ?? undefined,
    sodium: r.sodium ?? undefined,
    sugar: r.sugar ?? undefined,
    ingredients: (r.ingredients ?? []).map((i) => ({
      name: i.nameEn,
      name_zh: i.nameZh,
      amount: i.amount,
      unit: i.unit,
    })),
    steps: (r.steps ?? []).map((s) => ({
      order: s.stepNumber,
      description: s.contentEn,
      description_zh: s.contentZh,
      image: Array.isArray(s.images) && s.images.length > 0
        ? s.images
        : s.image,
      duration_min: s.durationMin,
    })),
    // 支持两种字段名：likesCount (驼峰) 和 _count.likes (下划线)
    likes_count: (r as any).likesCount ?? r._count?.likes ?? 0,
    comments_count: (r as any).commentsCount ?? r._count?.comments ?? 0,
    favorites_count: (r as any).favoritesCount ?? r._count?.favorites ?? 0,
    avg_rating: r.avgRating ?? 0,
    ratings_count: r.ratingsCount ?? 0,
    is_published: r.isPublished,
    created_at: r.createdAt,
    tags: (r.tags ?? []).map((t) => ({
      id: t.tag.id,
      label: t.tag.nameEn,
      label_zh: t.tag.nameZh,
    })),
  };
}

export function adaptComment(c: BackendComment): Comment {
  return {
    id: c.id,
    user_id: c.userId,
    recipe_id: c.recipeId,
    content: c.content,
    rating: c.rating ?? 0,
    images: c.images,
    parent_id: c.parentId,
    replies: c.replies?.map(adaptComment),
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    is_visible: c.isVisible,
    likes_count: c._count?.likes ?? 0,
    recipe: c.recipe
      ? {
          id: c.recipe.id,
          title: c.recipe.titleEn ?? '',
          title_zh: c.recipe.titleZh ?? '',
          cover_image: c.recipe.coverImage ?? 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
        }
      : undefined,
    reply_to_user: c.replyToUser
      ? {
          id: c.replyToUser.id,
          name: c.replyToUser.name ?? 'Anonymous',
        }
      : undefined,
    user: c.user
      ? { id: c.user.id, name: c.user.name ?? 'Anonymous', avatar_url: c.user.avatar ?? '' }
      : undefined,
  };
}

// ─── API 函数（调用后台，数据经过适配）────────────────────────────────────────

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RecipesPage {
  data: Recipe[];
  pagination: PageMeta;
  // Legacy flat fields (kept for backward compat with non-infinite consumers)
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export type RecipeSort = 'recommended' | 'latest' | 'popular';

export const fetchRecipes = async (params?: {
  page?: number;
  pageSize?: number;
  limit?: number;
  category?: string;
  difficulty?: string;
  search?: string;
  sort?: RecipeSort;
  tagId?: string;
}): Promise<RecipesPage> => {
  const res = await apiClient.get('/recipes', {
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? params?.limit ?? PAGE_SIZE,
      categoryId: params?.category && params.category !== 'all' ? params.category : undefined,
      difficulty: params?.difficulty && params.difficulty !== 'all'
        ? params.difficulty.toUpperCase()
        : undefined,
      search: params?.search,
      published: true,
      sort: params?.sort,
      tagId: params?.tagId,
    },
  });
  const body = res.data; // { success: true, data: { recipes, pagination } }
  const { recipes, pagination } = body.data;
  const meta: PageMeta = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
  };
  return {
    data: (recipes as BackendRecipe[]).map(adaptRecipe),
    pagination: meta,
    page: meta.page,
    limit: meta.pageSize,
    total: meta.total,
    hasMore: meta.page < meta.totalPages,
  };
};

export const fetchRecipeById = async (id: string): Promise<Recipe> => {
  const res = await apiClient.get(`/recipes/${id}`);
  return adaptRecipe(res.data.data as BackendRecipe);
};

export const fetchHomeInit = async (userId?: string): Promise<HomeInitData> => {
  const params = userId ? { userId } : {};
  const res = await apiClient.get('/home/init', { params });
  const data = res.data.data as BackendHomeInitData;

  return {
    featured: (data.featured ?? []).map(adaptRecipe),
    quick: (data.quick ?? []).map(adaptRecipe),
    categories: (data.categories ?? []).map(adaptCategory),
    ranking: (data.ranking ?? []).map((item) => ({
      ...adaptRecipe(item),
      rank: item.rank,
      score: item.score,
    })),
    unreadCount: data.unreadCount ?? 0,
  };
};

export const fetchRecipeDetailFull = async (
  id: string,
  userId?: string,
): Promise<RecipeDetailFullData> => {
  const params = userId ? { userId } : {};
  const res = await apiClient.get(`/recipes/${id}/detail-full`, { params });
  const data = res.data.data as BackendRecipeDetailFullData;

  return {
    recipe: adaptRecipe(data.recipe),
    related: (data.related ?? []).map(adaptRecipe),
    comments: (data.comments ?? []).map(adaptComment),
    userStatus: {
      liked: data.userStatus?.liked ?? false,
      favorited: data.userStatus?.favorited ?? false,
    },
    commentLikeStatus: data.commentLikeStatus ?? {},
    authorLevel: data.authorLevel,
  };
};

export interface MyRecipesPage {
  data: Recipe[];
  pagination: PageMeta;
}

export const fetchMyRecipes = async (
  page = 1,
  pageSize = PAGE_SIZE,
  status?: 'all' | 'draft' | 'published',
): Promise<MyRecipesPage> => {
  const res = await apiClient.get('/recipes/mine', {
    params: {
      page,
      pageSize,
      status: status && status !== 'all' ? status : undefined,
    },
  });
  const { recipes, pagination } = res.data.data;
  const adapted = (recipes as BackendRecipe[]).map(adaptRecipe);
  return {
    data: adapted,
    pagination: {
      page: pagination?.page ?? page,
      pageSize: pagination?.pageSize ?? pageSize,
      total: pagination?.total ?? adapted.length,
      totalPages: pagination?.totalPages ?? 1,
    },
  };
};

/**
 * 创建新菜谱（REQ-5.3：用户自主发布菜谱）
 * POST /api/recipes
 * 需要鉴权，authorId 由后端从 token 中获取
 */
export interface CreateRecipePayload {
  titleEn: string;
  titleZh: string;
  descriptionEn?: string;
  descriptionZh?: string;
  coverImage?: string;
  categoryId: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  prepTime?: number;
  cookTime?: number;
  updatedAt?: string;
  cookTimeMin?: number;
  servings?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
  isPublished?: boolean;
  ingredients?: Array<{
    nameEn: string;
    nameZh: string;
    amount: string;
    unit?: string;
    isOptional?: boolean;
  }>;
  steps?: Array<{
    stepNumber: number;
    titleEn?: string;
    titleZh?: string;
    contentEn: string;
    contentZh: string;
    image?: string;
    durationMin?: number;
  }>;
  tagIds?: string[];
}

export const createRecipe = async (payload: CreateRecipePayload): Promise<Recipe> => {
  const token = await getAuthToken();
  const res = await apiClient.post('/recipes', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return adaptRecipe(res.data.data as BackendRecipe);
};

export const updateRecipe = async (
  recipeId: string,
  payload: Partial<CreateRecipePayload>,
): Promise<Recipe> => {
  const token = await getAuthToken();
  const res = await apiClient.patch(`/recipes/${recipeId}`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return adaptRecipe(res.data.data as BackendRecipe);
};

export const syncRecipeTags = async (recipeId: string, tags: string[]): Promise<Recipe> => {
  const token = await getAuthToken();
  const res = await apiClient.post(`/recipes/${recipeId}/tags`, { tags }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return adaptRecipe(res.data.data as BackendRecipe);
};

export const deleteRecipe = async (recipeId: string): Promise<void> => {
  const token = await getAuthToken();
  await apiClient.delete(`/recipes/${recipeId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const republishRecipe = async (recipeId: string): Promise<Recipe> => {
  return updateRecipe(recipeId, { isPublished: true });
};

export const unpublishRecipe = async (recipeId: string): Promise<Recipe> => {
  return updateRecipe(recipeId, { isPublished: false });
};

/**
 * 拉当前菜谱的"相关推荐"（同 category 的其他已发布菜谱）。
 * 后端：GET /api/recipes/[id]/related → { items: BackendRecipe[] }
 * 需求 15。
 */
export const fetchRelated = async (
  recipeId: string,
  limit = 6,
): Promise<Recipe[]> => {
  const res = await apiClient.get(`/recipes/${recipeId}/related`, {
    params: { limit },
  });
  const items = res.data?.data?.items;
  if (!Array.isArray(items)) return [];
  return (items as BackendRecipe[]).map(adaptRecipe);
};

export const fetchFeaturedRecipes = async (): Promise<Recipe[]> => {
  const res = await apiClient.get('/recipes', {
    params: { page: 1, pageSize: 5, published: true, sort: 'hot' },
  });
  const { recipes } = res.data.data;
  return (recipes as BackendRecipe[]).map(adaptRecipe);
};

export const toggleLike = async (
  recipeId: string,
  userId: string,
): Promise<{ liked: boolean; likes_count: number }> => {
  const res = await apiClient.post(`/likes/${recipeId}`, { userId });
  return { liked: res.data.data.liked, likes_count: res.data.data.count };
};

export const fetchFavorites = async (userId: string): Promise<Recipe[]> => {
  const res = await apiClient.get('/favorites', { params: { userId } });
  const { recipes } = res.data.data;
  return (recipes as BackendRecipe[]).map(adaptRecipe);
};

export interface FavoritesPage {
  data: Recipe[];
  pagination: PageMeta;
}

export const fetchFavoritesPaged = async (
  userId: string,
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<FavoritesPage> => {
  const res = await apiClient.get('/favorites', {
    params: { userId, page, pageSize },
  });
  const { recipes, pagination } = res.data.data;
  // 后端 /api/favorites 若不返回 pagination，则退回单页伪分页
  const total = pagination?.total ?? (recipes?.length ?? 0);
  const totalPages =
    pagination?.totalPages ??
    Math.max(1, Math.ceil(total / pageSize));
  return {
    data: (recipes as BackendRecipe[]).map(adaptRecipe),
    pagination: {
      page: pagination?.page ?? page,
      pageSize: pagination?.pageSize ?? pageSize,
      total,
      totalPages,
    },
  };
};

export const toggleFavorite = async (
  recipeId: string,
  userId: string,
): Promise<{ favorited: boolean }> => {
  const res = await apiClient.post(`/favorites/${recipeId}`, { userId });
  return { favorited: res.data.data.favorited };
};

export const fetchComments = async (recipeId: string): Promise<Comment[]> => {
  const res = await apiClient.get('/comments', { params: { recipeId } });
  const { comments } = res.data.data;
  return (comments as BackendComment[]).map(adaptComment);
};

export interface CommentsPage {
  data: Comment[];
  pagination: PageMeta;
}

export const fetchCommentsPaged = async (
  recipeId: string,
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<CommentsPage> => {
  const res = await apiClient.get('/comments', {
    params: { recipeId, page, pageSize },
  });
  const { comments, pagination } = res.data.data;
  const total = pagination?.total ?? (comments?.length ?? 0);
  const totalPages =
    pagination?.totalPages ??
    Math.max(1, Math.ceil(total / pageSize));
  return {
    data: (comments as BackendComment[]).map(adaptComment),
    pagination: {
      page: pagination?.page ?? page,
      pageSize: pagination?.pageSize ?? pageSize,
      total,
      totalPages,
    },
  };
};

export const postComment = async (params: {
  recipe_id: string;
  user_id: string;
  content: string;
  rating?: number;
  images?: string[];
  parent_id?: string;
}): Promise<Comment> => {
  const res = await apiClient.post('/comments', {
    recipeId: params.recipe_id,
    userId: params.user_id,
    content: params.content,
    rating: params.rating,
    images: params.images,
    parentId: params.parent_id,
  });
  return adaptComment(res.data.data as BackendComment);
};

export const updateComment = async (
  commentId: string,
  payload: { content: string },
): Promise<Comment> => {
  const token = await getAuthToken();
  const res = await apiClient.patch(`/comments/${commentId}`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return adaptComment(res.data.data as BackendComment);
};

export const deleteComment = async (commentId: string): Promise<void> => {
  const token = await getAuthToken();
  await apiClient.delete(`/comments/${commentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const upsertUser = async (params: {
  email: string;
  name?: string;
}): Promise<User> => {
  const res = await apiClient.post('/users', params);
  const u = res.data.data;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? '',
    avatar_url: u.avatar && u.avatar.length > 0
      ? u.avatar
      : `https://i.pravatar.cc/150?u=${u.id}`,
    avatar: u.avatar && u.avatar.length > 0
      ? u.avatar
      : `https://i.pravatar.cc/150?u=${u.id}`,
    bio: u.bio ?? '',
    favorites_count: u._count?.favorites ?? 0,
    comments_count: u._count?.comments ?? 0,
    recipes_count: u._count?.recipes ?? 0,  // REQ-4.1
  };
};

export const fetchUser = async (userId: string): Promise<User> => {
  const res = await apiClient.get(`/users/${userId}`);
  const u = res.data.data;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? '',
    avatar_url: u.avatar && u.avatar.length > 0
      ? u.avatar
      : `https://i.pravatar.cc/150?u=${u.id}`,
    avatar: u.avatar && u.avatar.length > 0
      ? u.avatar
      : `https://i.pravatar.cc/150?u=${u.id}`,
    bio: u.bio ?? '',
    favorites_count: u._count?.favorites ?? 0,
    comments_count: u._count?.comments ?? 0,
    recipes_count: u._count?.recipes ?? 0,
    followers_count: u._count?.followers ?? 0,
    following_count: u._count?.following ?? 0,
  };
};

export const updateUser = async (
  userId: string,
  data: { name?: string; bio?: string; avatar?: string; locale?: string },
): Promise<User> => {
  const res = await apiClient.patch(`/users/${userId}`, data);
  const u = res.data.data;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? '',
    avatar_url: u.avatar && u.avatar.length > 0
      ? u.avatar
      : `https://i.pravatar.cc/150?u=${u.id}`,
    bio: u.bio ?? '',
    favorites_count: u._count?.favorites ?? 0,
    comments_count: u._count?.comments ?? 0,
    recipes_count: u._count?.recipes ?? 0,
    followers_count: u._count?.followers ?? 0,
    following_count: u._count?.following ?? 0,
  };
};

// ─── 认证：邮箱 + 密码（FEAT-20260421-02）────────────────────────────────────

interface BackendAuthUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  role?: 'USER' | 'ADMIN';
  locale?: string;
  _count?: { favorites?: number; comments?: number };
}

export interface AuthResult {
  user: User;
  token: string;
}

function adaptAuthUser(u: BackendAuthUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? '',
    avatar_url:
      u.avatar && u.avatar.length > 0
        ? u.avatar
        : `https://i.pravatar.cc/150?u=${u.id}`,
    bio: u.bio ?? '',
    favorites_count: u._count?.favorites ?? 0,
    comments_count: u._count?.comments ?? 0,
    recipes_count: 0,
  };
}

// BUG-20260422-04 修复：共享的响应拦截器会把 axios 错误包成只有 message 的
// 普通 Error，`response.data.code` / `retryAfter` 全丢掉。这里用
// `validateStatus: () => true` 把 4xx/5xx 也当成"成功响应"拿到完整 body，
// 然后手动抛出带 `code` + `response.data` 的错误，供 login.tsx / register.tsx
// 的 catch 按 error code 走 i18n。不触碰拦截器本身（Dev1 Sprint 2 会动）。
export interface AuthApiError extends Error {
  code?: string;
  response?: { status: number; data: any };
}

async function postAuth(path: '/auth/login' | '/auth/register', body: {
  email: string
  password: string
}): Promise<AuthResult> {
  const res = await apiClient.post(path, body, {
    validateStatus: () => true,
  });
  const data = res.data ?? {};
  if (!data.success) {
    const err = new Error(data.error ?? 'Request failed') as AuthApiError;
    if (typeof data.code === 'string') err.code = data.code;
    err.response = { status: res.status, data };
    throw err;
  }
  const { user, token } = data.data as {
    user: BackendAuthUser;
    token: string;
  };
  return { user: adaptAuthUser(user), token };
}

export const login = async (
  email: string,
  password: string,
): Promise<AuthResult> => postAuth('/auth/login', { email, password });

export const register = async (
  email: string,
  password: string,
): Promise<AuthResult> => postAuth('/auth/register', { email, password });


export interface Tag {
  id: string;
  label: string;
  label_zh: string;
  recipesCount?: number;
}

export interface TagRecipesPage {
  tag: Tag;
  data: Recipe[];
  pagination: PageMeta;
}

export interface CategoryRecipesPage {
  category: Category;
  data: Recipe[];
  pagination: PageMeta;
}

export const fetchTags = async (): Promise<Tag[]> => {
  const res = await apiClient.get('/tags');
  const { tags } = res.data.data;
  return tags.map((t: { id: string; nameEn: string; nameZh: string; _count?: { recipes: number } }) => ({
    id: t.id,
    label: t.nameEn,
    label_zh: t.nameZh,
    recipesCount: t._count?.recipes ?? 0,
  }));
};

export const fetchTagRecipes = async (
  tagId: string,
  page = 1,
  limit = PAGE_SIZE,
): Promise<TagRecipesPage> => {
  const res = await apiClient.get(`/tags/${tagId}/recipes`, {
    params: { page, limit },
  });
  const { tag, data, pagination } = res.data.data;
  return {
    tag: {
      id: tag.id,
      label: tag.nameEn,
      label_zh: tag.nameZh,
    },
    data: (data as BackendRecipe[]).map(adaptRecipe),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages,
    },
  };
};

export const fetchCategoryRecipes = async (
  categoryId: string,
  page = 1,
  limit = PAGE_SIZE,
  sort: 'newest' | 'popular' | 'favorites' = 'popular',
): Promise<CategoryRecipesPage> => {
  const res = await apiClient.get(`/categories/${categoryId}/recipes`, {
    params: { page, limit, sort },
  });
  const { category, data, pagination } = res.data.data;
  return {
    category: adaptCategory({
      id: category.id,
      name: category.nameEn,
      nameZh: category.nameZh,
      slug: category.slug ?? '',
      icon: category.icon,
      recipeCount: category.recipeCount,
    }),
    data: (data as BackendRecipe[]).map(adaptRecipe),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages,
    },
  };
};

export const fetchLikeStatus = async (
  recipeId: string,
  userId: string,
): Promise<{ liked: boolean; count: number }> => {
  const res = await apiClient.get(`/likes/${recipeId}`, { params: { userId } });
  return { liked: res.data.data.liked, count: res.data.data.count };
};

export const fetchFavoriteStatus = async (
  recipeId: string,
  userId: string,
): Promise<{ favorited: boolean }> => {
  const res = await apiClient.get(`/favorites/${recipeId}`, { params: { userId } });
  return { favorited: res.data.data.favorited };
};

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'COMMENT_REPLY'
  | 'RECIPE_LIKED'
  | 'RECIPE_FAVORITED'
  | 'SUBMISSION_APPROVED'
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

interface BackendNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, any> | null;
  readAt: string | null;
  createdAt: string;
}

function adaptNotification(n: BackendNotification): Notification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    payload: n.payload ?? null,
    read: !!n.readAt,
    created_at: n.createdAt,
  };
}

export interface NotificationsPage {
  data: Notification[];
  unreadCount: number;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export const fetchNotifications = async (
  userId: string,
  page = 1,
  unreadOnly = false,
): Promise<NotificationsPage> => {
  const res = await apiClient.get('/notifications', {
    params: { userId, page, pageSize: 20, unreadOnly: unreadOnly ? true : undefined },
  });
  const { notifications, unreadCount, pagination } = res.data.data as {
    notifications: BackendNotification[];
    unreadCount: number;
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  };
  return {
    data: notifications.map(adaptNotification),
    unreadCount,
    page: pagination.page,
    limit: pagination.pageSize,
    total: pagination.total,
    hasMore: pagination.page < pagination.totalPages,
  };
};

export const fetchUnreadCount = async (userId: string): Promise<number> => {
  const res = await apiClient.get('/notifications', {
    params: { userId, unreadOnly: true, page: 1, pageSize: 1 },
  });
  return res.data.data.unreadCount ?? 0;
};

export const markNotificationRead = async (id: string): Promise<Notification> => {
  const res = await apiClient.patch(`/notifications/${id}`);
  return adaptNotification(res.data.data as BackendNotification);
};

export const deleteNotification = async (id: string): Promise<void> => {
  await apiClient.delete(`/notifications/${id}`);
};

export const markAllNotificationsRead = async (userId: string): Promise<number> => {
  const res = await apiClient.post('/notifications/read-all', null, {
    params: { userId },
  });
  return res.data.data.updated ?? 0;
};

export interface ViewHistoryApiItem extends BackendRecipe {
  historyId: string;
  viewedAt: string;
}

export interface ViewHistoryRecipe extends Recipe {
  history_id: string;
}

export interface ViewHistoryPage {
  data: ViewHistoryRecipe[];
  pagination: PageMeta;
}

export const fetchViewHistory = async (
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<ViewHistoryPage> => {
  const res = await apiClient.get('/history', {
    params: { page, pageSize },
  });
  const { items, pagination } = res.data.data as {
    items: ViewHistoryApiItem[];
    pagination: PageMeta;
  };

  return {
    data: items.map((item) => ({
      ...adaptRecipe(item),
      history_id: item.historyId,
      created_at: item.viewedAt,
    })),
    pagination,
  };
};

export const saveViewHistoryRemote = async (recipeId: string): Promise<void> => {
  await apiClient.post('/history', { recipeId });
};

export const deleteViewHistoryRemote = async (historyId: string, recipeId?: string): Promise<void> => {
  await apiClient.delete('/history', { data: { historyId, recipeId } });
};

export const clearViewHistoryRemote = async (): Promise<void> => {
  await apiClient.delete('/history', { data: { clearAll: true } });
};

// ─── Reports (需求 4) ──────────────────────────────────────────────────

export type ReportTargetType = 'RECIPE' | 'COMMENT';
export type ReportReasonType = 'SPAM' | 'INAPPROPRIATE' | 'COPYRIGHT' | 'HARMFUL' | 'OTHER';

export const submitReport = async (params: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReasonType;
  description?: string;
}): Promise<void> => {
  const token = await getAuthToken();
  await apiClient.post('/reports', params, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const updatePushToken = async (
  userId: string,
  token: string,
): Promise<void> => {
  await apiClient.patch(`/users/${userId}/push-token`, { expoPushToken: token });
};

// ─── Share ────────────────────────────────────────────────────────────────────

export interface ShareStats {
  total: number;
  byChannel: { channel: string; count: number }[];
}

export const recordShare = async (params: {
  recipeId: string;
  userId?: string | null;
  channel?: string | null;
}): Promise<void> => {
  await apiClient.post('/share', params);
};

export const fetchShareStats = async (recipeId: string): Promise<ShareStats> => {
  const res = await apiClient.get('/share', { params: { recipeId } });
  return res.data.data as ShareStats;
};

// ─── Search trending / log (FEAT-20260422-23) ────────────────────────────────
//
// 后端 /api/search-log：POST { query, userId? } 累加 Redis ZSET 24h/7d 窗口。
// 后端 /api/search-trending：GET ?window=24h|7d 返回 { items: [{ query, count }] }。
// 记录失败不要影响搜索体验 —— catch 掉吞日志即可。

export interface TrendingItem {
  query: string;
  count: number;
}

export const logSearch = async (query: string, userId?: string | null): Promise<void> => {
  try {
    await apiClient.post('/search-log', { query, userId: userId ?? null });
  } catch {
    // 埋点失败不影响主流程
  }
};

export const fetchSearchTrending = async (
  win: '24h' | '7d' = '24h',
): Promise<TrendingItem[]> => {
  const res = await apiClient.get('/search-trending', { params: { window: win } });
  const items = res.data?.data?.items;
  return Array.isArray(items) ? (items as TrendingItem[]) : [];
};

// ─── Recipe search v2 · cursor 分页 + SQL 版 trending（2026/04/23）─────────────
//
// 新版搜索 API 独立路径：
//   GET /api/recipes/search?q=&cursor=&limit=
//   GET /api/search/trending （不分 window，服务端固定 7d）
// 与老的 Redis 版 /api/search-log + /api/search-trending 并存。
// App 的搜索面板热词继续用 Redis 版（实时，分 24h/7d），搜索结果落到新版 API。

export interface RecipeSearchPage {
  data: Recipe[];
  nextCursor: string | null;
  total?: number;
}

export const fetchRecipeSearch = async (
  q: string,
  cursor?: string | null,
  limit = PAGE_SIZE,
): Promise<RecipeSearchPage> => {
  const res = await apiClient.get('/recipes/search', {
    params: {
      q,
      cursor: cursor ?? undefined,
      limit,
    },
  });
  const body = res.data?.data ?? {};
  const items = Array.isArray(body.items) ? (body.items as BackendRecipe[]) : [];
  const pagination = body.pagination ?? {};
  return {
    data: items.map(adaptRecipe),
    nextCursor: pagination.nextCursor ?? null,
    total: typeof pagination.total === 'number' ? pagination.total : undefined,
  };
};

export const fetchRecipeTrending = async (): Promise<TrendingItem[]> => {
  const res = await apiClient.get('/search/trending');
  const items = res.data?.data?.items;
  return Array.isArray(items) ? (items as TrendingItem[]) : [];
};


// ─── 社交功能 (REQ-5.4) ───────────────────────────────────────────────────────

export const followUser = async (userId: string): Promise<void> => {
  await apiClient.post(`/users/${userId}/follow`);
};

export const unfollowUser = async (userId: string): Promise<void> => {
  await apiClient.delete(`/users/${userId}/follow`);
};

export const fetchFollowers = async (
  userId: string,
  page = 1,
  pageSize = 20
): Promise<{ users: User[]; pagination: PageMeta }> => {
  const res = await apiClient.get(`/users/${userId}/followers`, {
    params: { page, pageSize },
  });
  const { followers, pagination } = res.data.data;
  return {
    users: followers.map((u: any) => ({
      id: u.id,
      name: u.name ?? "",
      avatar_url: u.avatar ?? `https://i.pravatar.cc/150?u=${u.id}`,
      bio: u.bio ?? "",
      email: u.email ?? "",
      favorites_count: 0,
      comments_count: 0,
      recipes_count: 0,
    })),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages,
    },
  };
};

export const fetchFollowing = async (
  userId: string,
  page = 1,
  pageSize = 20
): Promise<{ users: User[]; pagination: PageMeta }> => {
  const res = await apiClient.get(`/users/${userId}/following`, {
    params: { page, pageSize },
  });
  const { following, pagination } = res.data.data;
  return {
    users: following.map((u: any) => ({
      id: u.id,
      name: u.name ?? "",
      avatar_url: u.avatar ?? `https://i.pravatar.cc/150?u=${u.id}`,
      bio: u.bio ?? "",
      email: u.email ?? "",
      favorites_count: 0,
      comments_count: 0,
      recipes_count: 0,
    })),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages,
    },
  };
};

export const fetchHomeFeed = async (
  page = 1,
  pageSize = 20
): Promise<RecipesPage> => {
  const res = await apiClient.get("/api/feed", {
    params: { page, pageSize },
  });
  const { recipes, pagination } = res.data.data;
  return {
    data: recipes.map(adaptRecipe),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages,
    },
    page: pagination.page,
    limit: pagination.pageSize,
    total: pagination.total,
    hasMore: pagination.page < pagination.totalPages,
  };
};


// ─── Ranking (需求 3) ─────────────────────────────────────────────────────────

export interface RankedRecipe extends Recipe {
  rank: number;
  score: number;
}

export const fetchRankingRecipes = async (
  period: 'week' | 'month' = 'week',
  limit = 10,
): Promise<RankedRecipe[]> => {
  const res = await apiClient.get('/recipes/ranking', {
    params: { period, limit },
  });
  const wrapper = res.data.data as { recipes: (BackendRecipe & { rank: number; score: number })[] };
  const items = wrapper.recipes ?? [];
  return items.map((item) => ({
    ...adaptRecipe(item),
    rank: item.rank,
    score: item.score,
  }));
};

// ─── Random (需求 9) ──────────────────────────────────────────────────────────

export const fetchRandomRecipe = async (params?: {
  categoryId?: string;
  difficulty?: string;
}): Promise<Recipe> => {
  const res = await apiClient.get('/recipes/random', { params });
  const wrapper = res.data.data as { recipes: BackendRecipe[] };
  const arr = wrapper.recipes ?? [];
  if (arr.length === 0) throw new Error('No random recipe found');
  return adaptRecipe(arr[0]);
};

// ─── Achievements & Badges (Batch 10) ─────────────────────────────────────────

export interface Badge {
  id: string;
  key: string;
  nameEn: string;
  nameZh: string;
  descEn: string;
  descZh: string;
  icon: string;
  category: string;
  threshold: number;
  sortOrder: number;
}

export interface UserBadge extends Badge {
  unlockedAt: string;
}

export interface LevelInfo {
  level: number;
  xp: number;
  levelNameEn: string;
  levelNameZh: string;
  levelIcon: string;
  nextLevelXp: number | null;
  progress: number;
}

export const fetchBadges = async (): Promise<Badge[]> => {
  const res = await apiClient.get('/badges');
  return res.data.data.badges as Badge[];
};

export const fetchUserBadges = async (userId: string): Promise<UserBadge[]> => {
  const res = await apiClient.get(`/users/${userId}/badges`);
  return res.data.data.badges as UserBadge[];
};

export const checkAchievements = async (userId: string): Promise<Badge[]> => {
  const res = await apiClient.post(`/users/${userId}/achievements/check`);
  return res.data.data.newBadges as Badge[];
};

export const fetchUserLevel = async (userId: string): Promise<LevelInfo> => {
  const res = await apiClient.get(`/users/${userId}/level`);
  return res.data.data as LevelInfo;
};

export const addUserXp = async (userId: string, amount: number, reason?: string): Promise<{
  xp: number;
  level: number;
  leveledUp: boolean;
}> => {
  const res = await apiClient.post(`/users/${userId}/xp`, { amount, reason });
  return res.data.data;
};

// ─── Comment Like (REQ-11.2) ──────────────────────────────────────────────────

export const toggleCommentLike = async (commentId: string): Promise<{
  liked: boolean;
  likesCount: number;
}> => {
  const res = await apiClient.post(`/comments/${commentId}/like`);
  return { liked: res.data.data.liked, likesCount: res.data.data.likesCount };
};

export const fetchCommentLikeStatus = async (commentIds: string[]): Promise<Record<string, boolean>> => {
  if (commentIds.length === 0) return {};
  const res = await apiClient.get('/comments/like-status', {
    params: { commentIds: commentIds.join(',') },
  });
  return res.data.data.status;
};

// ─── Feed (REQ-11.5) ──────────────────────────────────────────────────────────

export type FeedItemType = 'recipe' | 'comment' | 'favorite';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  recipe?: Recipe;
  comment?: Comment & {
    recipe?: {
      id: string;
      titleEn: string;
      titleZh: string;
      coverImage: string | null;
      category: {
        nameEn: string;
        nameZh: string;
      };
    };
  };
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
}

export interface FeedPage {
  data: FeedItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const fetchFeed = async (cursor?: string, limit = 20): Promise<FeedResponse> => {
  const params: any = { limit };
  if (cursor) params.cursor = cursor;
  const res = await apiClient.get('/feed', { params });
  return res.data.data as FeedResponse;
};

export const toggleFollow = async (followingId: string, action: 'follow' | 'unfollow'): Promise<{ message: string }> => {
  if (action === 'follow') {
    const res = await apiClient.post(`/users/${followingId}/follow`);
    return res.data.data;
  } else {
    const res = await apiClient.delete(`/users/${followingId}/follow`);
    return res.data.data;
  }
};

// ─── Batch 15: 话题系统 & 搜索增强 ─────────────────────────────────────────

// 话题详情（含关注状态）
export interface TopicDetail {
  id: string;
  nameEn: string;
  nameZh: string;
  descEn?: string | null;
  descZh?: string | null;
  icon?: string | null;
  coverImage?: string | null;
  isHot: boolean;
  _count: {
    recipes: number;
  };
  followerCount: number;
  isFollowing: boolean;
}

export const fetchTopicDetail = async (topicId: string): Promise<TopicDetail> => {
  const res = await apiClient.get(`/topics/${topicId}`);
  return res.data.data;
};

// 话题菜谱列表
export interface TopicRecipesResponse {
  recipes: Recipe[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const fetchTopicRecipes = async (
  topicId: string,
  sort: 'latest' | 'hot' = 'latest',
  page = 1
): Promise<TopicRecipesResponse> => {
  const res = await apiClient.get(`/topics/${topicId}/recipes`, {
    params: { sort, page, limit: PAGE_SIZE }
  });
  return res.data.data;
};

// 关注/取消关注话题
export const toggleTopicFollow = async (
  topicId: string,
  action: 'follow' | 'unfollow'
): Promise<{ followed: boolean; followerCount: number }> => {
  if (action === 'follow') {
    const res = await apiClient.post(`/topics/${topicId}/follow`);
    return res.data.data;
  } else {
    const res = await apiClient.delete(`/topics/${topicId}/follow`);
    return res.data.data;
  }
};

// 我关注的话题列表
export interface FollowedTopic {
  id: string;
  nameEn: string;
  nameZh: string;
  icon?: string | null;
  _count: {
    recipes: number;
  };
  followerCount: number;
  followedAt: string;
}

export interface FollowedTopicsResponse {
  topics: FollowedTopic[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const fetchFollowedTopics = async (page = 1): Promise<FollowedTopicsResponse> => {
  const res = await apiClient.get('/me/followed-topics', {
    params: { page, limit: PAGE_SIZE }
  });
  return res.data.data;
};

// 热门搜索词
export interface TrendingKeyword {
  keyword: string;
  searchCount: number;
  clickRate: number;
  score: number;
  trendingType: 'hot' | 'rising' | 'new';
}

export interface TrendingResponse {
  trending: TrendingKeyword[];
  updatedAt: string;
}

export const fetchTrendingKeywords = async (limit = 10): Promise<TrendingResponse> => {
  const res = await apiClient.get('/search/trending', { params: { limit } });
  return res.data.data;
};

// 记录搜索行为
export const recordSearch = async (query: string, resultCount: number, clicked: boolean): Promise<void> => {
  await apiClient.post('/search/record', { query, resultCount, clicked });
};
