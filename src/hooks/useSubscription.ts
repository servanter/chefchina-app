import { useQuery } from '@tanstack/react-query';
import { config } from '@/config/env';

const API_URL = config.API_URL;

export interface SubscriptionStatus {
  isPremium: boolean;
  expiresAt?: string;
  planType?: 'monthly' | 'yearly' | 'first-month';
}

/**
 * 获取用户订阅状态
 */
export function useSubscriptionStatus(userId?: string) {
  return useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'status', userId],
    queryFn: async () => {
      if (!userId) {
        return { isPremium: false };
      }

      const response = await fetch(`${API_URL}/api/subscription/status`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      return response.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}
