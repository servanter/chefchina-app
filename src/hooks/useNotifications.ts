import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { useUnreadCount } from './useUnreadCount'

export type NotificationType = 'COMMENT_REPLY' | 'RECIPE_LIKED' | 'RECIPE_FAVORITED' | 'SUBMISSION_APPROVED' | 'SYSTEM'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  read_at: string | null
  created_at: string
  payload?: {
    recipeId?: string
    commentId?: string
    fromUserId?: string
    [key: string]: any
  }
}

export type TabType = 'all' | 'like' | 'comment' | 'system'

// REQ-16.2: 获取通知列表（支持分类）
export function useInfiniteNotifications(userId: string | null, tab: TabType = 'all') {
  return useInfiniteQuery({
    queryKey: ['notifications', userId, tab],
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get('/notifications', {
        params: {
          userId,
          tab,
          page: pageParam,
          pageSize: 20,
        },
      })
      return {
        data: res.data.data?.notifications ?? [],
        unreadCount: res.data.data?.unreadCount ?? 0,
        pagination: res.data.data?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 秒
  })
}

// 标记单条通知为已读
export function useMarkRead(userId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiClient.patch(`/notifications/${notificationId}/read`)
      return res.data
    },
    onSuccess: () => {
      // 刷新通知列表和未读数量
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] })
    },
  })
}

// REQ-16.2: 批量标记已读
export function useMarkAllRead(userId: string | null, tab: TabType = 'all') {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.post('/notifications/mark-all-read', null, {
        params: { userId, type: tab },
      })
      return res.data
    },
    onSuccess: () => {
      // 刷新所有通知相关查询
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] })
    },
  })
}
