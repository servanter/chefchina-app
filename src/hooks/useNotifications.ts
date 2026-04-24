import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  Notification,
  NotificationsPage,
} from '../lib/api';

// ─── Lists ────────────────────────────────────────────────────────────────────

export const useNotifications = (userId?: string | null) => {
  return useQuery<NotificationsPage>({
    queryKey: ['notifications', userId, 'first'],
    queryFn: () => fetchNotifications(userId as string, 1),
    enabled: !!userId && userId !== 'guest',
    staleTime: 1000 * 30,
  });
};

export const useInfiniteNotifications = (userId?: string | null) => {
  return useInfiniteQuery<NotificationsPage>({
    queryKey: ['notifications', userId, 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      fetchNotifications(userId as string, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: !!userId && userId !== 'guest',
    staleTime: 1000 * 30,
  });
};

// ─── Unread badge (polled) ────────────────────────────────────────────────────

export const useUnreadCount = (userId?: string | null) => {
  return useQuery<number>({
    queryKey: ['notifications', userId, 'unreadCount'],
    queryFn: () => fetchUnreadCount(userId as string),
    enabled: !!userId && userId !== 'guest',
    staleTime: 1000 * 30,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

const invalidateAll = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string | null,
) => {
  queryClient.invalidateQueries({ queryKey: ['notifications', userId, 'first'] });
  queryClient.invalidateQueries({ queryKey: ['notifications', userId, 'infinite'] });
  queryClient.invalidateQueries({ queryKey: ['notifications', userId, 'unreadCount'] });
};

export const useMarkRead = (userId?: string | null) => {
  const queryClient = useQueryClient();
  return useMutation<Notification, Error, string>({
    mutationFn: (id) => markNotificationRead(id),
    onMutate: async (id) => {
      // Optimistically flip `read` in both the first-page cache AND the
      // infinite-page cache (whichever consumer is mounted will see it).
      const firstKey = ['notifications', userId, 'first'] as const;
      const infiniteKey = ['notifications', userId, 'infinite'] as const;

      const prevFirst = queryClient.getQueryData<NotificationsPage>(firstKey);
      if (prevFirst) {
        queryClient.setQueryData<NotificationsPage>(firstKey, {
          ...prevFirst,
          unreadCount: Math.max(0, prevFirst.unreadCount - 1),
          data: prevFirst.data.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        });
      }

      const prevInfinite = queryClient.getQueryData<{
        pages: NotificationsPage[];
        pageParams: unknown[];
      }>(infiniteKey);
      if (prevInfinite) {
        queryClient.setQueryData(infiniteKey, {
          ...prevInfinite,
          pages: prevInfinite.pages.map((p, idx) => ({
            ...p,
            unreadCount:
              idx === 0 ? Math.max(0, p.unreadCount - 1) : p.unreadCount,
            data: p.data.map((n) =>
              n.id === id ? { ...n, read: true } : n,
            ),
          })),
        });
      }

      const prevCount = queryClient.getQueryData<number>([
        'notifications',
        userId,
        'unreadCount',
      ]);
      if (typeof prevCount === 'number') {
        queryClient.setQueryData(
          ['notifications', userId, 'unreadCount'],
          Math.max(0, prevCount - 1),
        );
      }
      return { prevFirst, prevInfinite, prevCount };
    },
    onSettled: () => invalidateAll(queryClient, userId),
  });
};

export const useMarkAllRead = (userId?: string | null) => {
  const queryClient = useQueryClient();
  return useMutation<number, Error, void>({
    mutationFn: async () => markAllNotificationsRead(userId as string),
    onSuccess: () => invalidateAll(queryClient, userId),
  });
};

export const useDeleteNotification = (userId?: string | null) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => invalidateAll(queryClient, userId),
  });
};
