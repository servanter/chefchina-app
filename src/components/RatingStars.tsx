import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingStarsProps {
  rating: number;          // current value (0–5)
  maxStars?: number;
  size?: number;
  color?: string;
  onRate?: (value: number) => void;  // if provided, stars become interactive
  readonly?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  size = 20,
  color = '#FFB800',
  onRate,
  readonly = false,
}) => {
  const renderStar = (index: number) => {
    const filled = index < Math.floor(rating);
    const halfFilled = !filled && index < rating;
    const iconName = filled ? 'star' : halfFilled ? 'star-half' : 'star-outline';

    if (readonly || !onRate) {
      return (
        <Ionicons key={index} name={iconName} size={size} color={color} style={styles.star} />
      );
    }

    return (
      <TouchableOpacity key={index} onPress={() => onRate(index + 1)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
        <Ionicons name={iconName} size={size} color={color} style={styles.star} />
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
