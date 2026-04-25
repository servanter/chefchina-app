import React, { useRef, useCallback } from 'react';
import { Animated, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '../lib/haptics';

interface AnimatedLikeButtonProps {
  liked: boolean;
  label?: string;
  onPress: () => void;
  tintColor?: string;
  size?: number;
  style?: any;
  labelStyle?: any;
  activeStyle?: any;
  activeLabelStyle?: any;
}

export const AnimatedLikeButton: React.FC<AnimatedLikeButtonProps> = ({
  liked,
  label,
  onPress,
  tintColor = '#E85D26',
  size = 18,
  style,
  labelStyle,
  activeStyle,
  activeLabelStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
    // scale bounce animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.4,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    triggerHaptic('light');
    onPress();
  }, [onPress, scaleAnim]);

  return (
    <TouchableOpacity
      style={[styles.btn, style, liked && activeStyle]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={size}
          color={liked ? '#FFF' : tintColor}
        />
      </Animated.View>
      {label !== undefined && (
        <Text style={[styles.label, labelStyle, liked && activeLabelStyle]}>
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
