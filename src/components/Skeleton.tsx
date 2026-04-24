import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const BASE_COLOR = '#E8E4DF';
const HIGHLIGHT_COLOR = '#F5F2EE';

/**
 * 基于 react-native-reanimated 的 shimmer 骨架占位块。
 *
 * 实现细节：
 *  - 一个 -1 → 1 循环的 `shared value`（progress）
 *  - 叠一层渐变高光（用纯色 + opacity 过渡近似，零额外依赖）
 *  - 高光条在容器内从左到右滑动
 *
 * 之前基于 `Animated API` 的实现改为 reanimated，保留原有导出名字 `SkeletonBlock`
 * 以兼容 `RecipeCardSkeleton` / `CommentSkeleton` / `RecipeDetailSkeleton` 等老组件。
 */
export const SkeletonBlock: React.FC<{
  style?: StyleProp<ViewStyle>;
  testID?: string;
}> = ({ style, testID }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  // 高光条：半宽的 View，translateX 从 -width → +width
  const { width: SCREEN_W } = useWindowDimensions();
  const highlightStyle = useAnimatedStyle(() => {
    const tx = interpolate(progress.value, [0, 1], [-SCREEN_W, SCREEN_W]);
    const op = interpolate(progress.value, [0, 0.5, 1], [0.3, 0.9, 0.3]);
    return {
      transform: [{ translateX: tx }],
      opacity: op,
    };
  });

  return (
    <View style={[styles.baseWrap, style]} testID={testID}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: HIGHLIGHT_COLOR },
          highlightStyle,
        ]}
      />
    </View>
  );
};

// ─── 请求 12 中要求的命名（SkeletonCard / SkeletonList / SkeletonDetail）──────

/**
 * mimic RecipeCard grid 单卡
 */
export const SkeletonCard: React.FC<{ width?: number }> = ({ width }) => (
  <View style={[styles.recipeCardWrap, width ? { width } : undefined]}>
    <SkeletonBlock style={styles.recipeCardImage} />
    <View style={styles.recipeCardBody}>
      <SkeletonBlock style={styles.lineLong} />
      <SkeletonBlock style={styles.lineShort} />
      <SkeletonBlock style={styles.badge} />
    </View>
  </View>
);

/**
 * 2 列骨架列表（默认 6 张）。
 */
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 6 }) => {
  const rows = Math.ceil(count / 2);
  return (
    <View style={styles.skeletonListWrap}>
      {Array.from({ length: rows }).map((_, r) => {
        const startIdx = r * 2;
        return (
          <View key={r} style={styles.skeletonListRow}>
            {startIdx < count && <SkeletonCard />}
            {startIdx + 1 < count && <SkeletonCard />}
          </View>
        );
      })}
    </View>
  );
};

/**
 * 详情页骨架：大图 + 标题 + 三行摘要
 */
export const SkeletonDetail: React.FC = () => (
  <View style={styles.detailWrap}>
    <SkeletonBlock style={styles.detailHero} />
    <View style={styles.detailBody}>
      <SkeletonBlock style={styles.detailTitle} />
      <SkeletonBlock style={styles.detailLine} />
      <SkeletonBlock style={styles.detailLine} />
      <SkeletonBlock style={[styles.detailLine, { width: '65%' }]} />
    </View>
  </View>
);

// ─── 向后兼容的旧导出名（保留给现有 import 不破坏）────────────────────────────

/** @deprecated 使用 SkeletonCard 代替 */
export const RecipeCardSkeleton = SkeletonCard;

/** 评论骨架（保留原有布局） */
export const CommentSkeleton: React.FC = () => (
  <View style={styles.commentWrap}>
    <SkeletonBlock style={styles.commentAvatar} />
    <View style={styles.commentBody}>
      <SkeletonBlock style={styles.commentName} />
      <SkeletonBlock style={styles.commentLine} />
      <SkeletonBlock style={[styles.commentLine, { width: '70%' }]} />
    </View>
  </View>
);

/** @deprecated 使用 SkeletonDetail 代替 */
export const RecipeDetailSkeleton = SkeletonDetail;

const styles = StyleSheet.create({
  baseWrap: {
    backgroundColor: BASE_COLOR,
    borderRadius: 6,
    overflow: 'hidden',
  },
  recipeCardWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    flex: 1,
  },
  recipeCardImage: {
    width: '100%',
    height: 120,
    borderRadius: 0,
  },
  recipeCardBody: {
    padding: 10,
    gap: 6,
  },
  lineLong: {
    height: 12,
    width: '90%',
    borderRadius: 4,
  },
  lineShort: {
    height: 10,
    width: '55%',
    borderRadius: 4,
  },
  badge: {
    height: 18,
    width: 46,
    borderRadius: 9,
    marginTop: 4,
  },
  commentWrap: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentBody: {
    flex: 1,
    gap: 6,
  },
  commentName: {
    height: 12,
    width: '30%',
    borderRadius: 4,
  },
  commentLine: {
    height: 10,
    width: '95%',
    borderRadius: 4,
  },
  detailWrap: {
    flex: 1,
    backgroundColor: '#FFFDF9',
  },
  detailHero: {
    width: '100%',
    height: 280,
    borderRadius: 0,
  },
  detailBody: {
    padding: 20,
    gap: 10,
  },
  detailTitle: {
    height: 22,
    width: '70%',
    borderRadius: 6,
    marginBottom: 6,
  },
  detailLine: {
    height: 12,
    width: '95%',
    borderRadius: 4,
  },
  skeletonListWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
  },
  skeletonListRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
