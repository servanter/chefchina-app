import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/api';

export interface NotificationUnreadCount {
  all: number;
  like: number;
  comment: number;
  system: number;
}

export function useUnreadCount(userId: string | null) {
  const [data, setData] = useState<NotificationUnreadCount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get('/notifications/unread-count', {
        params: { userId },
      });
      setData(res.data.data as NotificationUnreadCount);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      load();
      // 3 分钟轮询一次
      const interval = setInterval(load, 180 * 1000);
      return () => clearInterval(interval);
    }
  }, [userId, load]);

  return { data, isLoading, error, refetch: load };
}
