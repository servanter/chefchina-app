/**
 * 智能购物清单主页
 * /shopping-list
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import {
  useShoppingList,
  useGenerateShoppingList,
  useClearShoppingList,
} from '@/hooks/useShoppingList';
import ShoppingListItem from '../../components/ShoppingListItem';
import AddIngredientModal from '../../components/AddIngredientModal';
import EmptyShoppingList from '../../components/EmptyShoppingList';

export default function ShoppingListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // React Query Hooks
  const { data, isLoading, error, refetch } = useShoppingList();
  const generateMutation = useGenerateShoppingList();
  const clearMutation = useClearShoppingList();

  // 刷新
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // 重新生成
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

  // 清空已购
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

  // 清空全部
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

  // 导出文本
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

    Share.share({
      message: text,
    });
  };

  // 根据食材名称返回合适的 emoji
  const getIngredientEmoji = (name: string): string => {
    const emojiMap: Record<string, string> = {
      鸡: '🐔',
      肉: '🥩',
      猪: '🐷',
      牛: '🐄',
      鱼: '🐟',
      虾: '🦐',
      蛋: '🥚',
      米: '🍚',
      面: '🍜',
      菜: '🥬',
      西兰花: '🥦',
      番茄: '🍅',
      土豆: '🥔',
      胡萝卜: '🥕',
      盐: '🧂',
      酱油: '🍶',
      醋: '🧴',
      油: '🛢️',
    };

    for (const key in emojiMap) {
      if (name.includes(key)) {
        return emojiMap[key];
      }
    }

    return '🥄'; // 默认
  };

  // 加载状态
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: '购物清单',
            headerBackTitle: '返回',
          }}
        />
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  // 错误状态
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: '购物清单',
            headerBackTitle: '返回',
          }}
        />
        <Text style={styles.errorText}>加载失败</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 空状态
  if (!data || data.items.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '购物清单',
            headerBackTitle: '返回',
          }}
        />
        <EmptyShoppingList onNavigate={() => router.push('/(tabs)/favorites')} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '购物清单',
          headerBackTitle: '返回',
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleExport} style={styles.headerButton}>
                <Ionicons name="share-outline" size={22} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {}} style={styles.headerButton}>
                <Ionicons name="ellipsis-horizontal" size={22} color="#333" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        {/* ── Back button always visible ── */}
        <View style={[styles.absoluteBack, { top: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtnCircle} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
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
          <Ionicons name="add-circle-outline" size={24} color="#FF6B6B" />
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
              <ActivityIndicator size="small" color="#FF6B6B" />
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
      </View>

      {/* 添加食材弹窗 */}
      <AddIngredientModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#F5F5F5',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  statsContainer: {
    backgroundColor: '#FFF',
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
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  listContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    color: '#FF6B6B',
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
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dangerButton: {
    borderColor: '#FF6B6B',
  },
  dangerButtonText: {
    color: '#FF6B6B',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  absoluteBack: {
    position: 'absolute',
    left: 16,
    zIndex: 200,
  },
  backBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
