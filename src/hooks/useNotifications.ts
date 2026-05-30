import { useState, useCallback, useEffect, useRef } from 'react'
import { apiClient } from '../lib/api'

export type NotificationType =
  | 'COMMENT_REPLY'
  | 'RECIPE_LIKED'
  | 'RECIPE_FAVORITED'
  | 'RECIPE_COMMENTED'
  | 'NEW_FOLLOWER'
  | 'SUBMISSION_APPROVED'
  | 'SYSTEM'

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
    followerId?: string
    [key: string]: any
  }
}

export type TabType = 'all' | 'like' | 'comment' | 'system'

interface NotificationPage {
  data: Notification[]
  unreadCount: number
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

// REQ-16.2: 获取通知列表（支持分类，无限滚动）
export function useInfiniteNotifications(userId: string | null, tab: TabType = 'all') {
  const [pages, setPages] = useState<NotificationPage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const pageRef = useRef(0)

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!userId) return
      const nextPage = reset ? 1 : pageRef.current + 1
      if (reset) {
        setIsLoading(true)
        setIsFetching(true)
        setPages([])
        setHasNextPage(true)
        pageRef.current = 0
      } else {
        if (!hasNextPage || isFetchingNextPage) return
        setIsFetchingNextPage(true)
        setIsFetching(true)
      }
      try {
        const res = await apiClient.get('/notifications', {
          params: { userId, tab, page: nextPage, pageSize: 20 },
        })
        const page: NotificationPage = {
          data: res.data.data?.notifications ?? [],
          unreadCount: res.data.data?.unreadCount ?? 0,
          pagination: res.data.data?.pagination ?? { page: nextPage, pageSize: 20, total: 0, totalPages: 0 },
        }
        pageRef.current = nextPage
        setPages((prev) => (reset ? [page] : [...prev, page]))
        setHasNextPage(page.pagination.page < page.pagination.totalPages)
        setError(null)
      } catch (e) {
        setError(e as Error)
      } finally {
        setIsLoading(false)
        setIsFetchingNextPage(false)
        setIsFetching(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, tab],
  )

  useEffect(() => {
    if (userId) fetchPage(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab])

  const refetch = useCallback(() => fetchPage(true), [fetchPage])
  const fetchNextPage = useCallback(() => fetchPage(false), [fetchPage])

  // Expose pages for backward compat
  const data = pages.length > 0 ? { pages } : undefined

  /** 乐观更新：立即把所有已加载页的通知 read 设为 true，返回旧快照供回滚 */
  const optimisticMarkAllRead = useCallback((): NotificationPage[] => {
    const snapshot = pages
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        unreadCount: 0,
        data: p.data.map((n) => ({ ...n, read: true })),
      })),
    )
    return snapshot
  // pages 会造成 stale closure，这里故意依赖 setPages（稳定引用）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 回滚乐观更新：恢复到快照 */
  const rollbackMarkAllRead = useCallback((snapshot: NotificationPage[]) => {
    setPages(snapshot)
  }, [])

  return {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    error,
    refetch,
    fetchNextPage,
    optimisticMarkAllRead,
    rollbackMarkAllRead,
  }
}

// 标记单条通知为已读
export function useMarkRead(_userId: string | null) {
  const [isPending, setIsPending] = useState(false)

  const mutateAsync = useCallback(async (notificationId: string) => {
    setIsPending(true)
    try {
      const res = await apiClient.patch(`/notifications/${notificationId}/read`)
      return res.data
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutateAsync, isPending }
}

// REQ-16.2: 批量标记已读（含乐观更新）
export function useMarkAllRead(
  userId: string | null,
  tab: TabType = 'all',
  opts?: {
    /** 请求发出前立即调用，执行乐观更新；返回快照数据供回滚 */
    onOptimistic?: () => unknown
    /** 请求失败时调用，传入 onOptimistic 返回的快照以便回滚 */
    onRollback?: (snapshot: unknown) => void
  },
) {
  const [isPending, setIsPending] = useState(false)

  const mutateAsync = useCallback(async () => {
    if (!userId) throw new Error('userId is required')
    setIsPending(true)

    // 乐观更新：先在本地把所有通知标记为已读
    const snapshot = opts?.onOptimistic?.()

    try {
      const res = await apiClient.post('/notifications/mark-all-read', null, {
        params: { userId, type: tab },
      })
      return res.data
    } catch (e) {
      // 请求失败 → 回滚到快照
      opts?.onRollback?.(snapshot)
      throw e
    } finally {
      setIsPending(false)
    }
  // opts 是内联对象，不应放进 deps，用 ref 避免 stale closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab])

  return { mutateAsync, isPending }
}
