import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_ID: 'user_id',
  USER_EMAIL: 'user_email',
  USER_NAME: 'user_name',
  USER_BIO: 'user_bio',
  USER_AVATAR: 'user_avatar',
  AUTH_TOKEN: 'auth_token',
  LANGUAGE: 'language',
  FAVORITES: 'favorites',
  ONBOARDING_DONE: 'onboarding_done',
  SEARCH_HISTORY: 'search_history_v1',
  VIEW_HISTORY: 'view_history_v1',
  THEME: 'theme',
  FONT_SIZE: 'font_size',
  I18N_LANG: 'i18n_lang',
} as const;

// ─── 清缓存时"保护"的业务白名单 ────────────────────────────────────────────
// 清缓存只清图片/HTTP 缓存，业务键必须保留；Settings 清缓存、登出清 account 都按此枚举来决定范围。
// 全局偏好键，登出后保留，不属于账户凭证
export const PROTECTED_STORAGE_KEYS: readonly string[] = [
  KEYS.ONBOARDING_DONE,
  KEYS.THEME,
  KEYS.FONT_SIZE,
  KEYS.I18N_LANG,
  KEYS.LANGUAGE, // 真实落地键（i18n.ts 用的是 LANGUAGE，I18N_LANG 是设置页备用 alias）
] as const;

const SEARCH_HISTORY_LIMIT = 10;
const VIEW_HISTORY_LIMIT = 50;

// ─── Generic helpers ──────────────────────────────────────────────────────────

export const storeString = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn('storeString error', e);
  }
};

export const getString = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn('getString error', e);
    return null;
  }
};

export const removeKey = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('removeKey error', e);
  }
};

export const storeJSON = async <T>(key: string, value: T): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('storeJSON error', e);
  }
};

export const getJSON = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn('getJSON error', e);
    return null;
  }
};

// ─── Domain helpers ────────────────────────────────────────────────────────────

export const saveUserId = (id: string) => storeString(KEYS.USER_ID, id);
export const getUserId = () => getString(KEYS.USER_ID);
export const clearUserId = () => removeKey(KEYS.USER_ID);

export const saveUserEmail = (email: string) => storeString(KEYS.USER_EMAIL, email);
export const getUserEmail = () => getString(KEYS.USER_EMAIL);

export const saveUserName = (name: string) => storeString(KEYS.USER_NAME, name);
export const getUserName = () => getString(KEYS.USER_NAME);

export const saveUserBio = (bio: string) => storeString(KEYS.USER_BIO, bio);
export const getUserBio = () => getString(KEYS.USER_BIO);

export const saveUserAvatar = (avatar: string) => storeString(KEYS.USER_AVATAR, avatar);
export const getUserAvatar = () => getString(KEYS.USER_AVATAR);

export const saveAuthToken = (token: string) => storeString(KEYS.AUTH_TOKEN, token);
export const getAuthToken = () => getString(KEYS.AUTH_TOKEN);
export const clearAuthToken = () => removeKey(KEYS.AUTH_TOKEN);

export const saveLanguage = (lang: string) => storeString(KEYS.LANGUAGE, lang);
export const getLanguage = () => getString(KEYS.LANGUAGE);

export const getFavoriteIds = () => getJSON<string[]>(KEYS.FAVORITES);
export const saveFavoriteIds = (ids: string[]) => storeJSON(KEYS.FAVORITES, ids);

export const ONBOARDING_DONE_KEY = KEYS.ONBOARDING_DONE;
export const getOnboardingDone = () => getString(KEYS.ONBOARDING_DONE);
export const setOnboardingDone = () => storeString(KEYS.ONBOARDING_DONE, 'true');

// ─── 设置页：主题 / 字体大小 / i18n ───────────────────────────────────────
export type ThemePref = 'light' | 'dark' | 'system';
export type FontSizePref = 'small' | 'medium' | 'large';

export const getThemePref = async (): Promise<ThemePref> => {
  const v = await getString(KEYS.THEME);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
};
export const saveThemePref = (v: ThemePref) => storeString(KEYS.THEME, v);

export const getFontSizePref = async (): Promise<FontSizePref> => {
  const v = await getString(KEYS.FONT_SIZE);
  return v === 'small' || v === 'medium' || v === 'large' ? v : 'medium';
};
export const saveFontSizePref = (v: FontSizePref) => storeString(KEYS.FONT_SIZE, v);

