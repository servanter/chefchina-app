import React, { useMemo } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTags } from '@/hooks/useRecipes'

export default function TagsPage() {
  const router = useRouter()
  const { i18n, t } = useTranslation()
  const isZh = i18n.language === 'zh'
  const { data: tags = [], isLoading } = useTags()

  const sorted = useMemo(
    () => [...tags].sort((a, b) => (b.recipesCount ?? 0) - (a.recipesCount ?? 0)),
    [tags]
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tags.title')}</Text>
        <Text style={styles.subtitle}>{t('tags.subtitle')}</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{isLoading ? t('common.loading') : t('tags.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/tag/[id]', params: { id: item.id } })}
          >
            <Text style={styles.tagName}>#{isZh ? item.label_zh : item.label}</Text>
            <Text style={styles.tagCount}>
              {t('tags.usageCount', { count: item.recipesCount ?? 0 })}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF9' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#1F140D' },
  subtitle: { marginTop: 6, fontSize: 14, color: '#7B6D63' },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  row: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E4D8',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  tagName: { fontSize: 18, fontWeight: '700', color: '#C75B1A' },
  tagCount: { fontSize: 13, color: '#7B6D63', marginTop: 12 },
  emptyWrap: { paddingTop: 80, alignItems: 'center' },
  emptyText: { color: '#7B6D63', fontSize: 14 },
})
