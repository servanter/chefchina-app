import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useMyRecipes } from '@/hooks/useRecipes';
import { useFontScale } from '@/hooks/useFontScale';
import type { Recipe } from '@/lib/api';

const STATUS_TABS = ['all', 'draft', 'published', 'offline'] as const;
type StatusTab = typeof STATUS_TABS[number];

export default function MyRecipesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const [status, setStatus] = useState<StatusTab>('all');
  const query = useMyRecipes(status);

  const recipes = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.data),
    [query.data],
  );

  const renderItem = ({ item }: { item: Recipe }) => {
    const statusLabel = item.is_published
      ? t('myRecipes.statusPublished')
      : t('myRecipes.statusDraft');
    const badgeColor = item.is_published ? '#16a34a' : '#f59e0b';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/recipe/${item.id}`)}
      >
        <Image source={{ uri: item.cover_image }} style={styles.cover} />
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text, fontSize: scaled(16) }]} numberOfLines={2}>
              {i18n.language.startsWith('zh') ? item.title_zh : item.title}
            </Text>
            <View style={[styles.badge, { backgroundColor: `${badgeColor}18` }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={[styles.meta, { color: colors.subText }]} numberOfLines={2}>
            {(i18n.language.startsWith('zh') ? item.description_zh : item.description) || t('myRecipes.noDescription')}
          </Text>
          <View style={styles.statsRow}>
            <Text style={[styles.stat, { color: colors.subText }]}>{t('myRecipes.likes', { count: item.likes_count })}</Text>
            <Text style={[styles.stat, { color: colors.subText }]}>{t('myRecipes.comments', { count: item.comments_count })}</Text>
            <Text style={[styles.stat, { color: colors.subText }]}>{t('myRecipes.favorites', { count: item.favorites_count })}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.safeAreaBg }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(20) }]}>{t('myRecipes.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const active = tab === status;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setStatus(tab)}
              style={[
                styles.tab,
                { borderColor: active ? colors.tint : colors.border, backgroundColor: active ? `${colors.tint}14` : colors.card },
              ]}
            >
              <Text style={{ color: active ? colors.tint : colors.subText, fontSize: scaled(13), fontWeight: '600' }}>
                {t(`myRecipes.tabs.${tab}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>{t('common.loading')}</Text>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={52} color={colors.subText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('myRecipes.emptyTitle')}</Text>
          <Text style={[styles.emptyText, { color: colors.subText }]}>{t(`myRecipes.emptyByStatus.${status}`)}</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator color={colors.tint} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 32, alignItems: 'center' },
  headerTitle: { fontWeight: '700' },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  tab: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  cover: { width: 110, height: 110, backgroundColor: '#eee' },
  content: { flex: 1, padding: 12, gap: 8 },
  headerRow: { gap: 8 },
  title: { fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  stat: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
