// app/ai-generate/history.tsx
// AI 生成历史列表

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../src/contexts/ThemeContext';
import { apiClient as api } from '@/lib/api';

interface HistoryItem {
  id: string;
  title: string;
  isPublished: boolean;
  recipeId?: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  inputIngredients: string[];
}

export default function AIGenerateHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const styles = getStyles(colors);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/ai/generated-recipes');
      if (response.data.success) {
        setItems(response.data.data.items);
      }
    } catch (error) {
      console.error('[AI History] Load error:', error);
      Toast.show({
        type: 'error',
        text1: '加载失败',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: HistoryItem) => {
    if (item.isPublished && item.recipeId) {
      router.push(`/recipe/${item.recipeId}`);
    } else {
      router.push(`/ai-generate/result/${item.id}`);
    }
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const createdDate = new Date(item.createdAt).toLocaleDateString('zh-CN');
    const statusColor = item.isPublished
      ? '#51cf66'
      : item.isExpired
      ? '#adb5bd'
      : colors.tint;
    const statusText = item.isPublished
      ? '已发布'
      : item.isExpired
      ? '已过期'
      : '草稿';

    return (
      <TouchableOpacity onPress={() => handleItemPress(item)} style={styles.item}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.itemMeta}>
          <View style={styles.itemMetaRow}>
            <Ionicons name="cube-outline" size={14} color={colors.subText} />
            <Text style={styles.itemMetaText}>
              {item.inputIngredients.slice(0, 3).join('、')}
              {item.inputIngredients.length > 3 && ' ...'}
            </Text>
          </View>
          <Text style={styles.itemDate}>{createdDate}</Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.subText} style={styles.itemChevron} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="sparkles-outline" size={64} color={colors.subText} />
      <Text style={styles.emptyTitle}>还没有生成过菜谱</Text>
      <Text style={styles.emptyText}>立即体验 AI 菜谱生成器</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>开始生成</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>生成历史</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
        />
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
    },
    list: {
      padding: 16,
      paddingBottom: 32,
    },
    item: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    itemMetaText: {
      fontSize: 13,
      color: colors.subText,
      flex: 1,
    },
    itemDate: {
      fontSize: 12,
      color: colors.subText,
    },
    itemChevron: {
      position: 'absolute',
      right: 16,
      top: '50%',
      marginTop: -10,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.subText,
    },
    emptyButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: colors.tint,
      borderRadius: 24,
    },
    emptyButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
  });
}
