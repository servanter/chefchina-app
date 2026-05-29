import { useState, useCallback, useEffect, useRef } from 'react'
import { apiClient, PAGE_SIZE } from '../lib/api'

// REQ-16.1: 获取用户统计数据
export function useUserStats(userId?: string | null) {
  const [data, setData] = useState<{
    recipeCount: number
    totalLikes: number
    followingCount: number
    followerCount: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const res = await apiClient.get(`/users/${userId}/stats`)
      setData(res.data)
      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) load()
  }, [userId, load])

  return { data, isLoading, error, refetch: load }
}

function makeUserListHook(endpoint: (userId: string) => string) {
  return function useUserList(userId?: string | null) {
    const [pages, setPages] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
    const [hasNextPage, setHasNextPage] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const pageRef = useRef(0)

    const fetchPage = useCallback(
      async (reset: boolean) => {
        if (!userId) return
        const nextPage = reset ? 1 : pageRef.current + 1
        if (reset) {
          setIsLoading(true)
          setPages([])
          pageRef.current = 0
          setHasNextPage(false)
        } else {
          if (!hasNextPage || isFetchingNextPage) return
          setIsFetchingNextPage(true)
        }
        try {
          const res = await apiClient.get(endpoint(userId), {
            params: { page: nextPage, limit: PAGE_SIZE },
          })
          const pageData = res.data.data
          pageRef.current = nextPage
          setPages((prev) => (reset ? [pageData] : [...prev, pageData]))
          setHasNextPage(!!pageData?.pagination?.hasMore)
          setError(null)
        } catch (e) {
          setError(e as Error)
        } finally {
          setIsLoading(false)
          setIsFetchingNextPage(false)
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [userId],
    )

    useEffect(() => {
      if (userId) fetchPage(true)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    const refetch = useCallback(() => fetchPage(true), [fetchPage])
    const fetchNextPage = useCallback(() => fetchPage(false), [fetchPage])

    // Flat data for convenience
    const data = pages.length > 0
      ? { pages: pages.map((p) => p) }
      : undefined

    return { data, isLoading, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage }
  }
}

// REQ-16.1: 获取用户菜谱列表
export function useUserRecipes(userId?: string | null, tab: 'published' | 'liked' = 'published') {
  const [pages, setPages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const pageRef = useRef(0)

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!userId) return
      const nextPage = reset ? 1 : pageRef.current + 1
      if (reset) {
        setIsLoading(true)
        setPages([])
        pageRef.current = 0
        setHasNextPage(false)
      } else {
        if (!hasNextPage || isFetchingNextPage) return
        setIsFetchingNextPage(true)
      }
      try {
        const res = await apiClient.get(`/users/${userId}/recipes`, {
          params: { tab, page: nextPage, limit: PAGE_SIZE },
        })
        const pageData = res.data.data
        pageRef.current = nextPage
        setPages((prev) => (reset ? [pageData] : [...prev, pageData]))
        setHasNextPage(!!pageData?.pagination?.hasMore)
        setError(null)
      } catch (e) {
        setError(e as Error)
      } finally {
        setIsLoading(false)
        setIsFetchingNextPage(false)
      }
    },
    [userId, tab],
  )

  useEffect(() => {
    if (userId) fetchPage(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab])

  const refetch = useCallback(() => fetchPage(true), [fetchPage])
  const fetchNextPage = useCallback(() => fetchPage(false), [fetchPage])
  const data = pages.length > 0 ? { pages } : undefined

  return { data, isLoading, isFetchingNextPage, hasNextPage, error, refetch, fetchNextPage }
}

// REQ-16.1: 获取用户收藏列表
export const useUserFavorites = makeUserListHook((id) => `/users/${id}/favorites`)

// REQ-BF-010: 获取用户关注列表
export const useUserFollowing = makeUserListHook((id) => `/users/${id}/following`)

// REQ-BF-010: 获取用户粉丝列表
export const useUserFollowers = makeUserListHook((id) => `/users/${id}/followers`)
