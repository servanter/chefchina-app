import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';

export type RecipeSkeletonVariant = 'featured' | 'list' | 'grid';

interface RecipeSkeletonProps {
  variant?: RecipeSkeletonVariant;
  style?: StyleProp<ViewStyle>;
}

const BLOCK = '#E8E4DF';

function SkeletonBlock({ style, opacity }: { style?: StyleProp<ViewStyle>; opacity: Animated.Value }) {
  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

export function RecipeSkeleton({ variant = 'grid', style }: RecipeSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (variant === 'featured') {
    return (
      <View style={[styles.featuredCard, style]}>
        <SkeletonBlock opacity={opacity} style={styles.featuredImage} />
        <View style={styles.featuredBody}>
          <SkeletonBlock opacity={opacity} style={styles.titleWide} />
          <SkeletonBlock opacity={opacity} style={styles.textMedium} />
          <SkeletonBlock opacity={opacity} style={styles.metaRow} />
        </View>
      </View>
    );
  }

  if (variant === 'list') {
    return (
      <View style={[styles.listCard, style]}>
        <SkeletonBlock opacity={opacity} style={styles.listImage} />
        <View style={styles.listBody}>
          <SkeletonBlock opacity={opacity} style={styles.titleWide} />
          <SkeletonBlock opacity={opacity} style={styles.textMedium} />
          <SkeletonBlock opacity={opacity} style={styles.textShort} />
          <SkeletonBlock opacity={opacity} style={styles.metaShort} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.gridCard, style]}>
      <SkeletonBlock opacity={opacity} style={styles.gridImage} />
      <View style={styles.gridBody}>
        <SkeletonBlock opacity={opacity} style={styles.titleWide} />
        <SkeletonBlock opacity={opacity} style={styles.textShort} />
        <SkeletonBlock opacity={opacity} style={styles.metaShort} />
      </View>
    </View>
  );
}

export function RecipeSkeletonList({
  count = 3,
  variant = 'list',
}: {
  count?: number;
  variant?: RecipeSkeletonVariant;
}) {
  return (
    <View style={styles.listWrap}>
      {Array.from({ length: count }).map((_, index) => (
        <RecipeSkeleton key={`${variant}-${index}`} variant={variant} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    gap: 12,
  },
  block: {
    backgroundColor: BLOCK,
    borderRadius: 10,
  },
  featuredCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  featuredImage: {
    width: '100%',
    height: 176,
    borderRadius: 0,
  },
  featuredBody: {
    padding: 14,
    gap: 10,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  listImage: {
    width: 112,
    height: 84,
    borderRadius: 12,
  },
  listBody: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: 0,
  },
  gridBody: {
    padding: 12,
    gap: 8,
  },
  titleWide: {
    height: 16,
    width: '85%',
  },
  textMedium: {
    height: 12,
    width: '65%',
  },
  textShort: {
    height: 12,
    width: '48%',
  },
  metaRow: {
    height: 12,
    width: '42%',
    marginTop: 2,
  },
  metaShort: {
    height: 10,
    width: '36%',
    marginTop: 2,
  },
});

export default RecipeSkeleton;
