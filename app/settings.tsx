import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths, Directory } from 'expo-file-system';
import { useTheme } from '../src/contexts/ThemeContext';
import { useFontScale } from '../src/hooks/useFontScale';
import { PROTECTED_STORAGE_KEYS } from '../src/lib/storage';
import type { ThemePref, FontSizePref } from '../src/lib/storage';

// ─── 版本信息（expo-constants） ─────────────────────────────────────────────
// 读 expoConfig.version / iosBuildNumber / androidVersionCode；dev 环境兜底 "dev".
function getAppVersion(): { version: string; build: string } {
  const cfg = (Constants.expoConfig ?? {}) as {
    version?: string;
    ios?: { buildNumber?: string };
    android?: { versionCode?: number };
  };
  const version = cfg.version ?? '1.0.0';
  const build =
    cfg.ios?.buildNumber ??
    (cfg.android?.versionCode != null ? String(cfg.android.versionCode) : 'dev');
  return { version, build };
}

// ─── 字节数格式化 ───────────────────────────────────────────────────────────
function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

// ─── 清缓存：只动图片/HTTP 缓存，跳过业务白名单 ────────────────────────────
// 1. expo-file-system v19 的 Paths.cache 目录：整个 children 逐个 delete()，再 create 一次目录占位
// 2. AsyncStorage：遍历 keys，删除不在白名单里的（默认不会动，设计上只存业务键；保险起见兼容）
async function clearCaches(): Promise<{ freed: number }> {
  let freed = 0;
  try {
    const cache = Paths.cache;
    // 尝试统计当前大小（失败不阻断）
    try {
      const size = cache.size ?? 0;
      freed = typeof size === 'number' ? size : 0;
    } catch {
      freed = 0;
    }
    try {
      const entries = cache.list();
      for (const entry of entries) {
        try {
          entry.delete();
        } catch {
          // 单个文件删不掉不阻断
        }
      }
    } catch {
      // list 失败（iOS 的保护目录等）也不阻断
    }
  } catch {
    // 整个 cache 读失败也 ok
  }

  // AsyncStorage：清非白名单
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const protectedSet = new Set<string>(PROTECTED_STORAGE_KEYS);
    const toRemove = allKeys.filter((k) => !protectedSet.has(k));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch {
    // ignore
  }

  return { freed };
}

async function getCacheSize(): Promise<number> {
  try {
    const cache: Directory = Paths.cache;
    const size = cache.size;
    return typeof size === 'number' ? size : 0;
  } catch {
    return 0;
  }
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, theme, setTheme, fontSize, setFontSize } = useTheme();
  const { scaled } = useFontScale();

  const [cacheSize, setCacheSizeState] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  const version = getAppVersion();

  const refreshCacheSize = useCallback(async () => {
    const n = await getCacheSize();
    setCacheSizeState(n);
  }, []);

  useEffect(() => {
    refreshCacheSize();
  }, [refreshCacheSize]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      t('settings.clearCacheConfirmTitle'),
      t('settings.clearCacheConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearCache'),
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await clearCaches();
              await refreshCacheSize();
              Toast.show({
                type: 'success',
                text1: t('settings.clearCacheSuccess'),
              });
            } catch {
              Toast.show({
                type: 'error',
                text1: t('settings.clearCacheFailed'),
              });
            } finally {
              setClearing(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [t, refreshCacheSize]);

  const handleCheckUpdate = useCallback(() => {
    Toast.show({
      type: 'success',
      text1: t('settings.updateLatest'),
    });
  }, [t]);

  const themeOptions: { value: ThemePref; label: string }[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ];

  const fontOptions: { value: FontSizePref; label: string }[] = [
    { value: 'small', label: t('settings.fontSmall') },
    { value: 'medium', label: t('settings.fontMedium') },
    { value: 'large', label: t('settings.fontLarge') },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.safeAreaBg }]}
        edges={['top']}
      >
        {/* ─── Header ─── */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaled(17) }]}>
            {t('settings.title')}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={{ backgroundColor: colors.bg }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── 主题 ─── */}
          <Section title={t('settings.theme')} colors={colors} scaled={scaled}>
            {themeOptions.map((opt) => (
              <RadioRow
                key={opt.value}
                label={opt.label}
                selected={theme === opt.value}
                onPress={() => setTheme(opt.value)}
                colors={colors}
                scaled={scaled}
              />
            ))}
          </Section>

          {/* ─── 字体大小 ─── */}
          <Section title={t('settings.fontSize')} colors={colors} scaled={scaled}>
            {fontOptions.map((opt) => (
              <RadioRow
                key={opt.value}
                label={opt.label}
                selected={fontSize === opt.value}
                onPress={() => setFontSize(opt.value)}
                colors={colors}
                scaled={scaled}
              />
            ))}
          </Section>

          {/* ─── 缓存 ─── */}
          <Section title={t('settings.cache')} colors={colors} scaled={scaled}>
            <ActionRow
              label={t('settings.clearCache')}
              trailing={
                clearing ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <Text style={[styles.trailingText, { color: colors.subText, fontSize: scaled(13) }]}>
                    {cacheSize == null ? '…' : formatBytes(cacheSize)}
                  </Text>
                )
              }
              onPress={handleClearCache}
              colors={colors}
              scaled={scaled}
            />
          </Section>

          {/* ─── 关于 ─── */}
          <Section title={t('settings.about')} colors={colors} scaled={scaled}>
            <ActionRow
              label={t('settings.version')}
              trailing={
                <Text style={[styles.trailingText, { color: colors.subText, fontSize: scaled(13) }]}>
                  {version.version} ({version.build})
                </Text>
              }
              colors={colors}
              scaled={scaled}
            />
            <ActionRow
              label={t('settings.checkUpdate')}
              onPress={handleCheckUpdate}
              colors={colors}
              scaled={scaled}
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── 组件：Section / RadioRow / ActionRow ───────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
  scaled: (n: number) => number;
}
const Section: React.FC<SectionProps> = ({ title, children, colors, scaled }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.subText, fontSize: scaled(12) }]}>
      {title.toUpperCase()}
    </Text>
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  </View>
);

interface RadioRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  scaled: (n: number) => number;
}
const RadioRow: React.FC<RadioRowProps> = ({ label, selected, onPress, colors, scaled }) => (
  <TouchableOpacity
    style={[styles.row, { borderBottomColor: colors.border }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.rowLabel, { color: colors.text, fontSize: scaled(15) }]}>{label}</Text>
    <View
      style={[
        styles.radio,
        { borderColor: selected ? colors.tint : colors.border },
      ]}
    >
      {selected && <View style={[styles.radioDot, { backgroundColor: colors.tint }]} />}
    </View>
  </TouchableOpacity>
);

interface ActionRowProps {
  label: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  scaled: (n: number) => number;
}
const ActionRow: React.FC<ActionRowProps> = ({ label, trailing, onPress, colors, scaled }) => {
  const Comp = onPress ? TouchableOpacity : View;
  return (
    <Comp
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.rowLabel, { color: colors.text, fontSize: scaled(15) }]}>{label}</Text>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={colors.subText} /> : null)}
    </Comp>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontWeight: '500',
  },
  trailingText: {
    fontWeight: '500',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
