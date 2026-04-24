import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, BaseToastProps } from 'react-native-toast-message';
import { initI18n } from '../src/lib/i18n';
import i18n from '../src/lib/i18n';
import { getOnboardingDone } from '../src/lib/storage';
import { isNetworkError } from '../src/lib/api';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 网络错误不在 React Query 层重试（axios 拦截器已负责 2 次重试）；
      // 其他错误最多重试 2 次。
      retry: (failureCount, error) => {
        if (isNetworkError(error)) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AppNavigator() {
  const [checked, setChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    getOnboardingDone().then((done) => {
      setOnboardingDone(!!done);
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <Stack
      initialRouteName={onboardingDone ? '(tabs)' : 'onboarding'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen
        name="recipe/[id]"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="auth/login"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="auth/register"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

// ThemedShell：在 ThemeProvider 里消费 colors，绘制 StatusBar + Web 包装
function ThemedShell() {
  const { colors } = useTheme();
  // BUG-003 修复：Toast 组件跟主题色 —— success/error/info 三种类型
  // 都用 BaseToast 包一层，把背景和文字替换成 colors.toastBg / toastText。
  // BUG-003 优化：用 useMemo 缓存 toastConfig，避免每次 render 重新创建
  // 对象导致 Toast 内部重挂订阅。
  const toastConfig = useMemo(
    () => ({
      success: (props: BaseToastProps) => (
        <BaseToast
          {...props}
          style={{ backgroundColor: colors.toastBg, borderLeftColor: colors.tint }}
          contentContainerStyle={{ backgroundColor: colors.toastBg }}
          text1Style={{ color: colors.toastText, fontSize: 14, fontWeight: '600' }}
          text2Style={{ color: colors.toastText, fontSize: 12 }}
        />
      ),
      error: (props: BaseToastProps) => (
        <BaseToast
          {...props}
          style={{ backgroundColor: colors.toastBg, borderLeftColor: '#E25C5C' }}
          contentContainerStyle={{ backgroundColor: colors.toastBg }}
          text1Style={{ color: colors.toastText, fontSize: 14, fontWeight: '600' }}
          text2Style={{ color: colors.toastText, fontSize: 12 }}
        />
      ),
      info: (props: BaseToastProps) => (
        <BaseToast
          {...props}
          style={{ backgroundColor: colors.toastBg, borderLeftColor: colors.subText }}
          contentContainerStyle={{ backgroundColor: colors.toastBg }}
          text1Style={{ color: colors.toastText, fontSize: 14, fontWeight: '600' }}
          text2Style={{ color: colors.toastText, fontSize: 12 }}
        />
      ),
    }),
    [colors]
  );
  return (
    <>
      <StatusBar style={colors.statusBar === 'dark' ? 'dark' : 'light'} />
      {/* Web: 居中手机宽度容器，模拟真实手机视口 */}
      <View
        style={[
          Platform.OS === 'web' ? styles.webWrapper : styles.nativeWrapper,
          { backgroundColor: colors.bg },
        ]}
      >
        <AppNavigator />
        <OfflineBanner />
        <Toast config={toastConfig} />
      </View>
    </>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF9' }}>
        <ActivityIndicator size="large" color="#E85D26" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#E8E0D8' : '#FFFDF9' }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <I18nextProvider i18n={i18n}>
              <ThemedShell />
            </I18nextProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // Web 端：固定 390px 宽（iPhone 14 标准宽度），水平居中，有圆角和阴影模拟手机
  webWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 390,
    // @ts-ignore: web-only shadow
    boxShadow: '0 0 40px rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  nativeWrapper: {
    flex: 1,
  },
});
