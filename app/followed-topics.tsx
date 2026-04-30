import React from 'react';
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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useFollowedTopics, useToggleTopicFollow } from '@/hooks/useTopics';
import { EmptyState } from '@/components/EmptyState';
import Toast from 'react-native-toast-message';

export default function FollowedTopicsPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { data, isLoading, refetch } = useFollowedTopics();
  const toggleFollow = useToggleTopicFollow();

  const isZh = i18n.language === 'zh';

  const handleUnfollow = async (topicId: string) => {
    try {
      await toggleFollow.mutateAsync({ topicId, action: 'unfollow' });
      Toast.show({
        type: 'success',
        text1: isZh ? '已取消关注' : 'Unfollowed'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('common.error')
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isZh ? '我关注的话题' : 'My Followed Topics'}
        </Text>
      </View>

      <FlatList
        data={data?.topics || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.tint} />
        }
        ListEmptyComponent={() =>
          isLoading ? (
            <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
          ) : (
            <EmptyState
              icon="pricetag-outline"
              title={isZh ? '还没有关注话题' : 'No followed topics'}
              description={isZh ? '关注话题后可以快速找到相关菜谱' : 'Follow topics to discover related recipes'}
              actionText={isZh ? '去探索' : 'Explore'}
              onAction={() => router.push('/(tabs)/explore')}
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.topicCard, { borderBottomColor: colors.border }]}
            onPress={() => router.push({ pathname: '/topic/[id]', params: { id: item.id } })}
          >
            <View style={styles.topicInfo}>
              <View style={styles.topicHeader}>
                <Text style={[styles.topicName, { color: colors.text }]}>
                  {item.icon} {isZh ? item.nameZh : item.nameEn}
                </Text>
              </View>
              
              <Text style={[styles.topicStats, { color: colors.subText }]}>
                {item.followerCount.toLocaleString()} {isZh ? '关注' : 'followers'} · {item._count.recipes.toLocaleString()} {isZh ? '菜谱' : 'recipes'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleUnfollow(item.id)}
              style={[styles.unfollowButton, { borderColor: colors.border }]}
              disabled={toggleFollow.isPending}
            >
              {toggleFollow.isPending ? (
                <ActivityIndicator size="small" color={colors.subText} />
              ) : (
                <Text style={[styles.unfollowButtonText, { color: colors.subText }]}>
                  {isZh ? '取消' : 'Unfollow'}
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
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
    padding: 8,
    marginRight: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  content: {
    flexGrow: 1
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  topicInfo: {
    flex: 1
  },
  topicHeader: {
    marginBottom: 4
  },
  topicName: {
    fontSize: 16,
    fontWeight: '600'
  },
  topicStats: {
    fontSize: 14
  },
  unfollowButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center'
  },
  unfollowButtonText: {
    fontSize: 14
  },
  loader: {
    marginTop: 40
  }
});
