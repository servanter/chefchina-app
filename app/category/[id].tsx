import React, { useMemo, useCallback, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { RecipeCard } from '@/components/RecipeCard'
import { ListFooter } from '@/components/ListFooter'
import { useCategoryRecipes } from '@/hooks/useRecipes'
import { useTheme } from '@/contexts/ThemeContext'

const SORT_OPTIONS = ['popular', 'newest', 'favorites'] as const

type SortValue = (typeof SORT_OPTIONS)[number]

export default function CategoryDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { i18n, t } = useTranslation()
  const { colors } = useTheme()
  const isZh = i18n.language === 'zh'
  const [refreshing, setRefreshing] = useState(false)
  const [sort, setSort] = useState<SortValue>('popular')

  const query = useCategoryRecipes(id ?? '', sort)
  const recipes = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.data),
    [query.data]
  )
  const category = query.data?.pages?.[0]?.category
  const total = query.data?.pages?.[0]?.pagination.total ?? 0

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await query.refetch()
    } finally {
      setRefreshing(false)
    }
  }, [query])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.categoryName, { color: colors.text }]}>
            {isZh ? category?.label_zh ?? '' : category?.label ?? ''}
          </Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            {t('category.recipeCount', { count: total })}
          </Text>
        </View>
      </View>

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((option) => {
          const selected = option === sort
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.sortChip,
                {
                  backgroundColor: selected ? colors.tint : colors.card,
                  borderColor: selected ? colors.tint : colors.border,
                },
              ]}
              onPress={() => setSort(option)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.sortChipText,
                  { color: selected ? '#FFFFFF' : colors.text },
                ]}
              >
                {t(`category.sort.${option}`)}
              </Text>
            </TouchableOpacity>
          )
        })}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
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
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              {query.isLoading ? t('common.loading') : t('category.emptyRecipes')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerText: { flex: 1 },
  categoryName: { fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 14 },
  sortRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 10,
  },
  sortChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sortChipText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyWrap: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontSize: 14 },
})
