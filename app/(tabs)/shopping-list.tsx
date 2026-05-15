/**
 * 智能购物清单 - Tab 入口，直接渲染内容（保留 tab bar）
 * app/(tabs)/shopping-list.tsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';

import {
  useShoppingList,
  useGenerateShoppingList,
  useClearShoppingList,
} from '@/hooks/useShoppingList';
import ShoppingListItem from '../../components/ShoppingListItem';
import AddIngredientModal from '../../components/AddIngredientModal';
import EmptyShoppingList from '../../components/EmptyShoppingList';

export default function ShoppingListTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useShoppingList();
  const generateMutation = useGenerateShoppingList();
  const clearMutation = useClearShoppingList();

  const styles = getStyles(colors);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRegenerate = () => {
    Alert.alert(
      '重新生成购物清单',
      '将根据您收藏的菜谱重新生成购物清单，保留手动添加的食材。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            generateMutation.mutate({ keepManual: true });
          },
        },
      ]
    );
  };

  const handleClearChecked = () => {
    Alert.alert('清空已购', '确定要删除所有已勾选的食材吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => {
          clearMutation.mutate({ clearAll: false, keepManual: false });
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('清空全部', '确定要删除所有食材吗？（包括手动添加的）', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => {
          clearMutation.mutate({ clearAll: true, keepManual: false });
        },
      },
    ]);
  };

  const handleExport = () => {
    if (!data || data.items.length === 0) {
      Alert.alert('提示', '购物清单为空');
      return;
    }

    const dateStr = format(new Date(), 'yyyy-MM-dd', { locale: zhCN });
    const uncheckedItems = data.items.filter((item) => !item.checked);

    let text = `📝 购物清单（${dateStr}）\n\n`;

    uncheckedItems.forEach((item) => {
      const emoji = getIngredientEmoji(item.name);
      const amountStr = item.amount === 0 ? item.unit : `${item.amount}${item.unit}`;
      text += `${emoji} ${item.name}  ${amountStr}\n`;
    });

    text += `\n---\n共 ${data.totalItems} 项，已购 ${data.checkedItems} 项\n生成自 ChefChina`;

    Share.share({ message: text });
  };

  const getIngredientEmoji = (name: string): string => {
    const emojiMap: Record<string, string> = {
      鸡: '🐔', 肉: '🥩', 猪: '🐷', 牛: '🐄', 鱼: '🐟',
      虾: '🦐', 蛋: '🥚', 米: '🍚', 面: '🍜', 菜: '🥬',
      西兰花: '🥦', 番茄: '🍅', 土豆: '🥔', 胡萝卜: '🥕',
      盐: '🧂', 酱油: '🍶', 醋: '🧴', 油: '🛢️',
    };
    for (const key in emojiMap) {
      if (name.includes(key)) return emojiMap[key];
    }
    return '🥄';
  };

  // 加载状态
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  // 错误状态
  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <Text style={styles.errorText}>加载失败</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 空状态
  if (!data || data.items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>购物清单</Text>
          <TouchableOpacity onPress={handleExport} style={styles.headerButton}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <EmptyShoppingList onNavigate={() => router.push('/(tabs)/favorites')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - 无返回按钮（tab 首屏） */}
      <View style={styles.header}>
        <Text style={styles.title}>购物清单</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleExport} style={styles.headerButton}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}} style={styles.headerButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 统计信息 */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            共 {data.totalItems} 项，已购 {data.checkedItems} 项
          </Text>
        </View>

        {/* 购物清单列表 */}
        <View style={styles.listContainer}>
          {data.items.map((item) => (
            <ShoppingListItem key={item.id} item={item} />
          ))}
        </View>

        {/* 添加食材按钮 */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.tint} />
          <Text style={styles.addButtonText}>添加食材</Text>
        </TouchableOpacity>

        {/* 操作按钮 */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRegenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Text style={styles.actionButtonText}>重新生成</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearChecked}
            disabled={clearMutation.isPending}
          >
            {clearMutation.isPending ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Text style={styles.actionButtonText}>清空已购</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleClearAll}
            disabled={clearMutation.isPending}
          >
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              清空全部
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 添加食材弹窗 */}
      <AddIngredientModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </SafeAreaView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 16,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
      backgroundColor: colors.cardBg,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerButton: {
      padding: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    statsContainer: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    statsText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
      textAlign: 'center',
    },
    listContainer: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.tint,
      borderStyle: 'dashed',
    },
    addButtonText: {
      fontSize: 16,
      color: colors.tint,
      fontWeight: '500',
      marginLeft: 8,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 32,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    dangerButton: {
      borderColor: colors.tint,
    },
    dangerButtonText: {
      color: colors.tint,
    },
    errorText: {
      fontSize: 16,
      color: colors.subText,
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: colors.tint,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
