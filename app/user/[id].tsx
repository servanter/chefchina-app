import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { AppImage } from '../../src/components/AppImage';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { RecipeSkeletonList } from '../../src/components/RecipeSkeleton';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserStats, useUserRecipes, useUserFavorites, useUserFollowing, useUserFollowers } from '../../src/hooks/useUserProfile';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useFontScale } from '../../src/hooks/useFontScale';
import { apiClient } from '../../src/lib/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// BUG-002: 添加 'following' 和 'followers' Tab
type TabType = 'recipes' | 'favorites' | 'liked' | 'following' | 'followers';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const isZh = i18n.language === 'zh';

  const [activeTab, setActiveTab] = useState<TabType>('recipes');
  const [refreshing, setRefreshing] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  // 获取用户基本信息
  const { data: user, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // REQ-16.1: 获取用户统计数据
  const { data: stats, refetch: refetchStats } = useUserStats(id);

  // REQ-16.1: 获取各个 Tab 的数据
  const {
    data: recipes,
    refetch: refetchRecipes,
    fetchNextPage: fetchNextRecipes,
    hasNextPage: hasNextRecipes,
    isFetchingNextPage: isFetchingNextRecipes,
    isLoading: recipesLoading,
  } = useUserRecipes(id, 'published');
  const {
    data: likedRecipes,
    refetch: refetchLiked,
    fetchNextPage: fetchNextLiked,
    hasNextPage: hasNextLiked,
    isFetchingNextPage: isFetchingNextLiked,
    isLoading: likedLoading,
  } = useUserRecipes(id, 'liked');
  const {
    data: favorites,
    refetch: refetchFavorites,
    fetchNextPage: fetchNextFavorites,
    hasNextPage: hasNextFavorites,
    isFetchingNextPage: isFetchingNextFavorites,
    isLoading: favoritesLoading,
  } = useUserFavorites(id);
  const {
    data: following,
    refetch: refetchFollowing,
    fetchNextPage: fetchNextFollowing,
    hasNextPage: hasNextFollowing,
    isFetchingNextPage: isFetchingNextFollowing,
    isLoading: followingLoading,
  } = useUserFollowing(id);
  const {
    data: followers,
    refetch: refetchFollowers,
    fetchNextPage: fetchNextFollowers,
    hasNextPage: hasNextFollowers,
    isFetchingNextPage: isFetchingNextFollowers,
    isLoading: followersLoading,
  } = useUserFollowers(id);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchUser(),
      refetchStats(),
      refetchRecipes(),
      refetchLiked(),
      refetchFavorites(),
      refetchFollowing(),
      refetchFollowers(),
    ]);
    setRefreshing(false);
  };

  const currentData = useMemo(() => {
    const flatten = (pages?: { pages?: Array<{ data: any[] }> }) =>
      pages?.pages?.flatMap((page) => page.data ?? []) ?? [];

    switch (activeTab) {
      case 'recipes':
        return flatten(recipes);
      case 'favorites':
        return flatten(favorites);
      case 'liked':
        return flatten(likedRecipes);
      case 'following':
        return flatten(following);
      case 'followers':
        return flatten(followers);
      default:
        return [];
    }
  }, [activeTab, favorites, followers, following, likedRecipes, recipes]);

  const currentLoading =
    activeTab === 'recipes'
      ? recipesLoading
      : activeTab === 'favorites'
        ? favoritesLoading
        : activeTab === 'liked'
          ? likedLoading
          : activeTab === 'following'
            ? followingLoading
            : followersLoading;

  const loadMore = () => {
    if (activeTab === 'recipes' && hasNextRecipes && !isFetchingNextRecipes) fetchNextRecipes();
    if (activeTab === 'favorites' && hasNextFavorites && !isFetchingNextFavorites) fetchNextFavorites();
    if (activeTab === 'liked' && hasNextLiked && !isFetchingNextLiked) fetchNextLiked();
    if (activeTab === 'following' && hasNextFollowing && !isFetchingNextFollowing) fetchNextFollowing();
    if (activeTab === 'followers' && hasNextFollowers && !isFetchingNextFollowers) fetchNextFollowers();
  };

  if (userLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <EmptyState
          icon="person-outline"
          title={t('profile.userNotFound')}
          subtitle={t('profile.userNotFoundHint')}
        />
      </SafeAreaView>
    );
  }

  const avatarUri = user.avatar || `https://i.pravatar.cc/150?u=${user.id}`;
  const displayName = user.name || 'Anonymous';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(17) }]}>
          {displayName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={currentData}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        keyExtractor={(item, index) => `${activeTab}-${item.id || index}`}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <AppImage
                uri={avatarUri}
                fallback={`https://i.pravatar.cc/150?u=${user.id}`}
                style={[styles.avatar, { borderColor: colors.tint }]}
              />
              <Text style={[styles.displayName, { color: colors.text, fontSize: scaled(20) }]}>
                {displayName}
              </Text>
              {user.bio && (
                <Text style={[styles.bio, { color: colors.subText, fontSize: scaled(13) }]}>
                  {user.bio}
                </Text>
              )}

              {/* REQ-BF-010: 统计数据 - 添加点击跳转 */}
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('recipes')}>
                  <Text style={[styles.statValue, { color: colors.text, fontSize: scaled(20) }]}>
                    {stats?.recipeCount || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.subText, fontSize: scaled(12) }]}>
                    {isZh ? '菜谱' : 'Recipes'}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('liked')}>
                  <Text style={[styles.statValue, { color: colors.text, fontSize: scaled(20) }]}>
                    {stats?.totalLikes || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.subText, fontSize: scaled(12) }]}>
                    {isZh ? '获赞' : 'Likes'}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('following')}>
                  <Text style={[styles.statValue, { color: colors.text, fontSize: scaled(20) }]}>
                    {stats?.followingCount || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.subText, fontSize: scaled(12) }]}>
                    {isZh ? '关注' : 'Following'}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('followers')}>
                  <Text style={[styles.statValue, { color: colors.text, fontSize: scaled(20) }]}>
                    {stats?.followerCount || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.subText, fontSize: scaled(12) }]}>
                    {isZh ? '粉丝' : 'Followers'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              {isOwnProfile ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                  onPress={() => router.push('/profile/edit')}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.tint} />
                  <Text style={[styles.actionBtnText, { color: colors.tint, fontSize: scaled(14) }]}>
                    {isZh ? '编辑资料' : 'Edit Profile'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.tint, flex: 1 }]}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#FFF" />
                    <Text style={[styles.actionBtnText, { color: '#FFF', fontSize: scaled(14) }]}>
                      {isZh ? '关注' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder, marginLeft: 12 }]}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color={colors.tint} />
                    <Text style={[styles.actionBtnText, { color: colors.tint, fontSize: scaled(14) }]}>
                      {isZh ? '私信' : 'Message'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* REQ-16.1: Tab 切换 */}
            <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'recipes' && { borderBottomColor: colors.tint }]}
                onPress={() => setActiveTab('recipes')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'recipes' ? colors.tint : colors.subText, fontSize: scaled(15) },
                  ]}
                >
                  {isZh ? '菜谱' : 'Recipes'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'favorites' && { borderBottomColor: colors.tint }]}
                onPress={() => setActiveTab('favorites')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'favorites' ? colors.tint : colors.subText, fontSize: scaled(15) },
                  ]}
                >
                  {isZh ? '收藏' : 'Favorites'}
                </Text>
              </TouchableOpacity>
              {/* BUG-002: 添加关注 Tab */}
              <TouchableOpacity
                style={[styles.tab, activeTab === 'following' && { borderBottomColor: colors.tint }]}
                onPress={() => setActiveTab('following')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'following' ? colors.tint : colors.subText, fontSize: scaled(15) },
                  ]}
                >
                  {isZh ? '关注' : 'Following'}
                </Text>
              </TouchableOpacity>
              {/* BUG-002: 添加粉丝 Tab */}
              <TouchableOpacity
                style={[styles.tab, activeTab === 'followers' && { borderBottomColor: colors.tint }]}
                onPress={() => setActiveTab('followers')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'followers' ? colors.tint : colors.subText, fontSize: scaled(15) },
                  ]}
                >
                  {isZh ? '粉丝' : 'Followers'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'liked' && { borderBottomColor: colors.tint }]}
                onPress={() => setActiveTab('liked')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'liked' ? colors.tint : colors.subText, fontSize: scaled(15) },
                  ]}
                >
                  {isZh ? '点赞' : 'Liked'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => {
          // BUG-002: 关注/粉丝 Tab 显示用户卡片
          if (activeTab === 'following' || activeTab === 'followers') {
            const user = item as any;
            return (
              <TouchableOpacity
                style={[styles.userCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/user/${user.id}`)}
              >
                <AppImage
                  uri={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`}
                  fallback={`https://i.pravatar.cc/150?u=${user.id}`}
                  style={styles.userAvatar}
                />
                <View style={styles.userCardInfo}>
                  <Text style={[styles.userCardName, { color: colors.text, fontSize: scaled(14) }]} numberOfLines={1}>
                    {user.name || 'Anonymous'}
                  </Text>
                  {user.bio && (
                    <Text style={[styles.userCardBio, { color: colors.subText, fontSize: scaled(12) }]} numberOfLines={2}>
                      {user.bio}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }
          // 菜谱卡片（recipes/favorites/liked）
          return (
            <TouchableOpacity
              style={[styles.recipeCard, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/recipe/${item.id}`)}
            >
              <AppImage
                uri={item.coverImage || item.cover_image}
                fallback="https://via.placeholder.com/300"
                style={styles.recipeImage}
              />
              <View style={styles.recipeInfo}>
                <Text style={[styles.recipeTitle, { color: colors.text, fontSize: scaled(14) }]} numberOfLines={2}>
                  {isZh ? item.titleZh || item.titleEn : item.titleEn}
                </Text>
                <View style={styles.recipeMeta}>
                  <Ionicons name="heart" size={12} color={colors.subText} />
                  <Text style={[styles.recipeMetaText, { color: colors.subText, fontSize: scaled(11) }]}>
                    {item._count?.likes || 0}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          currentLoading ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <RecipeSkeletonList count={4} variant={activeTab === 'following' || activeTab === 'followers' ? 'grid' : 'grid'} />
            </View>
          ) : (
            <EmptyState
              icon="document-text-outline"
              title={isZh ? '暂无内容' : 'No Content'}
              subtitle={isZh ? '快去发布第一个菜谱吧' : 'Publish your first recipe'}
            />
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    marginBottom: 12,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  columnWrapper: {
    paddingHorizontal: 16,
    gap: 16,
  },
  recipeCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeImage: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
  },
  recipeInfo: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeMetaText: {
    fontSize: 11,
  },
  // BUG-002: 用户卡片样式（关注/粉丝 Tab）
  userCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userAvatar: {
    width: CARD_WIDTH - 24,
    height: CARD_WIDTH - 24,
    borderRadius: (CARD_WIDTH - 24) / 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  userCardInfo: {
    alignItems: 'center',
  },
  userCardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  userCardBio: {
    fontSize: 12,
    textAlign: 'center',
  },
});
