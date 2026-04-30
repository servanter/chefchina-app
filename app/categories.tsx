import React, { useMemo } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { useCategories } from '@/hooks/useRecipes'
import { useTheme } from '@/contexts/ThemeContext'

export default function CategoriesPage() {
  const router = useRouter()
  const { i18n, t } = useTranslation()
  const { colors } = useTheme()
  const isZh = i18n.language === 'zh'
  const { data: categories = [], isLoading } = useCategories()

  const sorted = useMemo(
    () => categories.filter((item) => item.id !== 'all'),
    [categories]
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('category.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>{t('category.subtitle')}</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              {isLoading ? t('common.loading') : t('category.empty')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/category/[id]', params: { id: item.id } })}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${colors.tint}14` }]}> 
              {item.icon ? (
                <Text style={styles.iconText}>{item.icon}</Text>
              ) : (
                <Ionicons name="grid-outline" size={24} color={colors.tint} />
              )}
            </View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {isZh ? item.label_zh : item.label}
            </Text>
            <Text style={[styles.count, { color: colors.subText }]}>
              {t('category.recipeCount', { count: item.recipesCount ?? 0 })}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  row: { gap: 12 },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    minHeight: 140,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: { fontSize: 24 },
  name: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  count: { fontSize: 13, marginTop: 10 },
  emptyWrap: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontSize: 14 },
})
