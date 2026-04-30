import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCard } from '../../src/components/RecipeCard';
import { CategoryChip } from '../../src/components/CategoryChip';
import { EmptyState } from '../../src/components/EmptyState';
import { RecipeSkeletonList } from '../../src/components/RecipeSkeleton';
import { ListFooter } from '../../src/components/ListFooter';
import { useInfiniteRecipes, useCategories, useTags } from '../../src/hooks/useRecipes';
import { useSearchTrending } from '../../src/hooks/useSearchTrending';
import { useRecipeSearch } from '../../src/hooks/useRecipeSearch';
import { DIFFICULTIES } from '../../src/lib/mockData';
import { logSearch, fetchRecipeTrending, TrendingItem } from '../../src/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  getSearchHistory,
  saveSearchHistory,
  removeSearchHistoryItem,
  clearSearchHistory,
} from '../../src/lib/storage';

const COLORS = {
  primary: '#E85D26',
  background: '#FFFDF9',
  text: '#1A1A1A',
  textSecondary: '#666',
  inputBg: '#F5F2EE',
  chipBg: '#FFF3EC',
  chipBorder: '#F5D4C2',
  divider: '#EEE7DF',
};

export default function ExploreScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    difficulty?: string;
    search?: string;
    tag?: string;
    tagId?: string;
  }>();
  const isZh = i18n.language === 'zh';

  // searchText：输入框实时值（未提交）
  // committedQuery：用户真正提交的查询（回车 / 点击 chip），驱动 useRecipeSearch
  const [searchText, setSearchText] = useState(params.search ?? '');
  const [committedQuery, setCommittedQuery] = useState(params.search?.trim() ?? '');
  const [selectedCategory, setSelectedCategory] = useState(params.category ?? 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState(params.difficulty ?? 'all');
  const [selectedTag, setSelectedTag] = useState<string | undefined>(params.tagId);
  const [selectedSort, setSelectedSort] = useState<'recommended' | 'latest' | 'popular'>('recommended');
  const [refreshing, setRefreshing] = useState(false);
  const [hideSearchChrome, setHideSearchChrome] = useState(false);
  const lastScrollY = useRef(0);

  // ─── Search Panel state (FEAT-20260422-23) ─────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [trendingWindow, setTrendingWindow] = useState<'24h' | '7d'>('24h');
  const { data: trending = [] } = useSearchTrending(trendingWindow);
  // 空态兜底 chips 改用新接口 /api/search/trending（SQL + Redis 5min），
  // 与搜索面板的 Redis 实时榜并存做对比。
  const { data: trendingV2 = [] } = useQuery<TrendingItem[]>({
    queryKey: ['recipe-trending-v2'],
    queryFn: fetchRecipeTrending,
    staleTime: 1000 * 60 * 5,
  });
  const inputRef = useRef<TextInput>(null);

  // 挂载时读取本地历史
  useEffect(() => {
    getSearchHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  // ─── 两套数据源 ────────────────────────────────────────────────────────────
  // - 提交过搜索词 → 走 /api/recipes/search（cursor 分页）
  // - 没有搜索词   → 走 /api/recipes 列表筛选（category/difficulty/tag）
  const isSearchMode = committedQuery.length > 0;

  const filterQuery = useInfiniteRecipes({
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
    sort: selectedSort,
    tagId: selectedTag,
  });
  const searchQuery = useRecipeSearch(isSearchMode ? committedQuery : '');

  const activeQuery = isSearchMode ? searchQuery : filterQuery;
  const {
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = activeQuery;
  const data = activeQuery.data;

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  useEffect(() => {
    if (params.category) setSelectedCategory(params.category);
    if (params.difficulty) setSelectedDifficulty(params.difficulty);
    if (params.search) {
      setSearchText(params.search);
      setCommittedQuery(params.search.trim());
    }
    // Prefer tagId (stable identifier); fall back to tag label for backward compat
    if (params.tagId) {
      setSelectedTag(params.tagId);
    } else if (params.tag) {
      const found = tags.find((tg) => tg.label === params.tag || tg.label_zh === params.tag);
      if (found) setSelectedTag(found.id);
    }
  }, [params.category, params.difficulty, params.search, params.tag, params.tagId, tags]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const recipes = useMemo(() => {
    if (!data) return [];
    // 两套 query 返回结构不同，但都有 .pages[].data : Recipe[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.pages as Array<{ data: any[] }>).flatMap((p) => p.data);
  }, [data]);

  // total：两种 query 字段结构不同
  const total = isSearchMode
    ? (searchQuery.data?.pages?.[0]?.total ?? recipes.length)
    : (filterQuery.data?.pages?.[0]?.pagination.total ?? 0);

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // ─── Search panel handlers ─────────────────────────────────────────────────

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    Keyboard.dismiss();
    inputRef.current?.blur();
  }, []);

  const commitSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;
      setSearchText(q);
      setCommittedQuery(q);
      closePanel();
      try {
        const next = await saveSearchHistory(q);
        setHistory(next);
      } catch {
        /* ignore */
      }
      // 火一次埋点 —— 失败不阻断（写 Redis 版 trending，与 /api/recipes/search 自写 SearchLog 并存）
      logSearch(q);
    },
    [closePanel],
  );

  const handleSubmitEditing = useCallback(() => {
    commitSearch(searchText);
  }, [commitSearch, searchText]);

  const handleRemoveHistory = useCallback(async (item: string) => {
    const next = await removeSearchHistoryItem(item);
    setHistory(next);
  }, []);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      t('search.clearConfirm'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('search.clearAll'),
          style: 'destructive',
          onPress: async () => {
            await clearSearchHistory();
            setHistory([]);
          },
        },
      ],
      { cancelable: true },
    );
  }, [t]);

  const handleChipPress = useCallback(
    (q: string) => {
      commitSearch(q);
    },
    [commitSearch],
  );

  // 清除搜索：回到筛选列表模式
  const clearSearch = useCallback(() => {
    setSearchText('');
    setCommittedQuery('');
  }, []);

  // ─── Empty state suggestions（空态推荐分类）────────────────────────────────
  const suggestedCategories = useMemo(() => {
    return categories
      .filter((c) => c.id !== 'all')
      .slice()
      .sort((a, b) => b.recipesCount - a.recipesCount)
      .slice(0, 3);
  }, [categories]);

  const handleSuggestNew = useCallback(() => {
    Alert.alert(t('search.suggestNew'), searchText.trim());
  }, [t, searchText]);

  const showEmpty = !isLoading && recipes.length === 0;
  const hasSearchQuery = isSearchMode;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ─── Header ─────────────────────────────────── */}
      {!hideSearchChrome && (
        <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('explore.title')}</Text>
      </View>

      {/* ─── Search ─────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, panelOpen && styles.searchBoxFocused]}>
          <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t('common.search')}
            placeholderTextColor="#AAA"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onFocus={() => setPanelOpen(true)}
            onSubmitEditing={handleSubmitEditing}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                if (!panelOpen) clearSearch();
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color="#BBB" />
            </TouchableOpacity>
          )}
          {panelOpen && (
            <TouchableOpacity
              onPress={closePanel}
              hitSlop={8}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
        </>
      )}

      {/* ─── Search Panel（展开时覆盖筛选 + 列表）───────────────────────────── */}
      {panelOpen ? (
        <ScrollView
          style={styles.panel}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.panelContent}
        >
          {/* Recent */}
          {history.length > 0 && (
            <View style={styles.panelSection}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>{t('search.recent')}</Text>
                <TouchableOpacity onPress={handleClearHistory} hitSlop={6}>
                  <Text style={styles.clearAllText}>{t('search.clearAll')}</Text>
                </TouchableOpacity>
              </View>
              {history.map((item) => (
                <View key={item} style={styles.historyRow}>
                  <TouchableOpacity
                    style={styles.historyTapArea}
                    onPress={() => handleChipPress(item)}
                  >
                    <Ionicons name="time-outline" size={16} color="#999" />
                    <Text style={styles.historyText} numberOfLines={1}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveHistory(item)}
                    hitSlop={10}
                    style={styles.historyRemove}
                  >
                    <Ionicons name="close" size={16} color="#BBB" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Trending */}
          <View style={styles.panelSection}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{t('search.trending')}</Text>
              <View style={styles.windowTabs}>
                <TouchableOpacity
                  onPress={() => setTrendingWindow('24h')}
                  style={[
                    styles.windowTab,
                    trendingWindow === '24h' && styles.windowTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.windowTabText,
                      trendingWindow === '24h' && styles.windowTabTextActive,
                    ]}
                  >
                    {t('search.trending24h')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTrendingWindow('7d')}
                  style={[
                    styles.windowTab,
                    trendingWindow === '7d' && styles.windowTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.windowTabText,
                      trendingWindow === '7d' && styles.windowTabTextActive,
                    ]}
                  >
                    {t('search.trending7d')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {trending.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trendingRow}
              >
                {trending.slice(0, 10).map((item, idx) => (
                  <TouchableOpacity
                    key={item.query}
                    style={styles.trendingChip}
                    onPress={() => handleChipPress(item.query)}
                  >
                    <Text
                      style={[
                        styles.trendingRank,
                        idx < 3 && styles.trendingRankHot,
                      ]}
                    >
                      {idx + 1}
                    </Text>
                    <Text style={styles.trendingText} numberOfLines={1}>
                      {item.query}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.panelEmpty}>{t('common.noData')}</Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <>
          {/* 筛选区仅在「非搜索模式」下显示 */}
          {!isSearchMode && !hideSearchChrome && (
            <>
              {/* ─── Category Filter ─────────────────────────── */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('explore.filterCategory')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
                  {categories.map((cat) => (
                    <CategoryChip
                      key={cat.id}
                      label={isZh ? cat.label_zh : cat.label}
                      isSelected={selectedCategory === cat.id}
                      onPress={() => setSelectedCategory(cat.id)}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* ─── Difficulty Filter ───────────────────────── */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('explore.filterDifficulty')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
                  {DIFFICULTIES.map((d) => (
                    <CategoryChip
                      key={d.id}
                      label={isZh ? d.label_zh : d.label}
                      isSelected={selectedDifficulty === d.id}
                      onPress={() => setSelectedDifficulty(d.id)}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* ─── Tag Filter ─────────────────────────────── */}
              {tags.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>{t('explore.filterTags')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
                    {tags.map((tg) => (
                      <CategoryChip
                        key={tg.id}
                        label={isZh ? tg.label_zh : tg.label}
                        isSelected={selectedTag === tg.id}
                        onPress={() => setSelectedTag(selectedTag === tg.id ? undefined : tg.id)}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}

          {/* ─── 搜索模式：标题栏，显示当前查询 + 清除按钮 ─── */}
          {isSearchMode && (
            <View style={styles.searchModeBar}>
              <Text style={styles.searchModeText} numberOfLines={1}>
                {t('search.resultsFor', { query: committedQuery })}
              </Text>
              <TouchableOpacity onPress={clearSearch} hitSlop={8}>
                <Text style={styles.searchModeClear}>{t('search.clearQuery')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isSearchMode && (
            <View style={styles.sortRow}>
              {[
                { key: 'recommended', label: isZh ? '综合' : 'Recommended' },
                { key: 'latest', label: isZh ? '最新' : 'Latest' },
                { key: 'popular', label: isZh ? '最热' : 'Popular' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.sortChip,
                    selectedSort === item.key && styles.sortChipActive,
                  ]}
                  onPress={() => setSelectedSort(item.key as 'recommended' | 'latest' | 'popular')}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      selectedSort === item.key && styles.sortChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ─── Results count ──────────────────────────── */}
          {!isLoading && (
            <View style={styles.resultRow}>
              <Text style={styles.resultText}>
                {t('explore.resultsCount', { count: total })}
              </Text>
            </View>
          )}

          {/* ─── Recipe List ────────────────────────────── */}
          {isLoading ? (
            <View style={styles.list}>
              <RecipeSkeletonList count={5} variant="list" />
            </View>
          ) : showEmpty ? (
            <ScrollView
              contentContainerStyle={styles.emptyScroll}
              showsVerticalScrollIndicator={false}
            >
              <EmptyState
                icon="search-outline"
                title={
                  hasSearchQuery
                    ? t('search.noResults', { query: committedQuery })
                    : t('explore.noResults')
                }
                subtitle={
                  hasSearchQuery
                    ? t('search.noResultsHint')
                    : t('explore.noResultsHint')
                }
              />
              {/* 空态兜底：热词 chips（改用新接口 /api/search/trending SQL+Redis 5min 版本） */}
              {hasSearchQuery && trendingV2.length > 0 && (
                <View style={styles.suggestWrap}>
                  <Text style={styles.suggestTitle}>{t('search.tryTrending')}</Text>
                  <View style={styles.suggestChips}>
                    {trendingV2.slice(0, 6).map((item) => (
                      <TouchableOpacity
                        key={item.query}
                        style={styles.suggestChip}
                        onPress={() => handleChipPress(item.query)}
                      >
                        <Text style={styles.suggestChipText}>{item.query}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {hasSearchQuery && suggestedCategories.length > 0 && (
                <View style={styles.suggestWrap}>
                  <Text style={styles.suggestTitle}>
                    {t('search.suggestedCategories')}
                  </Text>
                  <View style={styles.suggestChips}>
                    {suggestedCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.suggestChip}
                        onPress={() => {
                          setSelectedCategory(cat.id);
                          clearSearch();
                        }}
                      >
                        <Text style={styles.suggestChipText}>
                          {isZh ? cat.label_zh : cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.suggestNewBtn}
                    onPress={handleSuggestNew}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.suggestNewText}>
                      {t('search.suggestNew')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : (
            <FlatList
              data={recipes}
              onScroll={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                const delta = y - lastScrollY.current;
                lastScrollY.current = y;
                if (!panelOpen && !isSearchMode) {
                  if (y > 180 && delta > 8 && !hideSearchChrome) setHideSearchChrome(true);
                  if ((delta < -8 && y < 220) || y < 60) {
                    if (hideSearchChrome) setHideSearchChrome(false);
                  }
                }
              }}
              scrollEventThrottle={16}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                <ListFooter
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={!!hasNextPage}
                  error={error}
                  onRetry={() => fetchNextPage()}
                  hasItems={recipes.length > 0}
                />
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
              }
              renderItem={({ item }) => (
                <RecipeCard
                  recipe={item}
                  variant="list"
                  onPress={() => router.push(`/recipe/${item.id}`)}
                />
              )}
            />
          )}
        </>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchBoxFocused: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
  },
  cancelBtn: {
    marginLeft: 10,
  },
  cancelText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterSection: {
    paddingLeft: 20,
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipList: {
    paddingRight: 20,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 6,
  },
  sortChip: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sortChipActive: {
    backgroundColor: COLORS.primary,
  },
  sortChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#FFF',
  },
  resultRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resultText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  searchModeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.chipBg,
    borderRadius: 10,
  },
  searchModeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    marginRight: 8,
  },
  searchModeClear: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // ─── Panel ────────────────────────────────────────────────────────────────
  panel: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  panelContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  panelSection: {
    marginBottom: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearAllText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  panelEmpty: {
    fontSize: 13,
    color: '#AAA',
    paddingVertical: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  historyTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 10,
  },
  historyRemove: {
    padding: 6,
  },
  windowTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    padding: 2,
  },
  windowTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  windowTabActive: {
    backgroundColor: '#FFF',
  },
  windowTabText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  windowTabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  trendingRow: {
    paddingRight: 20,
    gap: 8,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.chipBg,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  trendingRank: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  trendingRankHot: {
    color: COLORS.primary,
  },
  trendingText: {
    fontSize: 13,
    color: COLORS.text,
    maxWidth: 160,
  },
  // ─── Empty state ──────────────────────────────────────────────────────────
  emptyScroll: {
    paddingBottom: 40,
  },
  suggestWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  suggestTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  suggestChip: {
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestChipText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  suggestNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
    backgroundColor: '#FFF',
  },
  suggestNewText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
});
