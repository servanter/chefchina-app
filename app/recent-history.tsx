import React, { useMemo } from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontScale } from '@/hooks/useFontScale';
import {
  flattenHistoryPages,
  useClearViewHistory,
  useDeleteViewHistory,
  useViewHistory,
} from '@/hooks/useViewHistory';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/EmptyState';
import { ListFooter } from '@/components/ListFooter';

export default function RecentHistoryScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const isZh = i18n.language.startsWith('zh');
  const { isLoggedIn } = useAuth();

  const {
    data,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useViewHistory(isLoggedIn);
  const deleteMutation = useDeleteViewHistory();
  const clearMutation = useClearViewHistory();

  const items = useMemo(() => flattenHistoryPages(data?.pages), [data]);

  const handleRemove = async (historyId: string, recipeId: string) => {
    await deleteMutation.mutateAsync({ historyId, recipeId });
  };

  const handleClear = () => {
    Alert.alert(t('recentHistory.clearTitle'), t('recentHistory.clearConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('recentHistory.clearAction'),
        style: 'destructive',
        onPress: async () => {
          await clearMutation.mutateAsync();
        },
      },
    ]);
  };

  const listEmpty = !isLoading && items.length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.safeAreaBg }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(20) }]}>{t('recentHistory.title')}</Text>
        <TouchableOpacity onPress={handleClear} style={styles.headerBtn}>
          <Ionicons name="trash-bin-outline" size={20} color={items.length ? '#ef4444' : colors.subText} />
        </TouchableOpacity>
      </View>

      {!isLoggedIn ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="person-circle-outline"
            title={t('auth.loginRequired')}
            subtitle={t('auth.loginRequiredDesc')}
          />
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push({ pathname: '/auth/login', params: { redirect: '/recent-history' } })}
          >
            <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      ) : listEmpty ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="time-outline"
            title={t('recentHistory.emptyTitle')}
            subtitle={t('recentHistory.emptyDesc')}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={() => {
            if (!isFetchingNextPage && hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            <ListFooter
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              error={error}
              onRetry={() => fetchNextPage()}
              hasItems={items.length > 0}
            />
          }
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const title = isZh ? item.title_zh || item.title : item.title || item.title_zh;
            const description = isZh
              ? item.description_zh || item.description
              : item.description || item.description_zh;

            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <TouchableOpacity style={styles.cardMain} onPress={() => router.push(`/recipe/${item.id}`)}>
                  <Image source={{ uri: item.cover_image }} style={styles.cover} />
                  <View style={styles.body}>
                    <Text style={[styles.title, { color: colors.text, fontSize: scaled(16) }]} numberOfLines={2}>
                      {title || t('recentHistory.unknownRecipe')}
                    </Text>
                    <Text style={[styles.desc, { color: colors.subText }]} numberOfLines={2}>
                      {description || t('recentHistory.noDescription')}
                    </Text>
                    <Text style={[styles.time, { color: colors.subText }]}>
                      {t('recentHistory.viewedAt', { time: new Date(item.created_at).toLocaleString() })}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleRemove(item.history_id, item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 32, alignItems: 'center' },
  headerTitle: { fontWeight: '700' },
  listContent: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  cardMain: { flex: 1, flexDirection: 'row' },
  cover: { width: 96, height: 96, backgroundColor: '#eee' },
  body: { flex: 1, padding: 12, gap: 8 },
  title: { fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 18 },
  time: { fontSize: 12 },
  deleteBtn: { width: 48, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  loginBtn: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  loginBtnText: { color: '#fff', fontWeight: '700' },
});
