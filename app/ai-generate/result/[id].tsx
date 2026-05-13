// app/ai-generate/result/[id].tsx
// AI 生成菜谱 - 结果展示页

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { apiClient as api } from '@/lib/api';

interface GeneratedRecipe {
  id: string;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  ingredients: Array<{
    nameZh: string;
    nameEn: string;
    amount: string;
    unit: string;
    isOptional?: boolean;
  }>;
  steps: Array<{
    stepNumber: number;
    contentZh: string;
    contentEn: string;
    durationMin?: number;
  }>;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber?: number;
    sodium?: number;
    sugar?: number;
  };
  difficulty: string;
  cookTime: number;
  servings: number;
  isPublished: boolean;
  recipeId?: string;
  isExpired: boolean;
}

export default function AIGenerateResultScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const styles = getStyles(colors);

  const isZh = i18n.language === 'zh';

  useEffect(() => {
    loadRecipe();
  }, [params.id]);

  const loadRecipe = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/ai/generated-recipes/${params.id}`);
      if (response.data.success) {
        setRecipe(response.data.data);
      }
    } catch (error) {
      console.error('[AI Result] Load error:', error);
      Toast.show({
        type: 'error',
        text1: t('aiGenerate.errors.loadFailed'),
      });
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!recipe) return;

    if (recipe.isExpired) {
      Toast.show({
        type: 'error',
        text1: t('aiGenerate.errors.expired'),
        text2: t('aiGenerate.errors.expiredHint'),
      });
      return;
    }

    setIsPublishing(true);
    try {
      const response = await api.post(`/ai/generated-recipes/${recipe.id}/publish`, {});
      if (response.data.success) {
        Toast.show({
          type: 'success',
          text1: t('aiGenerate.result.publishSuccess'),
        });
        // 跳转到正式菜谱页面
        router.replace(`/recipe/${response.data.data.recipeId}`);
      }
    } catch (error: any) {
      console.error('[AI Publish] Error:', error);
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.error || t('aiGenerate.errors.publishFailed'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEdit = () => {
    router.push(`/ai-generate/edit/${params.id}`);
  };

  const handleRegenerate = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return null;
  }

  const difficultyMap: Record<string, string> = {
    EASY: t('aiGenerate.form.difficultyOptions.easy'),
    MEDIUM: t('aiGenerate.form.difficultyOptions.medium'),
    HARD: t('aiGenerate.form.difficultyOptions.hard'),
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('aiGenerate.result.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 已过期提示 */}
        {recipe.isExpired && (
          <View style={styles.expiredBanner}>
            <Ionicons name="warning-outline" size={20} color="#ff6b6b" />
            <Text style={styles.expiredText}>{t('aiGenerate.result.expiredBanner')}</Text>
          </View>
        )}

        {/* 已发布提示 */}
        {recipe.isPublished && (
          <View style={styles.publishedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#51cf66" />
            <Text style={styles.publishedText}>
              {t('aiGenerate.result.publishedBanner')}
              {recipe.recipeId && (
                <Text
                  style={styles.publishedLink}
                  onPress={() => router.push(`/recipe/${recipe.recipeId}`)}
                >
                  {' '}
                  {t('aiGenerate.result.viewPublished')}
                </Text>
              )}
            </Text>
          </View>
        )}

        {/* 菜谱卡片 */}
        <View style={styles.recipeCard}>
          {/* 占位图 */}
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant-outline" size={48} color={colors.subText} />
          </View>

          <View style={styles.recipeHeader}>
            <Text style={styles.recipeTitle}>{isZh ? recipe.titleZh : recipe.titleEn}</Text>
            <Text style={styles.recipeDescription}>
              {isZh ? recipe.descriptionZh : recipe.descriptionEn}
            </Text>
          </View>

          {/* 元信息 */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="speedometer-outline" size={16} color={colors.subText} />
              <Text style={styles.metaText}>{difficultyMap[recipe.difficulty]}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.subText} />
              <Text style={styles.metaText}>
                {recipe.cookTime} {t('aiGenerate.result.minutes')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={colors.subText} />
              <Text style={styles.metaText}>
                {recipe.servings} {t('aiGenerate.result.servings')}
              </Text>
            </View>
          </View>
        </View>

        {/* 食材列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="list-outline" size={20} color={colors.text} />{' '}
            {t('aiGenerate.result.ingredientsTitle')}
          </Text>
          {recipe.ingredients.map((ing, index) => (
            <View key={index} style={styles.ingredientItem}>
              <View style={styles.ingredientBullet} />
              <Text style={styles.ingredientText}>
                {isZh ? ing.nameZh : ing.nameEn} {ing.amount}
                {ing.unit}
                {ing.isOptional && (
                  <Text style={styles.optionalText}> {t('aiGenerate.result.optional')}</Text>
                )}
              </Text>
            </View>
          ))}
        </View>

        {/* 步骤列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="clipboard-outline" size={20} color={colors.text} />{' '}
            {t('aiGenerate.result.stepsTitle')}
          </Text>
          {recipe.steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>
                  {isZh ? step.contentZh : step.contentEn}
                </Text>
                {step.durationMin && (
                  <Text style={styles.stepDuration}>
                    ⏱ {step.durationMin} {t('aiGenerate.result.minutes')}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 营养信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="fitness-outline" size={20} color={colors.text} />{' '}
            {t('aiGenerate.result.nutritionTitle')}
          </Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recipe.nutrition.calories}</Text>
              <Text style={styles.nutritionLabel}>{t('aiGenerate.result.nutrition.calories')}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recipe.nutrition.protein}g</Text>
              <Text style={styles.nutritionLabel}>{t('aiGenerate.result.nutrition.protein')}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recipe.nutrition.fat}g</Text>
              <Text style={styles.nutritionLabel}>{t('aiGenerate.result.nutrition.fat')}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recipe.nutrition.carbs}g</Text>
              <Text style={styles.nutritionLabel}>{t('aiGenerate.result.nutrition.carbs')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 底部操作栏 - ✅ 修复 z-index */}
      {!recipe.isPublished && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleEdit} style={styles.footerButtonSecondary}>
            <Ionicons name="create-outline" size={20} color={colors.tint} />
            <Text style={styles.footerButtonSecondaryText}>{t('aiGenerate.buttons.edit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePublish}
            style={[
              styles.footerButtonPrimary,
              (isPublishing || recipe.isExpired) && styles.footerButtonDisabled,
            ]}
            disabled={isPublishing || recipe.isExpired}
          >
            {isPublishing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.footerButtonPrimaryText}>{t('aiGenerate.buttons.publish')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRegenerate} style={styles.footerButtonSecondary}>
            <Ionicons name="refresh-outline" size={20} color={colors.tint} />
            <Text style={styles.footerButtonSecondaryText}>{t('aiGenerate.buttons.regenerate')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: colors.subText,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 100,
    },
    expiredBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffe0e0',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 8,
    },
    expiredText: {
      fontSize: 14,
      color: '#ff6b6b',
      fontWeight: '500',
    },
    publishedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#d3f9d8',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 8,
    },
    publishedText: {
      fontSize: 14,
      color: '#2f9e44',
      fontWeight: '500',
    },
    publishedLink: {
      color: '#1971c2',
      textDecorationLine: 'underline',
    },
    recipeCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    imagePlaceholder: {
      width: '100%',
      height: 200,
      backgroundColor: colors.inputBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recipeHeader: {
      padding: 16,
    },
    recipeTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    recipeDescription: {
      fontSize: 14,
      color: colors.subText,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 16,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 13,
      color: colors.subText,
    },
    section: {
      marginHorizontal: 16,
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    ingredientItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 12,
    },
    ingredientBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.tint,
    },
    ingredientText: {
      fontSize: 15,
      color: colors.text,
    },
    optionalText: {
      fontSize: 13,
      color: colors.subText,
      fontStyle: 'italic',
    },
    stepItem: {
      flexDirection: 'row',
      marginBottom: 20,
      gap: 12,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.tint,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepNumberText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    stepContent: {
      flex: 1,
    },
    stepText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    stepDuration: {
      fontSize: 13,
      color: colors.subText,
      marginTop: 4,
    },
    nutritionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    nutritionItem: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    nutritionValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.tint,
      marginBottom: 4,
    },
    nutritionLabel: {
      fontSize: 13,
      color: colors.subText,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      backgroundColor: colors.card, // ✅ 修复：使用 card 而不是 cardBg
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
      zIndex: 100, // 确保在最上层
      elevation: 8, // Android 阴影
      shadowColor: '#000', // iOS 阴影
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    footerButtonSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.tint,
      gap: 6,
      backgroundColor: colors.card, // ✅ 修复：使用 card 确保按钮完全不透明
    },
    footerButtonSecondaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.tint,
    },
    footerButtonPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.tint,
      gap: 6,
    },
    footerButtonPrimaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    footerButtonDisabled: {
      opacity: 0.5,
    },
  });
}
