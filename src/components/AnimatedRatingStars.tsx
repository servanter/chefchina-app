import React, { useRef, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '../lib/haptics';

interface AnimatedRatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: number;
  color?: string;
  onRate?: (value: number) => void;
  readonly?: boolean;
  /** Whether to play the stagger animation on mount/rating change */
  animated?: boolean;
}

export const AnimatedRatingStars: React.FC<AnimatedRatingStarsProps> = ({
  rating,
  maxStars = 5,
  size = 20,
  color = '#FFB800',
  onRate,
  readonly = false,
  animated = true,
}) => {
  const anims = useRef(
    Array.from({ length: maxStars }, () => new Animated.Value(1)),
  ).current;

  // Stagger animation: each star scales up sequentially
  useEffect(() => {
    if (!animated || rating <= 0) return;
    const filled = Math.ceil(rating);
    const animations = anims.slice(0, filled).map((anim, idx) => {
      anim.setValue(0);
      return Animated.sequence([
        Animated.delay(idx * 80), // stagger delay
        Animated.spring(anim, {
          toValue: 1,
          friction: 4,
          tension: 180,
          useNativeDriver: true,
        }),
      ]);
    });
    Animated.parallel(animations).start();
  }, [rating, animated, anims]);

  const handleRate = useCallback(
    (value: number) => {
      if (onRate) {
        triggerHaptic('light');
        onRate(value);
      }
    },
    [onRate],
  );

  const renderStar = (index: number) => {
    const filled = index < Math.floor(rating);
    const halfFilled = !filled && index < rating;
    const iconName = filled ? 'star' : halfFilled ? 'star-half' : 'star-outline';

    const starView = (
      <Animated.View
        style={{
          transform: [{ scale: anims[index] }],
          opacity: anims[index],
        }}
      >
        <Ionicons name={iconName} size={size} color={color} style={styles.star} />
      </Animated.View>
    );

    if (readonly || !onRate) {
      return <View key={index}>{starView}</View>;
    }

    return (
      <TouchableOpacity
        key={index}
        onPress={() => handleRate(index + 1)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        {starView}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }, (_, i) => renderStar(i))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 1,
  },
});
