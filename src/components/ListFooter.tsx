import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ListFooterProps {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error?: unknown;
  onRetry?: () => void;
  // 只有至少加载过一页且不再有下一页时才显示"没有更多"
  showNoMoreWhenEmpty?: boolean;
  hasItems?: boolean;
}

export const ListFooter: React.FC<ListFooterProps> = ({
  isFetchingNextPage,
  hasNextPage,
  error,
  onRetry,
  showNoMoreWhenEmpty = false,
  hasItems = true,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (error) {
    return (
      <TouchableOpacity style={styles.container} onPress={onRetry} activeOpacity={0.7}>
        <Ionicons name="alert-circle-outline" size={16} color="#C0392B" />
        <Text style={[styles.errorText, { color: '#C0392B' }]}>
          {t('list.loadFailed')}
          {onRetry ? ` · ${t('list.tapRetry')}` : ''}
        </Text>
      </TouchableOpacity>
    );
  }

  if (isFetchingNextPage) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.subText }]}>{t('list.loadMore')}</Text>
      </View>
    );
  }

  if (!hasNextPage && (hasItems || showNoMoreWhenEmpty)) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noMoreText, { color: colors.subText }]}>{t('list.noMore')}</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 6,
  },
  loadingText: {
    fontSize: 12,
  },
  noMoreText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
