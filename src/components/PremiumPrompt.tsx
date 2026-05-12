// src/components/PremiumPrompt.tsx
// Premium 引导卡片

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

interface PremiumPromptProps {
  remainingQuota: number;
  dailyLimit: number;
  resetAt?: string;
  onClose?: () => void;
}

export const PremiumPrompt: React.FC<PremiumPromptProps> = ({
  remainingQuota,
  dailyLimit,
  resetAt,
  onClose,
}) => {
  const router = useRouter();
  const { colors } = useTheme();

  const formatResetTime = (isoString?: string): string => {
    if (!isoString) return '明天';
    const date = new Date(isoString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    
    if (date.toDateString() === tomorrow.toDateString()) {
      return '明天';
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={24} color="#FFB800" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            今日剩余 {remainingQuota}/{dailyLimit} 次
          </Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            {formatResetTime(resetAt)} 重置
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={[styles.featureText, { color: colors.text }]}>
            升级 Premium 获得 20 次/天
          </Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={[styles.featureText, { color: colors.text }]}>
            个性化营养建议
          </Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={[styles.featureText, { color: colors.text }]}>
            无限收藏菜谱
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.upgradeBtn, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/pricing')}
      >
        <Text style={styles.upgradeBtnText}>立即升级</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  closeBtn: {
    padding: 4,
  },
  features: {
    gap: 10,
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
