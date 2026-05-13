// app/ai-generate/index.tsx
// AI 菜谱生成器 - 输入表单页

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { apiClient as api } from '@/lib/api';
import { useAuth } from '../../src/hooks/useAuth';
import { useSubscriptionStatus } from '../../src/hooks/useSubscription';

const MAX_INGREDIENTS = 10;

export default function AIGenerateScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data: subscriptionStatus } = useSubscriptionStatus(user?.id);

  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [style, setStyle] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [cookTime, setCookTime] = useState<number>(30);
  const [servings, setServings] = useState<number>(2);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{ used: number; limit: number } | null>(null);

  const styles = getStyles(colors);

  // 菜系选项
  const styleOptions = [
    { key: 'sichuan', label: t('aiGenerate.form.styleOptions.sichuan') },
    { key: 'cantonese', label: t('aiGenerate.form.styleOptions.cantonese') },
    { key: 'japanese', label: t('aiGenerate.form.styleOptions.japanese') },
    { key: 'western', label: t('aiGenerate.form.styleOptions.western') },
    { key: 'fusion', label: t('aiGenerate.form.styleOptions.fusion') },
    { key: 'any', label: t('aiGenerate.form.styleOptions.any') },
  ];
  const difficultyOptions = [
    { key: 'EASY', label: t('aiGenerate.form.difficultyOptions.easy') },
    { key: 'MEDIUM', label: t('aiGenerate.form.difficultyOptions.medium') },
    { key: 'HARD', label: t('aiGenerate.form.difficultyOptions.hard') },
  ];
  const restrictionOptions = [
    { key: 'lowSodium', label: t('aiGenerate.form.restrictionOptions.lowSodium') },
    { key: 'sugarFree', label: t('aiGenerate.form.restrictionOptions.sugarFree') },
    { key: 'vegetarian', label: t('aiGenerate.form.restrictionOptions.vegetarian') },
    { key: 'lowFat', label: t('aiGenerate.form.restrictionOptions.lowFat') },
  ];

  // 获取配额信息（TODO: 需要后端 API）
  useEffect(() => {
    // 暂时硬编码，后续可以从 /api/ai/quota 获取
    setQuotaInfo({ used: 2, limit: 5 });
  }, []);

  const addIngredient = () => {
    if (ingredients.length < MAX_INGREDIENTS) {
      setIngredients([...ingredients, '']);
    }
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, value: string) => {
    const updated = [...ingredients];
    updated[index] = value;
    setIngredients(updated);
  };

  const toggleRestriction = (restriction: string) => {
    if (dietaryRestrictions.includes(restriction)) {
      setDietaryRestrictions(dietaryRestrictions.filter((r) => r !== restriction));
    } else {
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    }
  };

  const handleGenerate = async () => {
    // 验证
    const validIngredients = ingredients.filter((i) => i.trim().length > 0);
    if (validIngredients.length === 0) {
      Toast.show({
        type: 'error',
        text1: t('aiGenerate.errors.noIngredients'),
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/ai/generate-recipe', {
        ingredients: validIngredients,
        style: style || undefined,
        difficulty: difficulty || undefined,
        cookTime: cookTime > 0 ? cookTime : undefined,
        servings,
        dietaryRestrictions: dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,
        language: i18n.language === 'zh' ? 'zh' : 'en',
      });

      if (response.data.success) {
        Toast.show({
          type: 'success',
          text1: t('aiGenerate.result.publishSuccess'),
        });
        router.push(`/ai-generate/result/${response.data.data.generatedId}`);
      }
    } catch (error: any) {
      console.error('[AI Generate] Error:', error);
      const message = error?.response?.data?.error || t('aiGenerate.errors.generateFailed');
      
      if (error?.response?.data?.code === 'QUOTA_EXCEEDED') {
        Toast.show({
          type: 'error',
          text1: t('aiGenerate.errors.quotaExceeded'),
          text2: t('aiGenerate.errors.quotaExceededHint'),
        });
        // 可以引导到订阅页
        // router.push('/pricing');
      } else {
        Toast.show({
          type: 'error',
          text1: message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            // ✅ FIX: 检查是否可以返回，如果不能则跳转到首页
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('aiGenerate.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {quotaInfo && (
        <View style={styles.quotaBanner}>
          <Ionicons name="flash" size={18} color={colors.tint} />
          {subscriptionStatus?.isPremium ? (
            <Text style={styles.quotaText}>
              {t('aiGenerate.quota.premiumUnlimited')}
            </Text>
          ) : (
            <>
              <Text style={styles.quotaText}>
                {t('aiGenerate.quota.remaining', {
                  remaining: quotaInfo.limit - quotaInfo.used,
                  total: quotaInfo.limit,
                })}
              </Text>
              <TouchableOpacity onPress={() => router.push('/pricing')}>
                <Text style={styles.upgradeLink}>{t('aiGenerate.quota.upgradeLink')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 食材输入 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('aiGenerate.form.ingredientsTitle')}</Text>
          {ingredients.map((ing, index) => (
            <View key={index} style={styles.ingredientRow}>
              <TextInput
                style={styles.ingredientInput}
                placeholder={t('aiGenerate.form.ingredientPlaceholder', { number: index + 1 })}
                placeholderTextColor={colors.subText}
                value={ing}
                onChangeText={(text) => updateIngredient(index, text)}
              />
              {ingredients.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeIngredient(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={24} color={colors.tint} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {ingredients.length < MAX_INGREDIENTS && (
            <TouchableOpacity onPress={addIngredient} style={styles.addButton}>
              <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
              <Text style={styles.addButtonText}>{t('aiGenerate.form.addIngredient')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 菜系风格 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('aiGenerate.form.styleTitle')}</Text>
          <View style={styles.chipContainer}>
            {styleOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => setStyle(option.key === 'any' ? '' : option.key)}
                style={[
                  styles.chip,
                  (style === option.key || (option.key === 'any' && !style)) && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    (style === option.key || (option.key === 'any' && !style)) && styles.chipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 难度 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('aiGenerate.form.difficultyTitle')}</Text>
          <View style={styles.chipContainer}>
            {difficultyOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => setDifficulty(option.key)}
                style={[styles.chip, difficulty === option.key && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    difficulty === option.key && styles.chipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 烹饪时间 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('aiGenerate.form.cookTimeTitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('aiGenerate.form.cookTimePlaceholder')}
            placeholderTextColor={colors.subText}
            keyboardType="number-pad"
            value={cookTime > 0 ? String(cookTime) : ''}
            onChangeText={(text) => setCookTime(parseInt(text) || 0)}
          />
        </View>

        {/* 人份 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('aiGenerate.form.servingsTitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('aiGenerate.form.servingsPlaceholder')}
            placeholderTextColor={colors.subText}
            keyboardType="number-pad"
            value={String(servings)}
            onChangeText={(text) => setServings(parseInt(text) || 2)}
          />
        </View>

        {/* 饮食限制 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('aiGenerate.form.restrictionsTitle')}</Text>
          <View style={styles.chipContainer}>
            {restrictionOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => toggleRestriction(option.key)}
                style={[
                  styles.chip,
                  dietaryRestrictions.includes(option.key) && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    dietaryRestrictions.includes(option.key) && styles.chipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 生成按钮 */}
        <TouchableOpacity
          onPress={handleGenerate}
          style={[styles.generateButton, isLoading && styles.generateButtonDisabled]}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateButtonText}>{t('aiGenerate.buttons.generating')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateButtonText}>{t('aiGenerate.buttons.generate')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 历史记录入口 */}
        <TouchableOpacity
          onPress={() => router.push('/ai-generate/history')}
          style={styles.historyButton}
        >
          <Ionicons name="time-outline" size={20} color={colors.tint} />
          <Text style={styles.historyButtonText}>{t('aiGenerate.buttons.history')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
    quotaBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    quotaText: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    upgradeLink: {
      fontSize: 14,
      color: colors.tint,
      fontWeight: '600',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 32,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    ingredientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    ingredientInput: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    removeButton: {
      padding: 4,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    addButtonText: {
      fontSize: 14,
      color: colors.tint,
      fontWeight: '500',
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    chipActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    chipText: {
      fontSize: 14,
      color: colors.text,
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '500',
    },
    generateButton: {
      backgroundColor: colors.tint,
      borderRadius: 12,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    generateButtonDisabled: {
      opacity: 0.7,
    },
    generateButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    historyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      marginTop: 16,
    },
    historyButtonText: {
      fontSize: 14,
      color: colors.tint,
      fontWeight: '500',
    },
  });
}
