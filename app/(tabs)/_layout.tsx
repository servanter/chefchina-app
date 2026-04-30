import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useFontScale } from '../../src/hooks/useFontScale';
import { getUserId } from '../../src/lib/storage';
import { useUnreadCount } from '../../src/hooks/useUnreadCount';

// Web 端没有 Home Indicator，跟 Android 一样处理
const isIOS = Platform.OS === 'ios';
const TAB_HEIGHT = isIOS ? 88 : 62;
const TAB_PADDING_BOTTOM = isIOS ? 28 : 6;

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { scaled } = useFontScale();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getUserId().then((uid) => {
      setUserId(uid && uid !== 'guest' ? uid : null);
    });
  }, []);

  const { data: unreadCountMap } = useUnreadCount(userId);
  const unreadCount = unreadCountMap?.all ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.tabBorder,
          borderTopWidth: 1,
          height: TAB_HEIGHT,
          paddingBottom: TAB_PADDING_BOTTOM,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          overflow: 'visible',
        },
        tabBarItemStyle: {
          marginTop: -6,  // 整体上移
        },
        tabBarLabelStyle: {
          fontSize: scaled(11),
          fontWeight: '600',
          lineHeight: scaled(14),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('notifications.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
