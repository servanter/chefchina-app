import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserBadges, useUserLevel } from '../../src/hooks/useAchievements';
import { changeLanguage } from '../../src/lib/i18n';
import { AppImage } from '../../src/components/AppImage';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useFontScale } from '../../src/hooks/useFontScale';

const COLORS = {
  primary: '#E85D26',
  background: '#FFFDF9',
  text: '#1A1A1A',
  textSecondary: '#666',
  cardBg: '#FFFFFF',
  border: '#F0EDE8',
};

// 静态 COLORS 作为 legacy fallback -- 实际渲染以 useTheme() 为准。
// 这是为了最小化本次 diff:绝大多数 styles 仍走 StyleSheet,但所有出现在页面主层级
// 的 Text/View 颜色会通过内联 style 覆盖,保证 dark 主题生效。

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
}

const StatCard = ({ icon, value, label }: StatCardProps) => {
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={colors.tint} />
      <Text style={[styles.statValue, { color: colors.text, fontSize: scaled(22) }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.subText, fontSize: scaled(12) }]}>{label}</Text>
    </View>
  );
};

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

const MenuRow = ({ icon, label, onPress, trailing, destructive }: MenuRowProps) => {
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  return (
    <TouchableOpacity
      style={[styles.menuRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuLeft}>
        <View
          style={[
            styles.menuIconWrap,
            { backgroundColor: destructive ? '#FFF0E8' : colors.inputBg },
          ]}
        >
          <Ionicons name={icon} size={18} color={destructive ? colors.tint : colors.subText} />
        </View>
        <Text
          style={[
            styles.menuLabel,
            { color: destructive ? colors.tint : colors.text, fontSize: scaled(15) },
          ]}
        >
          {label}
        </Text>
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={16} color={colors.subText} />}
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading, logout, syncLocale } = useAuth();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const isZh = i18n.language === 'zh';
  const [langToggle, setLangToggle] = useState(isZh);
  const [refreshing, setRefreshing] = useState(false);

  // Achievements data
  const { data: userBadges } = useUserBadges(user?.id);
  const { data: levelInfo } = useUserLevel(user?.id);

  const LEVEL_ICONS: Record<number, string> = {
    1: '🥄',
    2: '🍴',
    3: '🔪',
    4: '👨‍🍳',
    5: '🏆',
  };

  useEffect(() => {
    setLangToggle(i18n.language === 'zh');
  }, [i18n.language]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } catch {
      // ignore
    }
    setTimeout(() => setRefreshing(false), 400);
  }, [queryClient]);

  const handleLanguageToggle = async (value: boolean) => {
    setLangToggle(value);
    const newLang = value ? 'zh' : 'en';
    await changeLanguage(newLang);
    // Sync locale to server
    syncLocale(newLang);
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ],
    );
  };

  const avatarUri =
    (user?.avatar_url && user.avatar_url.length > 0)
      ? user.avatar_url
      : `https://i.pravatar.cc/150?u=${user?.id ?? 'guest'}`;
  const displayName = user?.name ?? t('profile.guestName');
  const displayBio = (user?.bio && user.bio.length > 0) ? user.bio : t('profile.bio');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.safeAreaBg }]} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* ─── Header ──────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(26) }]}>
            {t('profile.title')}
          </Text>
        </View>

        {/* ─── Avatar & Name ───────────────────────── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <AppImage
              uri={avatarUri}
              fallback={`https://i.pravatar.cc/150?u=${user?.id ?? 'guest'}`}
              style={[styles.avatar, { borderColor: colors.tint }]}
            />
            {/* 等级图标（右下角） */}
            <View style={[styles.avatarBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.avatarBadgeText}>{LEVEL_ICONS[levelInfo?.level ?? 1] ?? '🥄'}</Text>
            </View>
          </View>
          <Text style={[styles.displayName, { color: colors.text, fontSize: scaled(20) }]}>
            {displayName}
          </Text>
          {/* 等级名称 */}
          {levelInfo && (
            <Text style={[styles.levelBadgeText, { color: colors.tint, fontSize: scaled(12) }]}>
              {t(`achievements.levelNames.${levelInfo.level}`)}
            </Text>
          )}
          <Text style={[styles.bio, { color: colors.subText, fontSize: scaled(13) }]}>
            {displayBio}
          </Text>
          {user?.email ? (
            <Text style={[styles.email, { color: colors.subText, fontSize: scaled(12) }]}>
              {user.email}
            </Text>
          ) : null}
          {isLoggedIn && (
            <TouchableOpacity
              style={[styles.editProfileBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
              onPress={() => router.push('/profile/edit')}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil-outline" size={14} color={colors.tint} />
              <Text style={[styles.editProfileText, { color: colors.tint, fontSize: scaled(13) }]}>
                {t('profile.editProfile')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── 成就徽章展示 ─────────────────────────── */}
        {isLoggedIn && userBadges && userBadges.length > 0 && (
          <View style={[styles.badgesSection, { backgroundColor: colors.card }]}>
            <View style={styles.badgesSectionHeader}>
              <Text style={[styles.badgesSectionTitle, { color: colors.text, fontSize: scaled(15) }]}>
                {t('achievements.recentBadges')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/achievements' as any)}>
                <Text style={[styles.badgesViewAll, { color: colors.tint, fontSize: scaled(13) }]}>
                  {t('achievements.viewAll')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.badgesRow}>
              {userBadges.slice(0, 5).map((badge) => (
                <View key={badge.id} style={[styles.badgeMini, { backgroundColor: colors.chipBg }]}>
                  <Text style={styles.badgeMiniIcon}>{badge.icon}</Text>
                  <Text
                    style={[styles.badgeMiniName, { color: colors.text, fontSize: scaled(11) }]}
                    numberOfLines={1}
                  >
                    {isZh ? badge.nameZh : badge.nameEn}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── Stats ───────────────────────────────── */}
        <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
          <StatCard
            icon="document-text"
            value={user?.recipes_count ?? 0}
            label={isZh ? '发布' : 'Recipes'}
          />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatCard
            icon="heart"
            value={user?.favorites_count ?? 0}
            label={t('profile.favorites')}
          />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatCard
            icon="chatbubble"
            value={user?.comments_count ?? 0}
            label={t('profile.comments')}
          />
        </View>

        {/* ─── 创建菜谱快捷按钮 (REQ-5.3) ─────────────────── */}
        {!authLoading && isLoggedIn && (
          <TouchableOpacity
            style={[styles.createRecipeButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/recipe/create' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={22} color="#FFF" />
            <Text style={[styles.createRecipeText, { fontSize: scaled(15) }]}>
              {isZh ? '创建菜谱' : 'Create Recipe'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ─── Not logged in banner ─────────────────── */}
        {!authLoading && !isLoggedIn && (
          <TouchableOpacity
            style={[styles.loginBanner, { borderLeftColor: colors.tint }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.loginBannerText, { color: colors.text, fontSize: scaled(13) }]}>
              {t('profile.loginPrompt')}
            </Text>
            <Text style={[styles.loginBannerBtn, { color: colors.tint, fontSize: scaled(14) }]}>
              {t('profile.loginButton')} →
            </Text>
          </TouchableOpacity>
        )}

        {/* ─── Menu ────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.card }]}> 
          <MenuRow
            icon="document-text-outline"
            label={t('profile.myRecipes')}
            onPress={() => router.push('/my-recipes')}
          />
          <MenuRow
            icon="notifications-outline"
            label={t('notifications.title')}
            onPress={() => router.push('/notifications')}
          />
          <MenuRow
            icon="trophy-outline"
            label={t('achievements.title')}
            onPress={() => router.push('/achievements' as any)}
          />
          <MenuRow
            icon="time-outline"
            label={t('profile.recentHistory')}
            onPress={() => router.push('/recent-history')}
          />
          <MenuRow
            icon="language-outline"
            label={t('profile.language')}
            trailing={
              <View style={styles.langToggleRow}>
                <Text style={[styles.langLabel, { color: colors.subText }]}>EN</Text>
                <Switch
                  value={langToggle}
                  onValueChange={handleLanguageToggle}
                  trackColor={{ false: '#E0DDD8', true: colors.tint }}
                  thumbColor="#FFFFFF"
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
                <Text style={[styles.langLabel, { color: colors.subText }]}>中</Text>
              </View>
            }
          />
          <MenuRow
            icon="settings-outline"
            label={t('profile.settings')}
            onPress={() => router.push('/settings')}
          />
        </View>

        {!authLoading && isLoggedIn && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <MenuRow
              icon="log-out-outline"
              label={t('profile.logout')}
              onPress={handleLogout}
              destructive
            />
          </View>
        )}

        {/* ─── Version ─────────────────────────────── */}
        <Text style={[styles.version, { color: colors.subText, fontSize: scaled(12) }]}>
          {t('profile.version')} 1.0.0
        </Text>
      </ScrollView>
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarBadgeText: {
    fontSize: 14,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  loginBanner: {
    marginHorizontal: 20,
    backgroundColor: '#FFF0E8',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  loginBannerText: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 6,
  },
  loginBannerBtn: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  section: {
    marginHorizontal: 20,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconDestructive: {
    backgroundColor: '#FFF0E8',
  },
  menuLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuLabelDestructive: {
    color: COLORS.primary,
  },
  langToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    width: 18,
    textAlign: 'center',
  },
  version: {
    textAlign: 'center',
    color: '#CCC',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  levelBadgeText: {
    fontWeight: '600',
    marginBottom: 4,
  },
  badgesSection: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  badgesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgesSectionTitle: {
    fontWeight: '700',
  },
  badgesViewAll: {
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeMini: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  badgeMiniIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeMiniName: {
    fontWeight: '500',
    textAlign: 'center',
  },
  createRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createRecipeText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD4B8',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
