import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSearch, SearchType, SearchFilters } from '@/hooks/useSearch';
import { RecipeCard } from '@/components/RecipeCard';
import { EmptyState } from '@/components/EmptyState';
import { Image } from 'expo-image';
import { addSearchHistory } from '@/lib/storage';

type TabId = 'recipe' | 'user' | 'topic';

const TABS: Array<{ id: TabId; label: string; labelZh: string }> = [
  { id: 'recipe', label: 'Recipes', labelZh: '菜谱' },
  { id: 'user', label: 'Users', labelZh: '用户' },
  { id: 'topic', label: 'Topics', labelZh: '话题' },
];

const CATEGORIES = [
  { value: '', label: 'All', labelZh: '全部' },
  { value: 'chinese', label: 'Chinese', labelZh: '中餐' },
  { value: 'western', label: 'Western', labelZh: '西餐' },
  { value: 'baking', label: 'Baking', labelZh: '烘焙' },
  { value: 'dessert', label: 'Dessert', labelZh: '甜品' },
  { value: 'soup', label: 'Soup', labelZh: '汤' },
];

const DIFFICULTIES = [
  { value: '', label: 'All', labelZh: '全部' },
  { value: 'easy', label: 'Easy', labelZh: '简单' },
  { value: 'medium', label: 'Medium', labelZh: '中等' },
  { value: 'hard', label: 'Hard', labelZh: '困难' },
];

const COOK_TIMES = [
  { value: '', label: 'All', labelZh: '全部' },
  { value: '0-30', label: '< 30 min', labelZh: '30分钟内' },
  { value: '30-60', label: '30-60 min', labelZh: '30-60分钟' },
  { value: '60-120', label: '1-2 hours', labelZh: '1-2小时' },
  { value: '120+', label: '> 2 hours', labelZh: '2小时以上' },
];

