import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiRequest } from '../lib/api'

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
      const res = await apiRequest(`/notifications?userId=${userId}&tab=${tab}&page=${pageParam}&pageSize=20`)
      return {
        data: res.data.notifications as Notification[],
        unreadCount: res.data.unreadCount,
        pagination: res.data.pagination,
      }
    },
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 秒
  })
}

// REQ-16.2: 获取未读数量（按类型分组）
export function useUnreadCount(userId: string | null) {
  return useQuery({
    queryKey: ['unreadCount', userId],
    queryFn: async () => {
      if (!userId) throw new Error('userId is required')
      const res = await apiRequest(`/notifications/unread-count?userId=${userId}`)
      return res.data as {
        all: number
        like: number
        comment: number
        system: number
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 秒
    refetchInterval: 60 * 1000, // 每分钟自动刷新
  })
}

// 标记单条通知为已读
export function useMarkRead(userId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' })
      return res.data
    },
    onSuccess: () => {
      // 刷新通知列表和未读数量
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount', userId] })
    },
  })
}

// REQ-16.2: 批量标记已读
export function useMarkAllRead(userId: string | null, tab: TabType = 'all') {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('userId is required')
      const res = await apiRequest(`/notifications/mark-all-read?userId=${userId}&type=${tab}`, { method: 'POST' })
      return res.data
    },
    onSuccess: () => {
      // 刷新所有通知相关查询
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount', userId] })
    },
  })
}
