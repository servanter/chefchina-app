import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useTopicDetail, useTopicRecipes, useToggleTopicFollow } from '@/hooks/useTopics';
import { RecipeCard } from '@/components/RecipeCard';
import { EmptyState } from '@/components/EmptyState';
import Toast from 'react-native-toast-message';

type SortType = 'latest' | 'hot';

export default function TopicDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [sort, setSort] = useState<SortType>('latest');
  const [page, setPage] = useState(1);

  const { data: topic, isLoading: topicLoading, refetch: refetchTopic } = useTopicDetail(id!);
  const { data: recipesData, isLoading: recipesLoading, refetch: refetchRecipes } = useTopicRecipes(id!, sort, page);
  const toggleFollow = useToggleTopicFollow();

  const isZh = i18n.language === 'zh';
  const topicName = topic ? (isZh ? topic.nameZh : topic.nameEn) : '';
  const topicDesc = topic ? (isZh ? topic.descZh : topic.descEn) : '';

  const handleToggleFollow = async () => {
    if (!topic) return;

    const action = topic.isFollowing ? 'unfollow' : 'follow';
    
    try {
      await toggleFollow.mutateAsync({ topicId: id!, action });
      Toast.show({
        type: 'success',
        text1: topic.isFollowing ? t('topic.unfollowed') : t('topic.followed')
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('common.error')
      });
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchTopic(), refetchRecipes()]);
  };

  if (topicLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!topic) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="pricetag-outline"
          title={isZh ? '话题不存在' : 'Topic not found'}
          description={isZh ? '该话题可能已被删除' : 'This topic may have been deleted'}
          actionText={isZh ? '返回' : 'Go Back'}
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={[styles.topicName, { color: colors.text }]}>
            {topic.icon} {topicName}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleToggleFollow}
          style={[
            styles.followButton,
            topic.isFollowing
              ? { backgroundColor: colors.primary }
              : { borderColor: colors.border, borderWidth: 1 }
          ]}
          disabled={toggleFollow.isPending}
        >
          {toggleFollow.isPending ? (
            <ActivityIndicator size="small" color={topic.isFollowing ? '#fff' : colors.primary} />
          ) : (
            <Text style={[
              styles.followButtonText,
              { color: topic.isFollowing ? '#fff' : colors.text }
            ]}>
              {topic.isFollowing ? (isZh ? '已关注 ✓' : 'Following ✓') : (isZh ? '关注' : 'Follow')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={recipesData?.recipes || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={() => (
          <View>
            {/* Stats */}
            <View style={styles.stats}>
              <Text style={[styles.statsText, { color: colors.subText }]}>
                📊 {topic.followerCount.toLocaleString()} {isZh ? '关注' : 'followers'} · {topic._count.recipes.toLocaleString()} {isZh ? '菜谱' : 'recipes'}
              </Text>
            </View>

            {/* Description */}
            {topicDesc && (
              <View style={styles.descSection}>
                <Text style={[styles.descText, { color: colors.subText }]}>{topicDesc}</Text>
              </View>
            )}

            {/* Sort Tabs */}
            <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setSort('latest')}
                style={[
                  styles.tab,
                  sort === 'latest' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
                ]}
              >
                <Text style={[
                  styles.tabText,
                  { color: sort === 'latest' ? colors.primary : colors.subText }
                ]}>
                  {isZh ? '最新' : 'Latest'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSort('hot')}
                style={[
                  styles.tab,
                  sort === 'hot' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
                ]}
              >
                <Text style={[
                  styles.tabText,
                  { color: sort === 'hot' ? colors.primary : colors.subText }
                ]}>
                  {isZh ? '最热' : 'Hot'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() =>
          recipesLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <EmptyState
              icon="document-text-outline"
              title={isZh ? '暂无菜谱' : 'No recipes yet'}
              description={isZh ? '该话题下还没有菜谱' : 'No recipes in this topic yet'}
            />
          )
        }
        renderItem={({ item, index }) => (
          <RecipeCard
            recipe={item}
            onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: item.id } })}
            style={[
              styles.recipeCard,
              index % 2 === 0 ? styles.recipeCardLeft : styles.recipeCardRight
            ]}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    flex: 1,
    marginLeft: 8
  },
  topicName: {
    fontSize: 18,
    fontWeight: '600'
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center'
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600'
  },
  content: {
    padding: 16
  },
  stats: {
    marginBottom: 12
  },
  statsText: {
    fontSize: 14
  },
  descSection: {
    marginBottom: 16
  },
  descText: {
    fontSize: 14,
    lineHeight: 20
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600'
  },
  row: {
    justifyContent: 'space-between'
  },
  recipeCard: {
    width: '48%',
    marginBottom: 16
  },
  recipeCardLeft: {
    marginRight: '2%'
  },
  recipeCardRight: {
    marginLeft: '2%'
  },
  loader: {
    marginTop: 40
  }
});
