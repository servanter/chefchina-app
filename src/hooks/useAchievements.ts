import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  return useQuery<Badge[]>({
    queryKey: ['badges'],
    queryFn: fetchBadges,
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  });
};

// 用户已解锁徽章
export const useUserBadges = (userId: string | null | undefined) => {
  return useQuery<UserBadge[]>({
    queryKey: ['userBadges', userId],
    queryFn: () => fetchUserBadges(userId!),
    enabled: !!userId,
  });
};

// 检查解锁（mutation）
export const useCheckAchievements = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => checkAchievements(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['userBadges', userId] });
      queryClient.invalidateQueries({ queryKey: ['userLevel', userId] });
    },
  });
};

// 等级信息
export const useUserLevel = (userId: string | null | undefined) => {
  return useQuery<LevelInfo>({
    queryKey: ['userLevel', userId],
    queryFn: () => fetchUserLevel(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 分钟缓存，level 不常变
  });
};
