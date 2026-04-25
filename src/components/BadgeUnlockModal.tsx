import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import type { Badge } from '../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 触觉反馈（安全调用）
const triggerHaptic = async () => {
  try {
    const Haptics = require('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // expo-haptics 未安装时静默忽略
  }
};

interface Props {
  badge: Badge | null;
  visible: boolean;
  onClose: () => void;
}

// 金色粒子
const PARTICLE_COUNT = 12;

function Particle({ delay, scale }: { delay: number; scale: Animated.Value }) {
  const anim = useRef(new Animated.Value(0)).current;
  const angle = (delay / PARTICLE_COUNT) * Math.PI * 2;
  const radius = 80 + Math.random() * 40;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay * 40),
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [anim, delay]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * radius],
  });
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * radius],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

export default function BadgeUnlockModal({ badge, visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const isZh = i18n.language === 'zh';

  useEffect(() => {
    if (visible && badge) {
      triggerHaptic();
      overlayAnim.setValue(0);
      scaleAnim.setValue(0);

      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            tension: 120,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 80,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // 自动 3 秒关闭
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, badge]);

  const handleClose = () => {
    Animated.timing(overlayAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!visible || !badge) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
      <TouchableOpacity
        style={styles.overlayTouch}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* 粒子效果 */}
          <View style={styles.particleContainer}>
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
              <Particle key={i} delay={i} scale={scaleAnim} />
            ))}
          </View>

          <Text style={styles.icon}>{badge.icon}</Text>
          <Text style={[styles.title, { color: colors.tint }]}>
            {t('achievements.badgeUnlockTitle')}
          </Text>
          <Text style={[styles.badgeName, { color: colors.text }]}>
            {isZh ? badge.nameZh : badge.nameEn}
          </Text>
          <Text style={[styles.badgeDesc, { color: colors.subText }]}>
            {isZh ? badge.descZh : badge.descEn}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  card: {
    width: SCREEN_WIDTH * 0.75,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  particleContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
