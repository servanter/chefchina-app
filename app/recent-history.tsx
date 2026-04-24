import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontScale } from '@/hooks/useFontScale';
import { fetchRecipeById, Recipe } from '@/lib/api';
import { clearViewHistory, getViewHistory, removeViewHistoryItem, ViewHistoryItem } from '@/lib/storage';

interface HistoryRecipe extends Recipe {
  viewed_at: string;
}

export default function RecentHistoryScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const [items, setItems] = useState<HistoryRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getViewHistory();
      const recipes = await Promise.all(
        history.map(async (item: ViewHistoryItem) => {
          try {
            const recipe = await fetchRecipeById(item.recipeId);
            return { ...recipe, viewed_at: item.viewedAt };
          } catch {
            return null;
          }
        }),
      );
      setItems(recipes.filter(Boolean) as HistoryRecipe[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (recipeId: string) => {
    await removeViewHistoryItem(recipeId);
    setItems((prev) => prev.filter((item) => item.id !== recipeId));
  };

  const handleClear = () => {
    Alert.alert(t('recentHistory.clearTitle'), t('recentHistory.clearConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('recentHistory.clearAction'),
        style: 'destructive',
        onPress: async () => {
          await clearViewHistory();
          setItems([]);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: HistoryRecipe }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <TouchableOpacity style={styles.cardMain} onPress={() => router.push(`/recipe/${item.id}`)}>
        <Image source={{ uri: item.cover_image }} style={styles.cover} />
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text, fontSize: scaled(16) }]} numberOfLines={2}>
            {i18n.language.startsWith('zh') ? item.title_zh : item.title}
          </Text>
          <Text style={[styles.desc, { color: colors.subText }]} numberOfLines={2}>
            {(i18n.language.startsWith('zh') ? item.description_zh : item.description) || t('recentHistory.noDescription')}
          </Text>
          <Text style={[styles.time, { color: colors.subText }]}>
            {t('recentHistory.viewedAt', { time: new Date(item.viewed_at).toLocaleString() })}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemove(item.id)}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const listEmpty = useMemo(() => !loading && items.length === 0, [loading, items.length]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.safeAreaBg }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(20) }]}>{t('recentHistory.title')}</Text>
        <TouchableOpacity onPress={handleClear} style={styles.headerBtn}>
          <Ionicons name="trash-bin-outline" size={20} color={items.length ? '#ef4444' : colors.subText} />
        </TouchableOpacity>
      </View>

      {listEmpty ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="time-outline" size={56} color={colors.subText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('recentHistory.emptyTitle')}</Text>
          <Text style={[styles.emptyDesc, { color: colors.subText }]}>{t('recentHistory.emptyDesc')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
  headerBtn: { width: 32, alignItems: 'center' },
  headerTitle: { fontWeight: '700' },
  listContent: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  cardMain: { flex: 1, flexDirection: 'row' },
  cover: { width: 96, height: 96, backgroundColor: '#eee' },
  body: { flex: 1, padding: 12, gap: 8 },
  title: { fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 18 },
  time: { fontSize: 12 },
  deleteBtn: { width: 48, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
