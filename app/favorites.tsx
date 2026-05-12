import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCard } from '../../src/components/RecipeCard';
import { EmptyState } from '../../src/components/EmptyState';
import { SkeletonList } from '../../src/components/Skeleton';
import { ListFooter } from '../../src/components/ListFooter';
import { useInfiniteFavoritesList } from '../../src/hooks/useRecipes';
import { getUserId } from '../../src/lib/storage';
import { useTheme } from '../../src/contexts/ThemeContext';

// Fallback values for static StyleSheet.create
const COLORS = {
  primary: '#E85D26',
  background: '#FFFDF9',
  text: '#1A1A1A',
};

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  // null = still reading from storage, string = resolved (may be 'guest')
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getUserId().then((id) => setUserId(id ?? 'guest'));
  }, []);

  // 需求 12：接入 useInfiniteList（cursor 契约的薄包装）
  const {
    items: favorites,
    isLoading,
    isRefreshing,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
    total,
  } = useInfiniteFavoritesList(userId ?? '');

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) fetchNextPage();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Show spinner while userId hasn't been resolved from storage yet,
  // or while the favorites query is still in-flight.
  const loading = userId === null || (isLoading && favorites.length === 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('favorites.title')}</Text>
        {!loading && <Text style={styles.countText}>{total}</Text>}
      </View>

      {loading ? (
        <SkeletonList count={6} />
      ) : favorites.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon="heart-outline"
            title={t('favorites.empty')}
            subtitle={t('favorites.emptyHint')}
          />
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.85}
          >
            <Ionicons name="compass-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.exploreBtnText}>{t('favorites.goExplore')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <ListFooter
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              error={error}
              onRetry={() => fetchNextPage()}
              hasItems={favorites.length > 0}
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              variant="grid"
              onPress={() => router.push(`/recipe/${item.id}`)}
            />
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  countText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E85D26',
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 40,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#E85D26',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  exploreBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
