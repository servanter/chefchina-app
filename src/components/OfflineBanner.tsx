import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

type Status = 'online' | 'offline' | 'restored';

const OFFLINE_COLOR = '#F4C430'; // 黄色警示
const RESTORED_COLOR = '#4CAF50';
const RESTORED_VISIBLE_MS = 2000;
const INVALIDATE_DEBOUNCE_MS = 5000;

/**
 * 订阅 NetInfo：
 * - 离线时顶部显示黄色横条（内容走 i18n）
 * - 恢复后显示绿色"已恢复"条 2 秒
 * - 恢复时触发 queryClient.invalidateQueries()（5 秒去抖）
 * 挂载位置：`app/_layout.tsx` 根布局顶层（遮住 StatusBar 下方留白）
 */
export const OfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<Status>('online');
  const translateY = useRef(new Animated.Value(-60)).current;
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInvalidateAt = useRef<number>(0);
  const prevConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const handle = (state: NetInfoState) => {
      // web 环境下 isInternetReachable 可能为 null，用 isConnected 兜底
      const connected =
        (state.isInternetReachable ?? state.isConnected) !== false;
      const prev = prevConnectedRef.current;
      prevConnectedRef.current = connected;

      if (!connected) {
        if (restoreTimer.current) {
          clearTimeout(restoreTimer.current);
          restoreTimer.current = null;
        }
        setStatus('offline');
        return;
      }

      // 首次订阅：若已在线则什么都不做
      if (prev === null) {
        setStatus('online');
        return;
      }

      // 从离线转到在线
      if (prev === false && connected) {
        setStatus('restored');
        const now = Date.now();
        if (now - lastInvalidateAt.current > INVALIDATE_DEBOUNCE_MS) {
          lastInvalidateAt.current = now;
          try {
            queryClient.invalidateQueries();
          } catch {
            // ignore
          }
        }
        if (restoreTimer.current) clearTimeout(restoreTimer.current);
        restoreTimer.current = setTimeout(() => {
          setStatus('online');
          restoreTimer.current = null;
        }, RESTORED_VISIBLE_MS);
      }
    };

    // 初始状态
    NetInfo.fetch().then(handle);
    const unsub = NetInfo.addEventListener(handle);
    return () => {
      unsub();
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
    };
  }, [queryClient]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: status === 'online' ? -60 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [status, translateY]);

  if (status === 'online' && Platform.OS !== 'web') {
    // 完全收起时仍保留组件挂载以便动画衔接，但返回 null 避免遮挡触摸
    // 但动画过程中 translateY 已将其移出视线，这里稳妥返回 null
    return null;
  }
  if (status === 'online') return null;

  const isOffline = status === 'offline';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        {
          paddingTop: insets.top + 4,
          backgroundColor: isOffline ? OFFLINE_COLOR : RESTORED_COLOR,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons
        name={isOffline ? 'cloud-offline-outline' : 'checkmark-circle-outline'}
        size={15}
        color={isOffline ? '#5A4500' : '#FFFFFF'}
        style={{ marginRight: 6 }}
      />
      <Text style={[styles.text, !isOffline && styles.textLight]}>
        {t(isOffline ? 'network.offline' : 'network.restored')}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9,
  },
  text: {
    color: '#5A4500',
    fontSize: 12,
    fontWeight: '700',
  },
  textLight: {
    color: '#FFFFFF',
  },
});
