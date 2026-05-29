import { useState, useCallback, useEffect } from 'react';
import {
  fetchBadges,
  fetchUserBadges,
  checkAchievements,
  fetchUserLevel,
  Badge,
  UserBadge,
  LevelInfo,
} from '../lib/api';

// 全部徽章
export const useBadges = () => {
  const [data, setData] = useState<Badge[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchBadges();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
};

// 用户已解锁徽章
export const useUserBadges = (userId: string | null | undefined) => {
  const [data, setData] = useState<UserBadge[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const result = await fetchUserBadges(userId);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  return { data, isLoading, error, refetch: load };
};

// 检查解锁
export const useCheckAchievements = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (userId: string) => {
    setIsPending(true);
    try {
      return await checkAchievements(userId);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending };
};

// 等级信息
export const useUserLevel = (userId: string | null | undefined) => {
  const [data, setData] = useState<LevelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const result = await fetchUserLevel(userId);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  return { data, isLoading, error, refetch: load };
};