export const getI18nLang = () => getString(KEYS.I18N_LANG);
export const saveI18nLang = (v: string) => storeString(KEYS.I18N_LANG, v);

// ─── Search history (FEAT-20260422-23) ───────────────────────────────────────
//
// 本地保存用户搜索历史：10 条上限、去重、时间倒序（最新在前）。
// 存储格式：string[] via JSON。Key 带 _v1 后缀，方便以后升级结构。

const normalizeQuery = (q: string): string =>
  q.trim().replace(/\s+/g, ' ');

export const getSearchHistory = async (): Promise<string[]> => {
  const list = await getJSON<string[]>(KEYS.SEARCH_HISTORY);
  return Array.isArray(list) ? list : [];
};

export const saveSearchHistory = async (query: string): Promise<string[]> => {
  const normalized = normalizeQuery(query);
  if (!normalized) return getSearchHistory();
  const existing = await getSearchHistory();
  // 去重：忽略大小写（英文），CJK 保持原样
  const lower = normalized.toLowerCase();
  const filtered = existing.filter((q) => q.toLowerCase() !== lower);
  const next = [normalized, ...filtered].slice(0, SEARCH_HISTORY_LIMIT);
  await storeJSON(KEYS.SEARCH_HISTORY, next);
  return next;
};

export const removeSearchHistoryItem = async (query: string): Promise<string[]> => {
  const target = query.toLowerCase();
  const existing = await getSearchHistory();
  const next = existing.filter((q) => q.toLowerCase() !== target);
  await storeJSON(KEYS.SEARCH_HISTORY, next);
  return next;
};

export const clearSearchHistory = async (): Promise<void> => {
  await removeKey(KEYS.SEARCH_HISTORY);
};

export interface ViewHistorySnapshot {
  title?: string;
  title_zh?: string;
  description?: string;
  description_zh?: string;
  cover_image?: string;
}

export interface ViewHistoryItem extends ViewHistorySnapshot {
  recipeId: string;
  viewedAt: string;
}

const isValidViewHistoryItem = (item: unknown): item is ViewHistoryItem => {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.recipeId === 'string' && typeof candidate.viewedAt === 'string';
};

export const getViewHistory = async (): Promise<ViewHistoryItem[]> => {
  const list = await getJSON<unknown[]>(KEYS.VIEW_HISTORY);
  return Array.isArray(list) ? list.filter(isValidViewHistoryItem) : [];
};

export const saveViewHistoryItem = async (
  recipeId: string,
  snapshot?: ViewHistorySnapshot,
): Promise<ViewHistoryItem[]> => {
  if (!recipeId) return getViewHistory();
  const existing = await getViewHistory();
  const filtered = existing.filter((item) => item.recipeId !== recipeId);
  const next: ViewHistoryItem[] = [
    {
      recipeId,
      viewedAt: new Date().toISOString(),
      title: snapshot?.title,
      title_zh: snapshot?.title_zh,
      description: snapshot?.description,
      description_zh: snapshot?.description_zh,
      cover_image: snapshot?.cover_image,
    },
    ...filtered,
  ].slice(0, VIEW_HISTORY_LIMIT);
  await storeJSON(KEYS.VIEW_HISTORY, next);
  return next;
};

export const removeViewHistoryItem = async (recipeId: string): Promise<ViewHistoryItem[]> => {
  const existing = await getViewHistory();
  const next = existing.filter((item) => item.recipeId !== recipeId);
  await storeJSON(KEYS.VIEW_HISTORY, next);
  return next;
};

export const clearViewHistory = async (): Promise<void> => {
  await removeKey(KEYS.VIEW_HISTORY);
};

// BUG-004 修复：clearAll 必须遵循 PROTECTED_STORAGE_KEYS 白名单，
// 登出时不能清掉主题/字体/i18n/onboarding/搜索历史等全局偏好。
// 改造：用 getAllKeys() 拿到所有键，filter 掉受保护的，只删账户相关。
export const clearAll = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const protectedSet = new Set<string>(PROTECTED_STORAGE_KEYS);
    const toRemove = allKeys.filter((k) => !protectedSet.has(k));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    console.warn('clearAll error', e);
  }
};
