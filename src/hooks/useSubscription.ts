import { useState, useEffect, useCallback } from 'react';
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
  const [data, setData] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await axios.get(`${API_URL}/api/subscription/status`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // 后端返回 { success: true, data: {...} } 格式
      // 需要提取嵌套的 data 对象
      if (response.data.success && response.data.data) {
        const apiData = response.data.data;
        console.log('[useSubscriptionStatus] API response:', apiData);

        // 字段映射：后端 currentPeriodEnd → 前端 expiresAt
        setData({
          isPremium: apiData.isPremium,
          expiresAt: apiData.currentPeriodEnd,  // 映射字段名
          planType: apiData.planType?.toLowerCase() as 'monthly' | 'yearly' | 'first-month',
        });
      } else {
        // 如果后端返回 success: false，抛出错误
        throw new Error(response.data.error || 'Failed to get subscription status');
      }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        setError(new Error('Unauthorized'));
      } else {
        setError(e as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) load();
    else setData(null);
  }, [userId, load]);

  return { data, isLoading, error, refetch: load };
}
