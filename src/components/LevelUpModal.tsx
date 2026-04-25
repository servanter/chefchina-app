import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LEVEL_ICONS: Record<number, string> = {
  1: '🥄',
  2: '🍴',
  3: '🔪',
  4: '👨‍🍳',
  5: '🏆',
};

const triggerHaptic = async () => {
  try {
    const Haptics = require('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // 静默
  }
};

interface Props {
  newLevel: number | null;
  visible: boolean;
  onClose: () => void;
}

export default function LevelUpModal({ newLevel, visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && newLevel) {
      triggerHaptic();
      overlayAnim.setValue(0);
      scaleAnim.setValue(0);
      progressAnim.setValue(0);

      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.15,
            tension: 100,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // 进度条动画
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        delay: 400,
        useNativeDriver: false,
      }).start();

      const timer = setTimeout(() => {
        handleClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, newLevel]);

  const handleClose = () => {
    Animated.timing(overlayAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => onClose());
  };

  if (!visible || !newLevel) return null;

  const levelName = t(`achievements.levelNames.${newLevel}`);
  const icon = LEVEL_ICONS[newLevel] ?? '🏆';

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.title, { color: colors.tint }]}>
            {t('achievements.levelUpTitle')}
          </Text>
          <Text style={[styles.levelName, { color: colors.text }]}>
            {levelName}
          </Text>
          <Text style={[styles.desc, { color: colors.subText }]}>
            {t('achievements.levelUpDesc')}
          </Text>

          {/* 进度条动画 */}
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.tint,
                  width: progressWidth,
                },
              ]}
            />
          </View>
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
    width: SCREEN_WIDTH * 0.78,
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  icon: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  levelName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
