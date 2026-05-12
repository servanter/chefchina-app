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
import { useTheme } from '../../src/contexts/ThemeContext';
import { apiClient as api } from '@/lib/api';

const MAX_INGREDIENTS = 10;

export default function AIGenerateScreen() {
  const { colors } = useTheme();
  const router = useRouter();

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
  const styleOptions = ['川菜', '粤菜', '日式', '西式', 'Fusion', '不限'];
  const difficultyOptions = [
    { key: 'EASY', label: '简单' },
    { key: 'MEDIUM', label: '中等' },
    { key: 'HARD', label: '困难' },
  ];
  const restrictionOptions = ['低钠', '无糖', '素食', '低脂'];

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
        text1: '至少需要 1 个食材',
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
      });

      if (response.data.success) {
        Toast.show({
          type: 'success',
          text1: '菜谱生成成功！',
        });
        router.push(`/ai-generate/result/${response.data.data.generatedId}`);
      }
    } catch (error: any) {
      console.error('[AI Generate] Error:', error);
      const message = error?.response?.data?.error || '生成失败，请重试';
      
      if (error?.response?.data?.code === 'QUOTA_EXCEEDED') {
        Toast.show({
          type: 'error',
          text1: '配额已用尽',
          text2: '升级 Premium 获得更多次数',
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
        <Text style={styles.title}>AI 菜谱生成器</Text>
        <View style={{ width: 24 }} />
      </View>

      {quotaInfo && (
        <View style={styles.quotaBanner}>
          <Ionicons name="flash" size={18} color={colors.tint} />
          <Text style={styles.quotaText}>
            本月剩余 {quotaInfo.limit - quotaInfo.used} 次（共 {quotaInfo.limit} 次）
          </Text>
          {quotaInfo.limit === 5 && (
            <TouchableOpacity onPress={() => router.push('/pricing')}>
              <Text style={styles.upgradeLink}>升级 Premium</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 食材输入 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>食材（必填）</Text>
          {ingredients.map((ing, index) => (
            <View key={index} style={styles.ingredientRow}>
              <TextInput
                style={styles.ingredientInput}
                placeholder={`食材 ${index + 1}`}
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
              <Text style={styles.addButtonText}>添加食材</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 菜系风格 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>菜系风格</Text>
          <View style={styles.chipContainer}>
            {styleOptions.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setStyle(option === '不限' ? '' : option)}
                style={[
                  styles.chip,
                  (style === option || (option === '不限' && !style)) && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    (style === option || (option === '不限' && !style)) && styles.chipTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 难度 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>难度</Text>
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
          <Text style={styles.sectionTitle}>烹饪时间（分钟）</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            placeholderTextColor={colors.subText}
            keyboardType="number-pad"
            value={cookTime > 0 ? String(cookTime) : ''}
            onChangeText={(text) => setCookTime(parseInt(text) || 0)}
          />
        </View>

        {/* 人份 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>人份</Text>
          <TextInput
            style={styles.input}
            placeholder="2"
            placeholderTextColor={colors.subText}
            keyboardType="number-pad"
            value={String(servings)}
            onChangeText={(text) => setServings(parseInt(text) || 2)}
          />
        </View>

        {/* 饮食限制 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>饮食限制</Text>
          <View style={styles.chipContainer}>
            {restrictionOptions.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => toggleRestriction(option)}
                style={[
                  styles.chip,
                  dietaryRestrictions.includes(option) && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    dietaryRestrictions.includes(option) && styles.chipTextActive,
                  ]}
                >
                  {option}
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
              <Text style={styles.generateButtonText}>AI 正在为您创作菜谱...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateButtonText}>生成菜谱</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 历史记录入口 */}
        <TouchableOpacity
          onPress={() => router.push('/ai-generate/history')}
          style={styles.historyButton}
        >
          <Ionicons name="time-outline" size={20} color={colors.tint} />
          <Text style={styles.historyButtonText}>查看生成历史</Text>
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
