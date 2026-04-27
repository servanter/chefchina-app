import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCard } from '../../src/components/RecipeCard';
import { CategoryChip } from '../../src/components/CategoryChip';
import { SkeletonCard, SkeletonList } from '../../src/components/Skeleton';
import { ListFooter } from '../../src/components/ListFooter';
import { WhatToEatButton } from '../../src/components/WhatToEat';
import { LazyImage } from '../../src/components/LazyImage';
import { useHomeInit } from '../../src/hooks/useRecipes';
import { changeLanguage } from '../../src/lib/i18n';
import { triggerHaptic } from '../../src/lib/haptics';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/hooks/useAuth';

// Fallback values used in StyleSheet.create (static, can't use hooks)
// Dynamic theming applied via inline styles in JSX
const COLORS = {
  primary: '#E85D26',
  background: '#FFFDF9',
  text: '#1A1A1A',
  textSecondary: '#666',
  inputBg: '#F5F2EE',
  white: '#FFFFFF',
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors: themeColors } = useTheme();

  const COLORS = {
    primary: themeColors.tint,
    background: themeColors.bg,
    text: themeColors.text,
    textSecondary: themeColors.subText,
    inputBg: themeColors.inputBg,
    white: themeColors.card,
  };
  // Cap at 390 so grid doesn't overstretch on web
  const effectiveWidth = Math.min(width, 390);
  const isZh = i18n.language === 'zh';

  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: homeData,
    isLoading: homeLoading,
    error: homeError,
    refetch: refetchHome,
  } = useHomeInit(userId, authLoading); // 传入 authLoading

  const unreadCount = homeData?.unreadCount ?? 0;
  const featuredData = homeData?.featured ?? [];
  const quickRecipes = homeData?.quick ?? [];
  const categories = homeData?.categories ?? [];
  const rankingData = homeData?.ranking ?? [];

  const handleLoadMoreQuick = useCallback(() => {
    // BFF 聚合后首页快手菜首屏直接返回固定 6 条，不再需要额外分页请求。
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchHome();
    } finally {
      setRefreshing(false);
      triggerHaptic('light');
    }
  }, [refetchHome]);

  const toggleLanguage = async () => {
    await changeLanguage(isZh ? 'en' : 'zh');
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push({ pathname: '/(tabs)/explore', params: { search: searchText } });
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    router.push({ pathname: '/(tabs)/explore', params: { category: categoryId } });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        onScroll={({ nativeEvent }) => {
          // 滚到底 80% 时自动拉下一页(Quick 列表)
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const reachedEnd =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - contentSize.height * 0.5;
          if (reachedEnd) handleLoadMoreQuick();
        }}
        scrollEventThrottle={250}
      >
        {/* ─── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>{t('home.welcome')}</Text>
            <Text style={styles.subtitleText}>{t('home.subtitle')}</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => router.push('/notifications')}
              accessibilityLabel={t('notifications.title')}
            >
              <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
              <Text style={styles.langBtnText}>🌐</Text>
              <Text style={styles.langBtnLabel}>{isZh ? 'EN' : '中'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Search ──────────────────────────────────────── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('common.search')}
              placeholderTextColor="#AAA"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color="#BBB" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── Categories ──────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={isZh ? cat.label_zh : cat.label}
              isSelected={selectedCategory === cat.id}
              onPress={() => handleCategoryPress(cat.id)}
            />
          ))}
        </ScrollView>

        {/* ─── Following Feed Entry (REQ-11.5) ──────────────────── */}
        {userId && userId !== 'guest' && (
          <TouchableOpacity
            style={styles.followFeedEntry}
            onPress={() => router.push('/follow-feed')}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={20} color={COLORS.primary} />
            <Text style={[styles.followFeedText, { color: COLORS.primary }]}>
              {t('feed.title')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* ─── What to Eat Today? (REQ-9) ──────────────────── */}
        <WhatToEatButton tintColor={COLORS.primary} />

        {/* ─── Featured Recipes ────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.featuredTitle')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {homeLoading ? (
          <FlatList
            data={[0, 1, 2]}
            keyExtractor={(i) => String(i)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
            renderItem={() => (
              <View style={{ width: effectiveWidth * 0.72, marginRight: 12 }}>
                <SkeletonCard />
              </View>
            )}
          />
        ) : (
          <FlatList
            data={featuredData ?? []}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
            renderItem={({ item }) => (
              <RecipeCard
                recipe={item}
                variant="featured"
                onPress={() => router.push(`/recipe/${item.id}`)}
              />
            )}
          />
        )}

        {/* ─── Weekly Hot Ranking (REQ-3) ──────────────────── */}
        {rankingData.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.weeklyHot')}</Text>
              <TouchableOpacity onPress={() => router.push('/ranking')}>
                <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={rankingData.slice(0, 5)}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
              renderItem={({ item, index }) => {
                const rankBadge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
                return (
                  <TouchableOpacity
                    style={styles.rankingCard}
                    onPress={() => router.push(`/recipe/${item.id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>{rankBadge}</Text>
                    </View>
                    <LazyImage uri={item.cover_image} style={styles.rankingImage} />
                    <Text style={styles.rankingTitle} numberOfLines={1}>
                      {isZh ? item.title_zh : item.title}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}

        {/* ─── Quick & Easy ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.quickEasyTitle')}</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/explore', params: { difficulty: 'easy' } })}>
            <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {homeLoading ? (
          <SkeletonList count={6} />
        ) : (
          <>
            <View style={[styles.gridContainer, { maxWidth: effectiveWidth, alignSelf: 'center', width: '100%' }]}> 
              {quickRecipes.map((item) => (
                <RecipeCard
                  key={item.id}
                  recipe={item}
                  variant="grid"
                  onPress={() => router.push(`/recipe/${item.id}`)}
                />
              ))}
            </View>
            {/* 移除 ListFooter，不显示 "End of list" */}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  bellBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  langBtnText: {
    fontSize: 16,
    marginRight: 4,
  },
  langBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
  },
  categoryList: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  featuredList: {
    paddingLeft: 20,
    paddingRight: 8,
    paddingBottom: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  // Ranking card styles (REQ-3)
  rankingCard: {
    width: 130,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 10,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  rankBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rankingImage: {
    width: 130,
    height: 90,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  rankingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  // Following Feed Entry (REQ-11.5)
  followFeedEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  followFeedText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
