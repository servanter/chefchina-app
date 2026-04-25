import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchRankingRecipes, RankedRecipe } from '../src/lib/api';
import { LazyImage } from '../src/components/LazyImage';
import { useTheme } from '../src/contexts/ThemeContext';

const RANK_BADGES = ['🥇', '🥈', '🥉'];

export default function RankingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isZh = i18n.language === 'zh';
  const { colors } = useTheme();

  const { data: ranking = [], isLoading } = useQuery<RankedRecipe[]>({
    queryKey: ['ranking', 'week'],
    queryFn: () => fetchRankingRecipes('week'),
    staleTime: 1000 * 60 * 15,
  });

  const renderItem = ({ item, index }: { item: RankedRecipe; index: number }) => {
    const title = isZh ? item.title_zh : item.title;
    const badge = index < 3 ? RANK_BADGES[index] : `${index + 1}`;
    const isTop3 = index < 3;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/recipe/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={[styles.rankCol, { backgroundColor: colors.inputBg }, isTop3 && { backgroundColor: colors.card }]}>
          <Text style={[styles.rankText, isTop3 && styles.rankTextTop3]}>
            {badge}
          </Text>
        </View>
        <LazyImage uri={item.cover_image} style={styles.image} />
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="heart" size={12} color="#E85D26" />
              <Text style={styles.metaText}>{item.likes_count}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="bookmark" size={12} color="#E85D26" />
              <Text style={styles.metaText}>{item.favorites_count}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="chatbubble" size={12} color="#E85D26" />
              <Text style={styles.metaText}>{item.comments_count}</Text>
            </View>
          </View>
          <Text style={[styles.scoreText, { color: colors.subText }]}>
            {isZh ? '热度' : 'Score'}: {item.score}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('ranking.title')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
      <FlatList
        data={ranking}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, ranking.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="trophy-outline" size={48} color={colors.subText} />
            <Text style={{ marginTop: 12, fontSize: 14, color: colors.subText }}>
              {isZh ? '暂无排行数据' : 'No ranking data yet'}
            </Text>
          </View>
        }
      />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  rankCol: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F2EE',
  },
  rankColTop3: {
    backgroundColor: '#FFF3EC',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  rankTextTop3: {
    fontSize: 22,
  },
  image: {
    width: 80,
    height: 80,
  },
  info: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  scoreText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
