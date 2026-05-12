// src/components/PremiumPrompt.tsx
// Premium 引导卡片

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const isZh = i18n.language === 'zh';

  const formatResetTime = (isoString?: string): string => {
    const tomorrow = t('ai.quotaPrompt.tomorrow');
    if (!isoString) return tomorrow;
    const date = new Date(isoString);
    const now = new Date();
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    
    if (date.toDateString() === tomorrowDate.toDateString()) {
      return tomorrow;
    }
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={24} color="#FFB800" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('ai.quotaPrompt.title', { remaining: remainingQuota, limit: dailyLimit })}
          </Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            {t('ai.quotaPrompt.reset', { time: formatResetTime(resetAt) })}
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
            {t('ai.quotaPrompt.features.unlimited')}
          </Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={[styles.featureText, { color: colors.text }]}>
            {t('ai.quotaPrompt.features.priority')}
          </Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={[styles.featureText, { color: colors.text }]}>
            {t('ai.quotaPrompt.features.advice')}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.upgradeBtn, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/pricing')}
      >
        <Text style={styles.upgradeBtnText}>{t('ai.quotaPrompt.upgradeButton')}</Text>
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
