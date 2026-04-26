import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontScale } from '@/hooks/useFontScale';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteFeed } from '@/hooks/useSocial';
import { EmptyState } from '@/components/EmptyState';
import { ListFooter } from '@/components/ListFooter';
import type { FeedItem } from '@/lib/api';

export default function FollowFeedScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const isZh = i18n.language.startsWith('zh');
  const { user, isLoggedIn } = useAuth();
  const userId = user?.id ?? 'guest';

  const {
    data,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useInfiniteFeed(isLoggedIn);

  const items = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data]
  );

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.safeAreaBg }]}>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="person-circle-outline"
            title={t('auth.loginRequired')}
            subtitle={t('feed.loginRequiredDesc')}
          />
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.safeAreaBg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(20) }]}>
          {t('feed.title')}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <Text style={{ color: colors.subText }}>{t('common.loading')}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="people-outline"
            title={t('feed.emptyTitle')}
            subtitle={t('feed.emptyDesc')}
          />
          <TouchableOpacity
            style={[styles.exploreBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Text style={styles.exploreBtnText}>{t('feed.goExplore')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}-${item.id}-${item.createdAt}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          onEndReached={() => {
            if (!isFetchingNextPage && hasNextPage) fetchNextPage();
          }}
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
          renderItem={({ item }) => <FeedItemCard item={item} isZh={isZh} colors={colors} scaled={scaled} onPress={() => handleItemPress(item, router)} />}
        />
      )}
    </SafeAreaView>
  );
}

function FeedItemCard({ item, isZh, colors, scaled, onPress }: {
  item: FeedItem;
  isZh: boolean;
  colors: any;
  scaled: (size: number) => number;
  onPress: () => void;
}) {
  const getIcon = () => {
    if (item.type === 'recipe') return 'restaurant';
    if (item.type === 'comment') return 'chatbubble';
    if (item.type === 'favorite') return 'bookmark';
    return 'ellipse';
  };

  const getActionText = () => {
    if (item.type === 'recipe') return isZh ? '发布了菜谱' : 'published a recipe';
    if (item.type === 'comment') return isZh ? '评论了' : 'commented on';
    if (item.type === 'favorite') return isZh ? '收藏了' : 'favorited';
    return '';
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Image
          source={{ uri: item.user.avatar || 'https://i.pravatar.cc/150?u=' + item.user.id }}
          style={styles.avatar}
        />
        <View style={styles.cardInfo}>
          <Text style={[styles.userName, { color: colors.text, fontSize: scaled(14) }]}>{item.user.name}</Text>
          <Text style={[styles.actionText, { color: colors.subText, fontSize: scaled(13) }]}>{getActionText()}</Text>
        </View>
        <Ionicons name={getIcon()} size={20} color={colors.tint} style={styles.typeIcon} />
      </View>

      {item.type === 'recipe' && item.recipe && (
        <View style={styles.recipePreview}>
          <Image source={{ uri: item.recipe.cover_image }} style={styles.recipeCover} />
          <View style={styles.recipeInfo}>
            <Text style={[styles.recipeTitle, { color: colors.text, fontSize: scaled(15) }]} numberOfLines={2}>
              {isZh ? item.recipe.title_zh : item.recipe.title}
            </Text>
            <Text style={[styles.recipeDesc, { color: colors.subText, fontSize: scaled(12) }]} numberOfLines={2}>
              {isZh ? item.recipe.description_zh : item.recipe.description}
            </Text>
          </View>
        </View>
      )}

      {item.type === 'comment' && item.comment && (
        <View style={[styles.commentPreview, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.commentText, { color: colors.text, fontSize: scaled(13) }]} numberOfLines={3}>
            {item.comment.content}
          </Text>
        </View>
      )}

      {item.type === 'favorite' && item.recipe && (
        <View style={styles.favoritePreview}>
          <Image source={{ uri: item.recipe.cover_image }} style={styles.favoriteThumb} />
          <Text style={[styles.favoriteTitle, { color: colors.text, fontSize: scaled(14) }]} numberOfLines={2}>
            {isZh ? item.recipe.title_zh : item.recipe.title}
          </Text>
        </View>
      )}

      <Text style={[styles.timestamp, { color: colors.subText, fontSize: scaled(11) }]}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );
}

function handleItemPress(item: FeedItem, router: any) {
  if (item.type === 'recipe' && item.recipe) {
    router.push(`/recipe/${item.recipe.id}`);
  } else if (item.type === 'comment' && item.comment) {
    router.push(`/recipe/${item.comment.recipe.id}`);
  } else if (item.type === 'favorite' && item.recipe) {
    router.push(`/recipe/${item.recipe.id}`);
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontWeight: '700' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  loginBtn: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  loginBtnText: { color: '#fff', fontWeight: '700' },
  exploreBtn: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  exploreBtnText: { color: '#fff', fontWeight: '700' },
  listContent: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
  cardInfo: { flex: 1, marginLeft: 10 },
  userName: { fontWeight: '600' },
  actionText: {},
  typeIcon: { marginLeft: 'auto' },
  recipePreview: { flexDirection: 'row', gap: 10 },
  recipeCover: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  recipeInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  recipeTitle: { fontWeight: '600' },
  recipeDesc: {},
  commentPreview: { padding: 10, borderRadius: 8 },
  commentText: {},
  favoritePreview: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  favoriteThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  favoriteTitle: { flex: 1, fontWeight: '600' },
  timestamp: { textAlign: 'right' },
});
