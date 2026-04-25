import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * 弹跳动画 hook — 点赞/收藏等按钮的 scale 弹跳效果
 * 用法：
 *   const { scale, bounce } = useBounce();
 *   <Animated.View style={{ transform: [{ scale }] }}>
 *     <TouchableOpacity onPress={() => { bounce(); doAction(); }}>
 */
export function useBounce(toValue = 1.3, duration = 150) {
  const scale = useRef(new Animated.Value(1)).current;

  const bounce = useCallback(() => {
    scale.stopAnimation();
    Animated.sequence([
      Animated.spring(scale, {
        toValue,
        speed: 40,
        bounciness: 12,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 20,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, toValue]);

  return { scale, bounce };
}
