import React, { useEffect, useState } from 'react';
import { Platform, StyleProp, ImageStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';
import { processImageUrl } from '../lib/imageProxy';

// 默认 blurhash（柔和暖色调占位）
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80';

export interface LazyImageProps {
  uri?: string | null;
  /** 失败兜底 URL（可选；默认菜谱占位图） */
  fallback?: string;
  /** 自定义 blurhash（可选） */
  placeholder?: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
  accessibilityLabel?: string;
  priority?: 'low' | 'normal' | 'high';
  /** 当图片加载成功时回调 */
  onLoad?: () => void;
}

/**
 * LazyImage · 需求 11
 *
 * 基于 `expo-image` 封装，支持：
 *  - 磁盘 + 内存缓存（memory-disk）
 *  - blurhash 占位，150ms 淡入
 *  - 失败 → fallback 兜底
 *  - Web 平台：添加 crossOrigin="anonymous" 修复 CORS/ORB 错误
 *
 * 与现有 `AppImage` 的差异：参数对齐需求 11 的命名（placeholder 而非 blurhash），
 * 新代码推荐使用 `LazyImage`。`AppImage` 保留，不做破坏性改动。
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  uri,
  fallback,
  placeholder,
  style,
  contentFit = 'cover',
  transition = 150,
  accessibilityLabel,
  priority = 'normal',
  onLoad,
}) => {
  const [failed, setFailed] = useState(false);

  // uri 变化后重置 failed，避免组件复用时残留旧兜底
  useEffect(() => setFailed(false), [uri]);

  const resolvedFallback = fallback ?? DEFAULT_FALLBACK;
  
  // 自动使用图片代理解决 CORS 问题
  const proxiedUri = processImageUrl(uri);
  const proxiedFallback = processImageUrl(resolvedFallback);
  
  const source = !proxiedUri || failed 
    ? { uri: proxiedFallback || resolvedFallback } 
    : { uri: proxiedUri };

  // Web 平台：添加 crossOrigin 支持
  const imageProps: any = {
    source,
    style,
    contentFit,
    transition,
    cachePolicy: "memory-disk" as const,
    placeholder: { blurhash: placeholder ?? DEFAULT_BLURHASH },
    placeholderContentFit: contentFit,
    priority,
    accessibilityLabel,
    onLoad,
    onError: () => {
      if (!failed) setFailed(true);
    },
  };

  // 在 Web 平台添加 crossOrigin 属性（通过底层 props）
  if (Platform.OS === 'web') {
    // @ts-ignore - Expo Image Web 会将额外的 props 传递给底层 img 元素
    imageProps.crossOrigin = 'anonymous';
  }

  return <Image {...imageProps} />;
};

export default LazyImage;
