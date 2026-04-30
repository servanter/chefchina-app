import React, { useMemo, useCallback, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { RecipeCard } from '@/components/RecipeCard'
import { ListFooter } from '@/components/ListFooter'
import { useTagRecipes } from '@/hooks/useRecipes'

export default function TagDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { i18n, t } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [refreshing, setRefreshing] = useState(false)

  const query = useTagRecipes(id ?? '')
  const recipes = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.data),
    [query.data]
  )
  const tag = query.data?.pages?.[0]?.tag

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await query.refetch()
    } finally {
      setRefreshing(false)
    }
  }, [query])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.tagName}>#{isZh ? tag?.label_zh ?? '' : tag?.label ?? ''}</Text>
        <Text style={styles.subtitle}>
          {t('tags.recipeCount', { count: query.data?.pages?.[0]?.pagination.total ?? 0 })}
        </Text>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            variant="list"
            onPress={() => router.push(`/recipe/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E85D26" />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <ListFooter
            hasMore={!!query.hasNextPage}
            isLoadingMore={query.isFetchingNextPage}
            error={query.error}
            onRetry={() => query.fetchNextPage()}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {query.isLoading ? t('common.loading') : t('tags.emptyRecipes')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF9' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  tagName: { fontSize: 28, fontWeight: '700', color: '#1F140D' },
  subtitle: { marginTop: 6, fontSize: 14, color: '#7B6D63' },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyWrap: { paddingTop: 80, alignItems: 'center' },
  emptyText: { color: '#7B6D63', fontSize: 14 },
})
