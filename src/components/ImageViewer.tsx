import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

interface ImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * ImageViewer · 需求 11
 *
 * 全屏 Modal 图片查看器：
 *  - 双指缩放（1–4x）+ 双击切换 1x/2x
 *  - 左右滑动切换图片（支持多张）
 *  - 下滑超过阈值关闭（带位移阻尼）
 *  - 顶部显示 "1/3" + 关闭按钮（i18n: imageViewer.indexOf / imageViewer.close）
 *
 * 仅使用 react-native-gesture-handler + react-native-reanimated，无额外依赖。
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const { t } = useTranslation();
  const { width: SW, height: SH } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);

  // 每次打开重置 index（initialIndex 可能来自不同的菜谱）
  React.useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  // 缩放 + 位移共享值
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 下滑关闭时整屏透明度
  const bgOpacity = useSharedValue(1);

  const resetTransforms = useCallback(() => {
    scale.value = withTiming(1, { duration: 180 });
    savedScale.value = 1;
    translateX.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(0, { duration: 180 });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    bgOpacity.value = withTiming(1, { duration: 180 });
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY, bgOpacity]);

  const handleClose = useCallback(() => {
    resetTransforms();
    onClose();
  }, [resetTransforms, onClose]);

  const goToIndex = useCallback(
    (next: number) => {
      if (next < 0 || next >= images.length) return;
      setIndex(next);
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      bgOpacity.value = 1;
    },
    [images.length, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY, bgOpacity],
  );

  // ── Pinch ──────────────────────────────────────────────
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(next, 1), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withTiming(1, { duration: 180 });
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // ── Double tap (switch 1x / 2x) ────────────────────────
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.05) {
        scale.value = withTiming(1, { duration: 180 });
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2, { duration: 180 });
        savedScale.value = 2;
      }
    });

  // ── Pan ────────────────────────────────────────────────
  // 根据当前缩放状态切换：1x → 用作横向翻页 + 下滑关闭；>1x → 用作平移浏览
  const SWIPE_DISMISS_Y = 120;
  const SWIPE_PAGE_X = SW * 0.25;

  const pan = Gesture.Pan()
    .minDistance(6)
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else {
        // 未放大：水平跟手（翻页预览）+ 垂直跟手带阻尼（下滑关闭）
        translateX.value = e.translationX;
        if (e.translationY > 0) {
          translateY.value = e.translationY;
          bgOpacity.value = Math.max(
            0.4,
            1 - Math.min(e.translationY / (SH * 0.6), 1),
          );
        } else {
          translateY.value = e.translationY * 0.2;
        }
      }
    })
    .onEnd((e) => {
      if (scale.value > 1.05) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        return;
      }

      const horizontal = Math.abs(e.translationX) > Math.abs(e.translationY);

      // 下滑关闭（未放大时）
      if (!horizontal && e.translationY > SWIPE_DISMISS_Y) {
        bgOpacity.value = withTiming(0, { duration: 160 });
        translateY.value = withTiming(SH, { duration: 160 });
        runOnJS(handleClose)();
        return;
      }

      // 横向切页
      if (horizontal && Math.abs(e.translationX) > SWIPE_PAGE_X) {
        const dir = e.translationX < 0 ? 1 : -1;
        const nextIndex = index + dir;
        if (nextIndex >= 0 && nextIndex < images.length) {
          runOnJS(goToIndex)(nextIndex);
          return;
        }
      }

      // 回弹
      translateX.value = withSpring(0, { damping: 20 });
      translateY.value = withSpring(0, { damping: 20 });
      bgOpacity.value = withTiming(1, { duration: 160 });
    });

  const composed = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan));

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const animatedBgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const currentUri = useMemo(() => images[index] ?? '', [images, index]);

  if (!visible || images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.bg, animatedBgStyle]} />

        {/* Top bar */}
        <View style={styles.topBar} pointerEvents="box-none">
          <Text style={styles.counter}>
            {t('imageViewer.indexOf', {
              current: index + 1,
              total: images.length,
            })}
          </Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            accessibilityLabel={t('imageViewer.close')}
            hitSlop={10}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.imageWrap, { width: SW, height: SH }]}>
            <Animated.View style={[{ width: SW, height: SH }, animatedImageStyle]}>
              <Image
                source={{ uri: currentUri }}
                style={{ width: SW, height: SH }}
                contentFit="contain"
                transition={150}
                cachePolicy="memory-disk"
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* Page dots（多张图片时显示） */}
        {images.length > 1 && (
          <View style={styles.dotsWrap} pointerEvents="none">
            {images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bg: {
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  counter: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsWrap: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFF',
  },
});

export default ImageViewer;
