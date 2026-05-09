import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '@/config/env';
import { getAuthToken } from '@/lib/storage';

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

      const token = await getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      try {
        const response = await axios.get(`${API_URL}/api/subscription/status`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Token 无效，需要重新登录
          throw new Error('Unauthorized');
        }
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}
