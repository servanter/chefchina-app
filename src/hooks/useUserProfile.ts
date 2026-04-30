import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

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

// REQ-16.1: 获取用户菜谱列表
export function useUserRecipes(userId?: string | null, tab: 'published' | 'liked' = 'published') {
  return useQuery({
    queryKey: ['userRecipes', userId, tab],
    queryFn: async () => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get(`/users/${userId}/recipes`, { params: { tab } })
      return res.data.data as any[]
    },
    enabled: !!userId,
  })
}

// REQ-16.1: 获取用户收藏列表
export function useUserFavorites(userId?: string | null) {
  return useQuery({
    queryKey: ['userFavorites', userId],
    queryFn: async () => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get(`/users/${userId}/favorites`)
      return (res.data.data?.data ?? []) as any[]
    },
    enabled: !!userId,
  })
}

// REQ-BF-010: 获取用户关注列表
export function useUserFollowing(userId?: string | null) {
  return useQuery({
    queryKey: ['userFollowing', userId],
    queryFn: async () => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get(`/users/${userId}/following`)
      return (res.data.data?.following ?? []) as any[]
    },
    enabled: !!userId,
  })
}

// REQ-BF-010: 获取用户粉丝列表
export function useUserFollowers(userId?: string | null) {
  return useQuery({
    queryKey: ['userFollowers', userId],
    queryFn: async () => {
      if (!userId) throw new Error('userId is required')
      const res = await apiClient.get(`/users/${userId}/followers`)
      return res.data.followers as any[]
    },
    enabled: !!userId,
  })
}
