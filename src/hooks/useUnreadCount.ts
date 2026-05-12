import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export interface NotificationUnreadCount {
  all: number;
  like: number;
  comment: number;
  system: number;
}

export function useUnreadCount(userId: string | null) {
  return useQuery<NotificationUnreadCount>({
    queryKey: ['notifications', 'unread-count', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('userId is required');
      }

      const res = await apiClient.get('/notifications/unread-count', {
        params: { userId },
      });

      return res.data.data as NotificationUnreadCount;
    },
    enabled: !!userId,
    staleTime: 180 * 1000, // 3 分钟
    refetchInterval: 180 * 1000, // 3 分钟轮询一次
  });
}
