import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/hooks/useAuth';
import { useBadges, useUserBadges, useUserLevel, useCheckAchievements } from '../src/hooks/useAchievements';
import { useTheme } from '../src/contexts/ThemeContext';
import { useFontScale } from '../src/hooks/useFontScale';
import BadgeUnlockModal from '../src/components/BadgeUnlockModal';
import LevelUpModal from '../src/components/LevelUpModal';
import type { Badge } from '../src/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BADGE_SIZE = (SCREEN_WIDTH - 40 - 24) / 3; // 3 列，间距 12

const LEVEL_ICONS: Record<number, string> = {
  1: '🥄',
  2: '🍴',
  3: '🔪',
  4: '👨‍🍳',
  5: '🏆',
};

const TABS = ['all', 'cooking', 'social', 'milestone'] as const;
type Tab = (typeof TABS)[number];

export default function AchievementsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const isZh = i18n.language === 'zh';

  const userId = user?.id ?? null;
  const { data: allBadges, refetch: refetchBadges } = useBadges();
  const { data: userBadges, refetch: refetchUserBadges } = useUserBadges(userId);
  const { data: levelInfo, refetch: refetchLevel } = useUserLevel(userId);
  const checkMutation = useCheckAchievements();

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState<Badge[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const [prevLevel, setPrevLevel] = useState<number | null>(null);

  // 进入页面时静默检查
  useEffect(() => {
    if (userId) {
      // 缓存当前 level 用于对比
      const currentLevel = levelInfo?.level ?? 1;
      setPrevLevel(currentLevel);

      checkMutation.mutate(userId, {
        onSuccess: async (newBadges) => {
          // BUG-006 fix: 多弹窗排队
          if (newBadges.length > 0) {
            setUnlockQueue(newBadges);
          }
          // BUG-004 fix: 检查升级
          await refetchLevel();
        },
      });
    }
  }, [userId]);

  const unlockedMap = new Map(
    (userBadges ?? []).map((ub) => [ub.id, ub.unlockedAt]),
  );

  const filteredBadges = (allBadges ?? []).filter((b) => {
    if (activeTab === 'all') return true;
    return b.category === activeTab;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBadges(), refetchUserBadges(), refetchLevel()]);
    setRefreshing(false);
  }, [refetchBadges, refetchUserBadges, refetchLevel]);

  const tabLabelMap: Record<Tab, string> = {
    all: t('achievements.tabAll'),
    cooking: t('achievements.tabCooking'),
    social: t('achievements.tabSocial'),
    milestone: t('achievements.tabMilestone'),
  };

  const renderBadge = ({ item }: { item: Badge }) => {
    const isUnlocked = unlockedMap.has(item.id);
    const unlockedAt = unlockedMap.get(item.id);

    return (
      <View
        style={[
          styles.badgeCard,
          {
            backgroundColor: colors.card,
            opacity: isUnlocked ? 1 : 0.45,
            borderColor: isUnlocked ? colors.tint : colors.border,
          },
        ]}
      >
        <Text style={[styles.badgeIcon, { fontSize: isUnlocked ? 36 : 30 }]}>
          {item.icon}
        </Text>
        <Text
          style={[styles.badgeName, { color: colors.text, fontSize: scaled(12) }]}
          numberOfLines={1}
        >
          {isZh ? item.nameZh : item.nameEn}
        </Text>
        <Text
          style={[styles.badgeDesc, { color: colors.subText, fontSize: scaled(10) }]}
          numberOfLines={2}
        >
          {isZh ? item.descZh : item.descEn}
        </Text>
        {isUnlocked && unlockedAt ? (
          <Text style={[styles.badgeDate, { color: colors.tint, fontSize: scaled(9) }]}>
            {new Date(unlockedAt).toLocaleDateString()}
          </Text>
        ) : (
          <Text style={[styles.badgeDate, { color: colors.subText, fontSize: scaled(9) }]}>
            {t('achievements.locked')}
          </Text>
        )}
      </View>
    );
  };

  const level = levelInfo?.level ?? 1;
  const xp = levelInfo?.xp ?? 0;
  const nextXp = levelInfo?.nextLevelXp;
  const progress = levelInfo?.progress ?? 0;
  const levelIcon = LEVEL_ICONS[level] ?? '🥄';
  const levelName = t(`achievements.levelNames.${level}`);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.safeAreaBg }]} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* 返回按钮 + 标题 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(20) }]}>
            {t('achievements.title')}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* 等级卡片 */}
        <View style={[styles.levelCard, { backgroundColor: colors.card }]}>
          <Text style={styles.levelIcon}>{levelIcon}</Text>
          <Text style={[styles.levelName, { color: colors.text, fontSize: scaled(20) }]}>
            {levelName}
          </Text>
          <Text style={[styles.levelLabel, { color: colors.subText, fontSize: scaled(13) }]}>
            {t('achievements.levelCard', { level })}
          </Text>

          {/* XP 进度条 */}
          <View style={[styles.xpBarOuter, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.xpBarInner,
                {
                  backgroundColor: colors.tint,
                  width: `${Math.round(progress * 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.xpText, { color: colors.subText, fontSize: scaled(12) }]}>
            {nextXp
              ? t('achievements.xpProgress', { current: xp, next: nextXp })
              : t('achievements.xpMax')}
          </Text>
        </View>

        {/* Tab 切换 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabRow}
          contentContainerStyle={styles.tabRowContent}
        >
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? colors.tint : colors.chipBg,
                    borderColor: isActive ? colors.tint : colors.chipBorder,
                  },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive ? '#FFF' : colors.text,
                      fontSize: scaled(13),
                    },
                  ]}
                >
                  {tabLabelMap[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 徽章网格 */}
        <View style={styles.badgeGrid}>
          {filteredBadges.map((badge) => (
            <View key={badge.id} style={{ width: BADGE_SIZE }}>
              {renderBadge({ item: badge })}
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <BadgeUnlockModal
        badge={unlockQueue[0] ?? null}
        visible={unlockQueue.length > 0}
        onClose={() => {
          setUnlockQueue(prev => {
            const rest = prev.slice(1);
            // BUG-004: 队列清空后，检查是否需要弹升级窗
            if (rest.length === 0) {
              const currentLevel = levelInfo?.level ?? 1;
              if (prevLevel !== null && currentLevel > prevLevel) {
                setNewLevel(currentLevel);
                setShowLevelUp(true);
              }
            }
            return rest;
          });
        }}
      />
      <LevelUpModal
        visible={showLevelUp}
        newLevel={newLevel}
        onClose={() => setShowLevelUp(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontWeight: '700' },

  levelCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  levelIcon: { fontSize: 48, marginBottom: 8 },
  levelName: { fontWeight: '800', marginBottom: 4 },
  levelLabel: { marginBottom: 12 },
  xpBarOuter: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpBarInner: { height: '100%', borderRadius: 5 },
  xpText: {},

  tabRow: { marginBottom: 12 },
  tabRowContent: { paddingHorizontal: 20, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontWeight: '600' },

  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  badgeCard: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 130,
  },
  badgeIcon: { marginBottom: 6 },
  badgeName: { fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  badgeDesc: { textAlign: 'center', lineHeight: 14, marginBottom: 4 },
  badgeDate: { fontWeight: '500' },
});
