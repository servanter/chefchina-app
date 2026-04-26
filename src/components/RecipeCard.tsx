import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Recipe } from '../lib/api';
import { LazyImage } from './LazyImage';
import { useTheme } from '../contexts/ThemeContext';
import { useFontScale } from '../hooks/useFontScale';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  variant?: 'featured' | 'grid' | 'list';
}

const DifficultyBadge = ({ difficulty }: { difficulty: Recipe['difficulty'] }) => {
  const { t } = useTranslation();
  const { scaled } = useFontScale();
  // 需求 15：difficulty 可能为 null（未指定）→ RecipeCard 中兜底为 easy，
  // 保持列表视觉一致。详情页会用 null 判断是否隐藏 meta icon。
  const d = difficulty ?? 'easy';
  const colors: Record<string, string> = {
    easy: '#4CAF50',
    medium: '#FF9800',
    hard: '#F44336',
  };
  return (
    <View style={[styles.badge, { backgroundColor: colors[d] + '20' }]}>
      <Text style={[styles.badgeText, { color: colors[d], fontSize: scaled(11) }]}>
        {t(`recipe.${d}`)}
      </Text>
    </View>
  );
};

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  variant = 'grid',
}) => {
  const { i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  // Cap at 390 (iPhone 14 width) so web doesn't stretch cards
  const effectiveWidth = Math.min(width, 390);
  const isZh = i18n.language === 'zh';
  const title = isZh ? recipe.title_zh : recipe.title;

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        style={[styles.featuredCard, { width: effectiveWidth * 0.72 }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LazyImage uri={recipe.cover_image} style={styles.featuredImage} />
        <View style={styles.featuredOverlay} />
        <View style={styles.featuredContent}>
          <DifficultyBadge difficulty={recipe.difficulty} />
          <Text style={[styles.featuredTitle, { fontSize: scaled(17), lineHeight: scaled(22) }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.featuredMeta}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.9)" />
            <Text style={[styles.featuredMetaText, { fontSize: scaled(12) }]}>
              {recipe.cook_time + recipe.prep_time} min
            </Text>
            <Ionicons name="heart" size={13} color="rgba(255,255,255,0.9)" style={{ marginLeft: 10 }} />
            <Text style={[styles.featuredMetaText, { fontSize: scaled(12) }]}>{recipe.likes_count}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'list') {
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: colors.card }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LazyImage uri={recipe.cover_image} style={styles.listImage} />
        <View style={styles.listContent}>
          <Text style={[styles.listTitle, { color: colors.text, fontSize: scaled(15), lineHeight: scaled(20) }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.listMeta}>
            <DifficultyBadge difficulty={recipe.difficulty} />
            <View style={styles.listTimeRow}>
              <Ionicons name="time-outline" size={12} color={colors.subText} />
              <Text style={[styles.listMetaText, { color: colors.subText, fontSize: scaled(12) }]}>
                {' '}{recipe.cook_time + recipe.prep_time} min
              </Text>
            </View>
          </View>
          <View style={styles.listStats}>
            <Ionicons name="heart" size={13} color={colors.tint} />
            <Text style={[styles.listStatsText, { color: colors.subText, fontSize: scaled(12) }]}>{recipe.likes_count}</Text>
            <Ionicons name="chatbubble-outline" size={13} color={colors.subText} style={{ marginLeft: 8 }} />
            <Text style={[styles.listStatsText, { color: colors.subText, fontSize: scaled(12) }]}>{recipe.comments_count}</Text>
            <Ionicons name="star" size={13} color="#FFB800" style={{ marginLeft: 8 }} />
            <Text style={[styles.listStatsText, { color: colors.subText, fontSize: scaled(12) }]}>{recipe.avg_rating.toFixed(1)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid variant (default)
  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: (effectiveWidth - 48) / 2, backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LazyImage uri={recipe.cover_image} style={styles.gridImage} />
      <View style={styles.gridContent}>
        <Text style={[styles.gridTitle, { color: colors.text, fontSize: scaled(13), lineHeight: scaled(18) }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.gridMeta}>
          <Ionicons name="time-outline" size={12} color={colors.subText} />
          <Text style={[styles.gridMetaText, { color: colors.subText, fontSize: scaled(11) }]}>
            {recipe.cook_time + recipe.prep_time} min
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#FFB800" />
            <Text style={[styles.gridMetaText, { color: colors.subText, fontSize: scaled(11) }]}>
              {recipe.avg_rating.toFixed(1)}
            </Text>
          </View>
        </View>
        <DifficultyBadge difficulty={recipe.difficulty} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Featured
  featuredCard: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  featuredTitle: {
    color: '#FFF',
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 6,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredMetaText: {
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 3,
  },

  // Grid
  gridCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  gridImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  gridContent: {
    padding: 10,
  },
  gridTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  gridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  gridMetaText: {
    marginLeft: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },

  // List
  listCard: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  listImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  listContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  listTitle: {
    fontWeight: '600',
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listMetaText: {},
  listStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listStatsText: {
    marginLeft: 3,
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
  },
});