export default function SearchResultScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const isZh = i18n.language === 'zh';

  const [activeTab, setActiveTab] = useState<TabId>('recipe');
  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [inputQuery, setInputQuery] = useState(params.q || '');

  // Filters (only for recipe tab)
  const [filters, setFilters] = useState<SearchFilters>({
    category: '',
    difficulty: '',
    cookTime: '',
  });

  const { data, isLoading, error, refetch } = useSearch(
    searchQuery,
    activeTab as SearchType,
    activeTab === 'recipe' ? filters : {}
  );

  const handleSearch = useCallback(() => {
    if (!inputQuery.trim()) return;
    setSearchQuery(inputQuery.trim());
    addSearchHistory(inputQuery.trim());
  }, [inputQuery]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const recipes = data?.recipes || [];
  const users = data?.users || [];
  const topics = data?.topics || [];
  const total = data?.total || { recipes: 0, users: 0, topics: 0 };

  const currentResults =
    activeTab === 'recipe' ? recipes : activeTab === 'user' ? users : topics;
  const currentTotal =
    activeTab === 'recipe' ? total.recipes : activeTab === 'user' ? total.users : total.topics;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="search" size={20} color={colors.subText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={isZh ? '搜索菜谱、用户、话题...' : 'Search recipes, users, topics...'}
            placeholderTextColor={colors.subText}
            value={inputQuery}
            onChangeText={setInputQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {inputQuery.length > 0 && (
            <TouchableOpacity onPress={() => setInputQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => handleTabChange(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.subText },
                activeTab === tab.id && { color: colors.tint, fontWeight: '600' },
              ]}
            >
              {isZh ? tab.labelZh : tab.label}
            </Text>
            {activeTab === tab.id && (
              <View style={[styles.tabIndicator, { backgroundColor: colors.tint }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters (only for recipe tab) */}
      {activeTab === 'recipe' && searchQuery && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.filtersContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
          contentContainerStyle={styles.filtersContent}
        >
          {/* Category filter */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>
              {isZh ? '分类' : 'Category'}:
            </Text>
            <View style={styles.filterChips}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    filters.category === cat.value && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => handleFilterChange('category', cat.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.text },
                      filters.category === cat.value && { color: '#fff', fontWeight: '600' },
                    ]}
                  >
                    {isZh ? cat.labelZh : cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Difficulty filter */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>
              {isZh ? '难度' : 'Difficulty'}:
            </Text>
            <View style={styles.filterChips}>
              {DIFFICULTIES.map((diff) => (
                <TouchableOpacity
                  key={diff.value}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    filters.difficulty === diff.value && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => handleFilterChange('difficulty', diff.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.text },
                      filters.difficulty === diff.value && { color: '#fff', fontWeight: '600' },
                    ]}
                  >
                    {isZh ? diff.labelZh : diff.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cook time filter */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>
              {isZh ? '烹饪时间' : 'Cook Time'}:
            </Text>
            <View style={styles.filterChips}>
              {COOK_TIMES.map((time) => (
                <TouchableOpacity
                  key={time.value}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    filters.cookTime === time.value && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => handleFilterChange('cookTime', time.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.text },
                      filters.cookTime === time.value && { color: '#fff', fontWeight: '600' },
                    ]}
                  >
                    {isZh ? time.labelZh : time.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Results count */}
      {searchQuery && !isLoading && (
        <View style={[styles.resultsHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.resultsCount, { color: colors.subText }]}>
            {isZh
              ? `找到 ${currentTotal} 个结果`
              : `${currentTotal} result${currentTotal !== 1 ? 's' : ''} found`}
          </Text>
        </View>
      )}

      {/* Results */}
      <ScrollView
        style={styles.results}
        contentContainerStyle={styles.resultsContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.tint} />
        }
      >
        {!searchQuery ? (
          <EmptyState
            icon="search"
            title={isZh ? '输入关键词开始搜索' : 'Enter keywords to search'}
            subtitle={isZh ? '搜索菜谱、用户或话题' : 'Search for recipes, users, or topics'}
          />
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : error ? (
          <EmptyState
            icon="alert-circle"
            title={isZh ? '搜索失败' : 'Search failed'}
            subtitle={isZh ? '请稍后重试' : 'Please try again later'}
          />
        ) : currentResults.length === 0 ? (
          <EmptyState
            icon="search"
            title={isZh ? '未找到结果' : 'No results found'}
            subtitle={isZh ? '尝试使用其他关键词' : 'Try different keywords'}
          />
        ) : (
          <>
            {/* Recipe results */}
            {activeTab === 'recipe' &&
              recipes.map((recipe) => (
                <View key={recipe.id} style={styles.recipeCard}>
                  <RecipeCard
                    recipe={recipe}
                    variant="list"
                    onPress={() => router.push(`/recipe/${recipe.id}`)}
                  />
                </View>
              ))}

            {/* User results */}
            {activeTab === 'user' &&
              users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/user/${user.id}`)}
                >
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.userAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.userAvatar, styles.userAvatarPlaceholder, { backgroundColor: colors.inputBg }]}>
                      <Ionicons name="person" size={32} color={colors.subText} />
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                    {user.bio && (
                      <Text style={[styles.userBio, { color: colors.subText }]} numberOfLines={2}>
                        {user.bio}
                      </Text>
                    )}
                    <View style={styles.userStats}>
                      <Text style={[styles.userStat, { color: colors.subText }]}>
                        {user.recipes_count} {isZh ? '菜谱' : 'recipes'}
                      </Text>
                      <Text style={[styles.userStatDot, { color: colors.subText }]}>·</Text>
                      <Text style={[styles.userStat, { color: colors.subText }]}>
                        {user.followers_count} {isZh ? '粉丝' : 'followers'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.subText} />
                </TouchableOpacity>
              ))}

            {/* Topic results */}
            {activeTab === 'topic' &&
              topics.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  style={[styles.topicCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/topic/${topic.id}`)}
                >
                  <View style={styles.topicIcon}>
                    <Ionicons name="pricetag" size={24} color={colors.tint} />
                  </View>
                  <View style={styles.topicInfo}>
                    <Text style={[styles.topicName, { color: colors.text }]}>
                      #{isZh ? topic.name_zh : topic.name}
                    </Text>
                    {topic.description && (
                      <Text style={[styles.topicDesc, { color: colors.subText }]} numberOfLines={2}>
                        {isZh ? topic.description_zh : topic.description}
                      </Text>
                    )}
                    <View style={styles.topicStats}>
                      <Text style={[styles.topicStat, { color: colors.subText }]}>
                        {topic.recipes_count} {isZh ? '菜谱' : 'recipes'}
                      </Text>
                      <Text style={[styles.topicStatDot, { color: colors.subText }]}>·</Text>
                      <Text style={[styles.topicStat, { color: colors.subText }]}>
                        {topic.followers_count} {isZh ? '关注' : 'followers'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.subText} />
                </TouchableOpacity>
              ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  filtersContainer: {
    maxHeight: 200,
    borderBottomWidth: 1,
  },
  filtersContent: {
    padding: 12,
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  recipeCard: {
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userStat: {
    fontSize: 13,
  },
  userStatDot: {
    fontSize: 13,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicInfo: {
    flex: 1,
    gap: 4,
  },
  topicName: {
    fontSize: 16,
    fontWeight: '600',
  },
  topicDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  topicStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicStat: {
    fontSize: 13,
  },
  topicStatDot: {
    fontSize: 13,
  },
});
