import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRandomRecipe, Recipe } from '../lib/api';
import { LazyImage } from './LazyImage';
import { useShakeDetection } from '../hooks/useShakeDetection';
import { triggerHaptic } from '../lib/haptics';
import { useTheme } from '../contexts/ThemeContext';

interface WhatToEatProps {
  tintColor?: string;
}

export const WhatToEatButton: React.FC<WhatToEatProps> = ({
  tintColor = '#E85D26',
}) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isZh = i18n.language === 'zh';
  const { colors } = useTheme();

  const [showResult, setShowResult] = useState(false);
  const [resultRecipe, setResultRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handleRollRef = useRef<(() => void) | undefined>(undefined);

  // Shake-to-discover (REQ-9)
  useShakeDetection(useCallback(() => {
    if (!loading && !showResult) {
      handleRollRef.current?.();
    }
  }, [loading, showResult]));

  const handleRoll = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    triggerHaptic('medium');

    try {
      const recipe = await fetchRandomRecipe();
      if (recipe) {
        // Card flip animation
        flipAnim.setValue(0);
        setResultRecipe(recipe);

        Animated.sequence([
          // Flip out
          Animated.timing(flipAnim, {
            toValue: 0.5,
            duration: 200,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          // Flip in with result
          Animated.timing(flipAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowResult(true);
          triggerHaptic('success');
        });
      }
    } catch {
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  }, [loading, flipAnim]);

  handleRollRef.current = handleRoll;

  const handleGoToRecipe = useCallback(() => {
    if (resultRecipe) {
      router.push(`/recipe/${resultRecipe.id}`);
    }
  }, [resultRecipe, router]);

  const handleReset = useCallback(() => {
    setShowResult(false);
    setResultRecipe(null);
    flipAnim.setValue(0);
  }, [flipAnim]);

  const rotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  });

  const cardScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.9, 1],
  });

  if (showResult && resultRecipe) {
    const title = isZh ? resultRecipe.title_zh : resultRecipe.title;
    return (
      <Animated.View
        style={[
          styles.resultCard,
          {
            backgroundColor: colors.card,
            transform: [
              { perspective: 800 },
              { rotateY },
              { scale: cardScale },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.resultTouchable}
          onPress={handleGoToRecipe}
          activeOpacity={0.9}
        >
          <LazyImage uri={resultRecipe.cover_image} style={styles.resultImage} />
          <View style={styles.resultOverlay}>
            <Text style={styles.resultEmoji}>🍳</Text>
            <Text style={styles.resultTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.resultMeta}>
              <Text style={styles.resultMetaText}>
                {resultRecipe.difficulty
                  ? t(`recipe.${resultRecipe.difficulty}`)
                  : ''}
              </Text>
              {resultRecipe.cook_time > 0 && (
                <Text style={styles.resultMetaText}>
                  {resultRecipe.cook_time} {t('recipe.mins')}
                </Text>
              )}
            </View>
            <Text style={styles.tapHint}>
              {isZh ? '点击查看详情 →' : 'Tap for details →'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retryBtn} onPress={handleReset}>
          <Ionicons name="refresh" size={16} color={tintColor} />
          <Text style={[styles.retryText, { color: tintColor }]}>
            {isZh ? '再来一次' : 'Try again'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.buttonCard,
        {
          transform: [
            { perspective: 800 },
            { rotateY },
            { scale: cardScale },
          ],
        },
      ]}
    >
      <TouchableOpacity style={[styles.rollButton, { borderColor: tintColor, backgroundColor: colors.card }]}
        onPress={handleRoll}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={styles.diceEmoji}>🎲</Text>
        <View>
          <Text style={[styles.rollTitle, { color: tintColor }]}>
            {isZh ? '今天吃什么？' : "What's for dinner?"}
          </Text>
          <Text style={[styles.rollSubtitle, { color: colors.subText }]}>
            {loading
              ? (isZh ? '正在选择...' : 'Picking...')
              : (isZh ? '摇一摇或点击试试手气' : 'Shake or tap to try your luck')
            }
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={tintColor} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonCard: {
    marginHorizontal: 20,
    marginVertical: 8,
  },
  rollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  diceEmoji: {
    fontSize: 28,
  },
  rollTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  rollSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  resultCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  resultTouchable: {
    height: 160,
    position: 'relative',
  },
  resultImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  resultEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  resultMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  resultMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
