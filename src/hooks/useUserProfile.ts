import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, PAGE_SIZE } from '../lib/api'

// REQ-16.1: 获取用户统计数据
export function useUserStats(userId?: string | null) {
  return useQuery({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get(`/users/${userId}/stats`)
      return res.data as {
        recipeCount: number
        totalLikes: number
        followingCount: number
        followerCount: number
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  })
}

function createUserListQueryKey(key: string, userId?: string | null, extra?: string) {
  return extra ? [key, userId, extra] : [key, userId]
}

function getNextPage(lastPage: any) {
  return lastPage?.pagination?.hasMore ? lastPage.pagination.page + 1 : undefined
}

// REQ-16.1: 获取用户菜谱列表
export function useUserRecipes(userId?: string | null, tab: 'published' | 'liked' = 'published') {
  return useInfiniteQuery({
    queryKey: createUserListQueryKey('userRecipes', userId, tab),
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get(`/users/${userId}/recipes`, {
        params: { tab, page: pageParam, limit: PAGE_SIZE },
      })
      return res.data.data
    },
    initialPageParam: 1,
    getNextPageParam: getNextPage,
    enabled: !!userId,
  })
}

// REQ-16.1: 获取用户收藏列表
export function useUserFavorites(userId?: string | null) {
  return useInfiniteQuery({
    queryKey: createUserListQueryKey('userFavorites', userId),
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get(`/users/${userId}/favorites`, {
        params: { page: pageParam, limit: PAGE_SIZE },
      })
      return res.data.data
    },
    initialPageParam: 1,
    getNextPageParam: getNextPage,
    enabled: !!userId,
  })
}

// REQ-BF-010: 获取用户关注列表
export function useUserFollowing(userId?: string | null) {
  return useInfiniteQuery({
    queryKey: createUserListQueryKey('userFollowing', userId),
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get(`/users/${userId}/following`, {
        params: { page: pageParam, limit: PAGE_SIZE },
      })
      return res.data.data
    },
    initialPageParam: 1,
    getNextPageParam: getNextPage,
    enabled: !!userId,
  })
}

// REQ-BF-010: 获取用户粉丝列表
export function useUserFollowers(userId?: string | null) {
  return useInfiniteQuery({
    queryKey: createUserListQueryKey('userFollowers', userId),
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get(`/users/${userId}/followers`, {
        params: { page: pageParam, limit: PAGE_SIZE },
      })
      return res.data.data
    },
    initialPageParam: 1,
    getNextPageParam: getNextPage,
    enabled: !!userId,
  })
}
