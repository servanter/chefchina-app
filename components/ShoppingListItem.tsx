/**
 * 购物清单项组件
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';

import { ShoppingListItem as Item } from '../src/lib/api';
import {
  useUpdateShoppingListItem,
  useDeleteShoppingListItem,
} from '../src/hooks/useShoppingList';

interface Props {
  item: Item;
}

export default function ShoppingListItem({ item }: Props) {
  const updateMutation = useUpdateShoppingListItem();
  const deleteMutation = useDeleteShoppingListItem();

  const handleToggleCheck = () => {
    updateMutation.mutate({ id: item.id, checked: !item.checked });
  };

  const handleDelete = () => {
    Alert.alert('删除食材', `确定要删除 ${item.name} 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(item.id);
        },
      },
    ]);
  };

  const amountStr = item.amount === 0 ? item.unit : `${item.amount}${item.unit}`;

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Checkbox
          value={item.checked}
          onValueChange={handleToggleCheck}
          color={item.checked ? '#FF6B6B' : undefined}
          style={styles.checkbox}
        />

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, item.checked && styles.checkedText]}>
              {item.name}
            </Text>
            <Text style={[styles.amount, item.checked && styles.checkedText]}>
              {amountStr}
            </Text>
            {item.isManual && (
              <View style={styles.manualBadge}>
                <Text style={styles.manualBadgeText}>手动添加</Text>
              </View>
            )}
          </View>

          {/* 来源菜谱 */}
          {item.recipeIds.length > 0 && (
            <View style={styles.recipeRow}>
              <Ionicons name="location-outline" size={14} color="#999" />
              <Text style={styles.recipeText} numberOfLines={1}>
                {item.recipeIds.length === 1
                  ? '来自 1 个菜谱'
                  : `来自 ${item.recipeIds.length} 个菜谱`}
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color="#999" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  infoSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    color: '#666',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  manualBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  manualBadgeText: {
    fontSize: 12,
    color: '#FF9800',
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  recipeText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 4,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});
