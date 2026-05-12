/**
 * 购物清单空状态组件
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onNavigate: () => void;
}

export default function EmptyShoppingList({ onNavigate }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="cart-outline" size={80} color="#E0E0E0" />
      <Text style={styles.title}>还没有收藏菜谱呢</Text>
      <Text style={styles.subtitle}>快去收藏喜欢的菜谱吧！</Text>
      <TouchableOpacity style={styles.button} onPress={onNavigate}>
        <Text style={styles.buttonText}>去收藏菜谱</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
