import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { AppImage } from '../../src/components/AppImage'
import { LoadingSpinner } from '../../src/components/LoadingSpinner'
import { EmptyState } from '../../src/components/EmptyState'
import { RecipeCard } from '../../src/components/RecipeCard'
import { apiClient, adaptComment } from '../../src/lib/api'
import type { Comment } from '../../src/lib/api'
import { useAuth } from '../../src/hooks/useAuth'
import { useUserStats, useUserRecipes, useUserFavorites } from '../../src/hooks/useUserProfile'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useFontScale } from '../../src/hooks/useFontScale'

type TabType = 'recipes' | 'favorites' | 'comments'

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { colors } = useTheme()
  const { scaled } = useFontScale()
  const isZh = i18n.language === 'zh'
  const isOwnProfile = currentUser?.id === userId
  const [activeTab, setActiveTab] = useState<TabType>('recipes')
  const [refreshing, setRefreshing] = useState(false)

  const { data: user, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ['public-profile-user', userId],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${userId}`)
      return res.data.data
    },
    enabled: !!userId,
  })

  const { data: stats, refetch: refetchStats } = useUserStats(userId)
  const recipesQuery = useUserRecipes(userId, 'published')
  const favoritesQuery = useUserFavorites(userId)
  const commentsQuery = useQuery({
    queryKey: ['userComments', userId],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${userId}/comments`, { params: { page: 1, limit: 50 } })
      return {
        comments: (res.data.data.data ?? []).map(adaptComment),
      }
    },
    enabled: !!userId,
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      refetchUser(),
      refetchStats(),
      recipesQuery.refetch(),
      favoritesQuery.refetch(),
      commentsQuery.refetch(),
    ])
    setRefreshing(false)
  }

  const recipeItems = useMemo(
    () => recipesQuery.data?.pages?.flatMap((page: any) => page.data ?? []) ?? [],
    [recipesQuery.data],
  )
  const favoriteItems = useMemo(
    () => favoritesQuery.data?.pages?.flatMap((page: any) => page.data ?? []) ?? [],
    [favoritesQuery.data],
  )
  const commentItems = commentsQuery.data?.comments ?? []

  const data = activeTab === 'recipes' ? recipeItems : activeTab === 'favorites' ? favoriteItems : commentItems
  const loading = activeTab === 'recipes' ? recipesQuery.isLoading : activeTab === 'favorites' ? favoritesQuery.isLoading : commentsQuery.isLoading

  const loadMore = () => {
    if (activeTab === 'recipes' && recipesQuery.hasNextPage && !recipesQuery.isFetchingNextPage) recipesQuery.fetchNextPage()
    if (activeTab === 'favorites' && favoritesQuery.hasNextPage && !favoritesQuery.isFetchingNextPage) favoritesQuery.fetchNextPage()
  }

  if (userLoading) return <LoadingSpinner fullScreen />
  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <EmptyState icon="person-outline" title={t('common.noData')} subtitle={t('common.retry')} />
      </SafeAreaView>
    )
  }

  const statCards = [
    { key: 'recipes', label: t('profile.recipes'), value: stats?.recipeCount ?? 0 },
    { key: 'following', label: t('profile.following'), value: stats?.followingCount ?? 0 },
    { key: 'followers', label: t('profile.followers'), value: stats?.followerCount ?? 0 },
    { key: 'likes', label: t('profile.likes'), value: stats?.totalLikes ?? 0 },
  ]

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <FlatList
        data={data}
        keyExtractor={(item: any, index) => `${activeTab}-${item.id ?? index}`}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}> 
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(17) }]} numberOfLines={1}>
                {user.name || 'Anonymous'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.profileHeader}>
              <AppImage
                uri={user.avatar || user.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`}
                fallback={`https://i.pravatar.cc/150?u=${user.id}`}
                style={[styles.avatar, { borderColor: colors.tint }]}
              />
              <Text style={[styles.displayName, { color: colors.text, fontSize: scaled(20) }]}>
                {user.name || 'Anonymous'}
              </Text>
              <Text style={[styles.bio, { color: colors.subText, fontSize: scaled(13) }]}>
                {user.bio || t('profile.noBio')}
              </Text>
              {isOwnProfile ? (
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                  onPress={() => router.replace('/(tabs)/profile')}
                >
                  <Ionicons name="person-circle-outline" size={16} color={colors.tint} />
                  <Text style={[styles.editBtnText, { color: colors.tint }]}>{t('profile.title')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={[styles.statsRow, { backgroundColor: colors.card }]}> 
              {statCards.map((item, index) => (
                <React.Fragment key={item.key}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text, fontSize: scaled(18) }]}>{item.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.subText, fontSize: scaled(12) }]}>{item.label}</Text>
                  </View>
                  {index < statCards.length - 1 ? <View style={[styles.statDivider, { backgroundColor: colors.border }]} /> : null}
                </React.Fragment>
              ))}
            </View>

            <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}> 
              {[
                { key: 'recipes', label: t('profile.myRecipes') },
                { key: 'favorites', label: t('profile.myFavorites') },
                { key: 'comments', label: t('profile.myComments') },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.tint }]}
                  onPress={() => setActiveTab(tab.key as TabType)}
                >
                  <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.tint : colors.subText, fontSize: scaled(14) }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item }: { item: any }) => {
          if (activeTab === 'comments') {
            const comment = item as Comment
            const recipeTitle = isZh ? comment.recipe?.title_zh : comment.recipe?.title
            return (
              <TouchableOpacity
                style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => comment.recipe?.id && router.push(`/recipe/${comment.recipe.id}`)}
              >
                <Text style={[styles.commentRecipe, { color: colors.tint }]} numberOfLines={1}>
                  {recipeTitle || '-'}
                </Text>
                <Text style={[styles.commentContent, { color: colors.text }]}>{comment.content}</Text>
                <Text style={[styles.commentMeta, { color: colors.subText }]}>
                  {new Date(comment.created_at).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )
          }
          return (
            <View style={styles.recipeCardWrap}>
              <RecipeCard recipe={item} variant="grid" onPress={() => router.push(`/recipe/${item.id}`)} />
            </View>
          )
        }}
        numColumns={activeTab === 'comments' ? 1 : 2}
        columnWrapperStyle={activeTab === 'comments' ? undefined : styles.columnWrapper}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 40 }}><LoadingSpinner /></View>
          ) : (
            <EmptyState icon="document-text-outline" title={t('common.noData')} subtitle={t('profile.noBio')} />
          )
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  listContent: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '700' },
  profileHeader: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, marginBottom: 12 },
  displayName: { fontWeight: '700', marginBottom: 6 },
  bio: { textAlign: 'center' },
  editBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: { fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontWeight: '800', marginBottom: 4 },
  statLabel: {},
  statDivider: { width: 1, marginVertical: 6 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 20 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontWeight: '600' },
  columnWrapper: { paddingHorizontal: 16, gap: 12 },
  recipeCardWrap: { flex: 1, marginBottom: 12 },
  commentCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  commentRecipe: { fontWeight: '700', marginBottom: 8 },
  commentContent: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  commentMeta: { fontSize: 12 },
})
