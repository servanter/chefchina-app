import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { EmptyState } from '../src/components/EmptyState';
import { ListFooter } from '../src/components/ListFooter';
import {
  useInfiniteNotifications,
  useMarkRead,
  useMarkAllRead,
  useUnreadCount,
  type TabType,
  type Notification,
  type NotificationType,
} from '../src/hooks/useNotifications';
import { getUserId } from '../src/lib/storage';
import { useTheme } from '../src/contexts/ThemeContext';

const ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  COMMENT_REPLY: 'chatbubble-ellipses-outline',
  RECIPE_LIKED: 'heart-outline',
  RECIPE_FAVORITED: 'bookmark-outline',
  SUBMISSION_APPROVED: 'checkmark-done-outline',
  SYSTEM: 'megaphone-outline',
};

const ICON_TINT: Record<NotificationType, string> = {
  COMMENT_REPLY: '#2980B9',
  RECIPE_LIKED: '#E85D26',
  RECIPE_FAVORITED: '#4CAF50',
  SUBMISSION_APPROVED: '#8E44AD',
  SYSTEM: '#555',
};

function formatRelativeTime(iso: string, isZh: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return isZh ? '刚刚' : 'just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return isZh ? '刚刚' : 'just now';
  if (minutes < 60) return isZh ? `${minutes} 分钟前` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isZh ? `${hours} 小时前` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return isZh ? `${days} 天前` : `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const COLORS = { primary: '#E85D26', background: '#FFFDF9', text: '#1A1A1A', textSecondary: '#666', inputBg: '#F5F2EE', border: '#E8E4DF', card: '#FFF', tint: '#E85D26', unreadBg: '#FFF5F0' };
export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isZh = i18n.language === 'zh';
  const { colors } = useTheme();

  // Derive COLORS from theme for backward compat
  const COLORS = useMemo(() => ({
    primary: colors.tint,
    background: colors.bg,
    text: colors.text,
    textSecondary: colors.subText,
    white: colors.card,
    border: colors.border,
    unreadBg: colors.chipBg,
  }), [colors]);

  const [userId, setUserId] = useState<string | null>(null);
  const [resolvedAuth, setResolvedAuth] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    getUserId().then((uid) => {
      setUserId(uid);
      setResolvedAuth(true);
      if (!uid || uid === 'guest') {
        router.replace('/auth/login');
      }
    });
  }, [router]);

  const {
    data,
    isLoading,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useInfiniteNotifications(userId, activeTab);
  const markRead = useMarkRead(userId);
  const markAllRead = useMarkAllRead(userId, activeTab);
  const { data: unreadCounts } = useUnreadCount(userId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) fetchNextPage();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleItemPress = useCallback(
    async (n: Notification) => {
      if (!n.read) {
        try {
          await markRead.mutateAsync(n.id);
        } catch {
          // ignore — UI updates optimistically
        }
      }

      const recipeId = n.payload?.recipeId as string | undefined;
      if (recipeId) {
        router.push(`/recipe/${recipeId}`);
      }
    },
    [markRead, router],
  );

  const handleMarkAll = useCallback(async () => {
    try {
      await markAllRead.mutateAsync();
      Toast.show({
        type: 'success',
        text1: t('notifications.allMarkedRead'),
        visibilityTime: 1500,
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        visibilityTime: 1800,
      });
    }
  }, [markAllRead, t]);

  const items = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.data),
    [data],
  );
  const unread = data?.pages?.[0]?.unreadCount ?? 0;

  if (!resolvedAuth) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          {unread > 0 && (
            <Text style={styles.headerSubtitle}>
              {t('notifications.unreadCount', { count: unread })}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.markAllBtn,
            unread === 0 && styles.markAllBtnDisabled,
          ]}
          onPress={handleMarkAll}
          disabled={unread === 0 || markAllRead.isPending}
        >
          {markAllRead.isPending ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text
              style={[
                styles.markAllText,
                unread === 0 && styles.markAllTextDisabled,
              ]}
            >
              {t('notifications.markAllRead')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* REQ-16.2: Tab 分类 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            {isZh ? '全部' : 'All'}
          </Text>
          {(unreadCounts?.all || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCounts?.all}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'like' && styles.tabActive]}
          onPress={() => setActiveTab('like')}
        >
          <Text style={[styles.tabText, activeTab === 'like' && styles.tabTextActive]}>
            {isZh ? '点赞' : 'Likes'}
          </Text>
          {(unreadCounts?.like || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCounts?.like}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'comment' && styles.tabActive]}
          onPress={() => setActiveTab('comment')}
        >
          <Text style={[styles.tabText, activeTab === 'comment' && styles.tabTextActive]}>
            {isZh ? '评论' : 'Comments'}
          </Text>
          {(unreadCounts?.comment || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCounts?.comment}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'system' && styles.tabActive]}
          onPress={() => setActiveTab('system')}
        >
          <Text style={[styles.tabText, activeTab === 'system' && styles.tabTextActive]}>
            {isZh ? '系统' : 'System'}
          </Text>
          {(unreadCounts?.system || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCounts?.system}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isLoading && !data ? (
        <LoadingSpinner />
      ) : error && items.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.errorText}>{t('list.loadFailed')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title={t('notifications.empty')}
          subtitle={t('notifications.emptyHint')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <ListFooter
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              error={error}
              onRetry={() => fetchNextPage()}
              hasItems={items.length > 0}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isFetching}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => {
            const iconName = ICONS[item.type] ?? 'notifications-outline';
            const tint = ICON_TINT[item.type] ?? COLORS.primary;
            return (
              <TouchableOpacity
                style={[styles.row, !item.read && styles.rowUnread]}
                activeOpacity={0.8}
                onPress={() => handleItemPress(item)}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${tint}1A` }]}>
                  <Ionicons name={iconName} size={18} color={tint} />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTitleRow}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.read && <View style={styles.dot} />}
                  </View>
                  <Text style={styles.rowText} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {formatRelativeTime(item.created_at, isZh)} ·{' '}
                    {t(`notifications.types.${item.type}`)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFF0E8',
  },
  markAllBtnDisabled: {
    backgroundColor: '#F2EFEA',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  markAllTextDisabled: {
    color: '#999',
  },
  listContent: {
    paddingVertical: 4,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowUnread: {
    backgroundColor: COLORS.unreadBg,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  rowText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  rowMeta: {
    fontSize: 11,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF0E8',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // REQ-16.2: Tab Bar 样式
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
});
