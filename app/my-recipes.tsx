import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { useDeleteRecipe, useMyRecipes, useRepublishRecipe, useUnpublishRecipe } from '@/hooks/useRecipes';
import { useFontScale } from '@/hooks/useFontScale';
import type { Recipe } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';

const STATUS_TABS = ['all', 'draft', 'published'] as const;
type StatusTab = typeof STATUS_TABS[number];

export default function MyRecipesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const [status, setStatus] = useState<StatusTab>('all');
  const query = useMyRecipes(status);
  const deleteMutation = useDeleteRecipe();
  const republishMutation = useRepublishRecipe();
  const unpublishMutation = useUnpublishRecipe();

  const recipes = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.data),
    [query.data],
  );

  const handleContinueEdit = (item: Recipe) => {
    router.push({
      pathname: '/recipe/create',
      params: { recipeId: item.id, mode: 'edit' },
    });
  };

  const handleDelete = (item: Recipe) => {
    Alert.alert(
      t('common.confirm'),
      t('myRecipes.deleteConfirm', { title: i18n.language.startsWith('zh') ? item.title_zh : item.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('myRecipes.actions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(item.id);
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.message || t('common.operationFailed'));
            }
          },
        },
      ],
    );
  };

  const handleRepublish = async (item: Recipe) => {
    try {
      await republishMutation.mutateAsync(item.id);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('common.operationFailed'));
    }
  };

  const handleUnpublish = (item: Recipe) => {
    Alert.alert(
      t('common.confirm'),
      t('myRecipes.unpublishConfirm', { title: i18n.language.startsWith('zh') ? item.title_zh : item.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('myRecipes.actions.unpublish'),
          onPress: async () => {
            try {
              await unpublishMutation.mutateAsync(item.id);
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.message || t('common.operationFailed'));
            }
          },
        },
      ],
    );
  };

  const renderActions = (item: Recipe) => {
    const canRepublish = !item.is_published;

    return (
      <View style={styles.actionsRow}>
        {/* 需求 3：所有菜谱（包括已发布）都可编辑 */}
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => handleContinueEdit(item)}
        >
          <Ionicons name="create-outline" size={16} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            {item.is_published ? t('myRecipes.actions.edit') : t('myRecipes.actions.continueEdit')}
          </Text>
        </TouchableOpacity>

        {canRepublish ? (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.tint, backgroundColor: `${colors.tint}14` }]}
            onPress={() => handleRepublish(item)}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={colors.tint} />
            <Text style={[styles.actionText, { color: colors.tint }]}>{t('myRecipes.actions.republish')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#f59e0b', backgroundColor: '#fff7ed' }]}
            onPress={() => handleUnpublish(item)}
          >
            <Ionicons name="eye-off-outline" size={16} color="#f59e0b" />
            <Text style={[styles.actionText, { color: '#b45309' }]}>{t('myRecipes.actions.unpublish')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
          <Text style={[styles.actionText, { color: '#dc2626' }]}>{t('myRecipes.actions.delete')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Recipe }) => {
    const statusLabel = item.is_published
      ? t('myRecipes.statusPublished')
      : t('myRecipes.statusDraft');
    const badgeColor = item.is_published ? '#16a34a' : '#f59e0b';

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <TouchableOpacity style={styles.cardMain} onPress={() => router.push(`/recipe/${item.id}`)}>
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
        {renderActions(item)}
      </View>
    );
  };

  const busy = deleteMutation.isPending || republishMutation.isPending || unpublishMutation.isPending;

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
        <EmptyState
          icon="document-text-outline"
          title={t('myRecipes.emptyTitle')}
          subtitle={t(`myRecipes.emptyByStatus.${status}`)}
          action={{
            label: t('myRecipes.createRecipe'),
            onPress: () => router.push('/recipe/create')
          }}
        />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            busy || query.isFetchingNextPage ? <ActivityIndicator color={colors.tint} style={{ marginVertical: 16 }} /> : null
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
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  cardMain: { flexDirection: 'row' },
  cover: { width: 110, height: 110, backgroundColor: '#eee' },
  content: { flex: 1, padding: 12, gap: 8 },
  headerRow: { gap: 8 },
  title: { fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  stat: { fontSize: 12 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, paddingTop: 0 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});