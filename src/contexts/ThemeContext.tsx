import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import {
  getThemePref,
  saveThemePref,
  getFontSizePref,
  saveFontSizePref,
  type ThemePref,
  type FontSizePref,
} from '../lib/storage';

// ─── 色板 tokens ─────────────────────────────────────────────────────────────
// 覆盖 QA 标注的 4 个死角：Tab icon / StatusBar / Toast / SafeAreaView。
// 统一用 semantic name，各页面都从 useTheme() 读 colors.xxx。
export interface ThemeColors {
  bg: string;           // 页面主背景（SafeAreaView / ScrollView）
  text: string;         // 主正文
  subText: string;      // 次级文字（meta / placeholder）
  card: string;         // 卡片背景
  tint: string;         // 品牌主色（orange）
  border: string;       // 分割线 / 边框
  tabBg: string;        // Tab 栏背景（覆盖死角 1）
  tabBorder: string;    // Tab 栏分割线
  tabInactive: string;  // Tab 栏未选中色（覆盖死角 1）
  statusBar: 'dark' | 'light'; // StatusBar 样式（覆盖死角 2）
  toastBg: string;      // Toast 背景（覆盖死角 3）
  toastText: string;    // Toast 文字（覆盖死角 3）
  safeAreaBg: string;   // SafeAreaView 背景（覆盖死角 4）
  inputBg: string;      // 输入框背景
  chipBg: string;       // chip 背景
  chipBorder: string;   // chip 边框
  overlay: string;      // 半透明遮罩
}

// 品牌色固定橘色不变；bg/text/card 在 light/dark 之间切
const LIGHT: ThemeColors = {
  bg: '#FFFDF9',
  text: '#1A1A1A',
  subText: '#666',
  card: '#FFFFFF',
  tint: '#E85D26',
  border: '#F0EDE8',
  tabBg: '#FFFFFF',
  tabBorder: '#F0EDE8',
  tabInactive: '#B0A89E',
  statusBar: 'dark',
  toastBg: '#1A1A1A',
  toastText: '#FFFFFF',
  safeAreaBg: '#FFFDF9',
  inputBg: '#F5F2EE',
  chipBg: '#FFF3EC',
  chipBorder: '#F5D4C2',
  overlay: 'rgba(0,0,0,0.38)',
};

const DARK: ThemeColors = {
  bg: '#12110F',
  text: '#F4EFE8',
  subText: '#9A948B',
  card: '#1E1C19',
  tint: '#FF7A43',
  border: '#2A2723',
  tabBg: '#17151211',
  tabBorder: '#2A2723',
  tabInactive: '#6A635B',
  statusBar: 'light',
  toastBg: '#F4EFE8',
  toastText: '#1A1A1A',
  safeAreaBg: '#12110F',
  inputBg: '#24211D',
  chipBg: '#2A2420',
  chipBorder: '#3A332D',
  overlay: 'rgba(0,0,0,0.58)',
};

// ─── Font scale ─────────────────────────────────────────────────────────────
export const FONT_SCALES: Record<FontSizePref, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.15,
};

// ─── Context shape ──────────────────────────────────────────────────────────
export interface ThemeContextValue {
  theme: ThemePref;                 // 用户选的偏好（light / dark / system）
  effectiveTheme: 'light' | 'dark'; // 实际生效（system 下跟 OS）
  colors: ThemeColors;
  fontSize: FontSizePref;
  fontScale: number;
  setTheme: (v: ThemePref) => Promise<void>;
  setFontSize: (v: FontSizePref) => Promise<void>;
  ready: boolean;                   // 启动时是否已从 AsyncStorage 加载完毕
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null；system 模式下用这个
  const [theme, setThemeState] = useState<ThemePref>('system');
  const [fontSize, setFontSizeState] = useState<FontSizePref>('medium');
  const [ready, setReady] = useState(false);

  // App 启动：从 AsyncStorage 加载
  useEffect(() => {
    (async () => {
      try {
        const [t, f] = await Promise.all([getThemePref(), getFontSizePref()]);
        setThemeState(t);
        setFontSizeState(f);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const effectiveTheme: 'light' | 'dark' = useMemo(() => {
    if (theme === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return theme;
  }, [theme, systemScheme]);

  const colors = effectiveTheme === 'dark' ? DARK : LIGHT;
  const fontScale = FONT_SCALES[fontSize];

  const setTheme = useCallback(async (v: ThemePref) => {
    setThemeState(v);
    await saveThemePref(v);
  }, []);

  const setFontSize = useCallback(async (v: FontSizePref) => {
    setFontSizeState(v);
    await saveFontSizePref(v);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      effectiveTheme,
      colors,
      fontSize,
      fontScale,
      setTheme,
      setFontSize,
      ready,
    }),
    [theme, effectiveTheme, colors, fontSize, fontScale, setTheme, setFontSize, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// ─── Hook ───────────────────────────────────────────────────────────────────
export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // 没裹 Provider 时返回 light 默认，避免崩溃。真实使用一定在 _layout 包了。
    return {
      theme: 'system',
      effectiveTheme: 'light',
      colors: LIGHT,
      fontSize: 'medium',
      fontScale: 1,
      setTheme: async () => {},
      setFontSize: async () => {},
      ready: true,
    };
  }
  return ctx;
};

// 只读 colors（方便某些只关心颜色的场景，少传 fontScale 变化导致的 memo 失效）
export const useThemeColors = (): ThemeColors => useTheme().colors;
