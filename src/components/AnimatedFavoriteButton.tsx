import React, { useRef, useCallback } from 'react';
import { Animated, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '../lib/haptics';

interface AnimatedFavoriteButtonProps {
  favorited: boolean;
  label?: string;
  onPress: () => void;
  tintColor?: string;
  size?: number;
  style?: any;
  labelStyle?: any;
  activeStyle?: any;
  activeLabelStyle?: any;
}

export const AnimatedFavoriteButton: React.FC<AnimatedFavoriteButtonProps> = ({
  favorited,
  label,
  onPress,
  tintColor = '#E85D26',
  size = 18,
  style,
  labelStyle,
  activeStyle,
  activeLabelStyle,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    // rotate + scale animation for "drop in" effect
    rotateAnim.setValue(0);
    scaleAnim.setValue(1);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    triggerHaptic('light');
    onPress();
  }, [onPress, rotateAnim, scaleAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-15deg', '0deg'],
  });

  return (
    <TouchableOpacity
      style={[styles.btn, style, favorited && activeStyle]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={{
          transform: [{ rotate }, { scale: scaleAnim }],
        }}
      >
        <Ionicons
          name={favorited ? 'bookmark' : 'bookmark-outline'}
          size={size}
          color={favorited ? '#FFF' : tintColor}
        />
      </Animated.View>
      {label !== undefined && (
        <Text style={[styles.label, labelStyle, favorited && activeLabelStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
