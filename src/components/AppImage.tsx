import React, { useState } from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';

// 兜底 blurhash（柔和暖色调，贴合应用主色）
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80';

interface AppImageProps {
  uri?: string | null;
  fallback?: string;
  blurhash?: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
  accessibilityLabel?: string;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * 统一的 `<AppImage>`：
 * - 基于 `expo-image`，支持磁盘缓存（memory-disk）
 * - blurhash 占位，150ms 淡入
 * - 失败时落到 fallback（优先业务传入，否则用通用菜谱兜底图）
 */
export const AppImage: React.FC<AppImageProps> = ({
  uri,
  fallback,
  blurhash,
  style,
  contentFit = 'cover',
  transition = 150,
  accessibilityLabel,
  priority = 'normal',
}) => {
  const [failed, setFailed] = useState(false);

  const resolvedFallback = fallback ?? DEFAULT_FALLBACK;
  const source = !uri || failed ? { uri: resolvedFallback } : { uri };

  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      placeholder={{ blurhash: blurhash ?? DEFAULT_BLURHASH }}
      placeholderContentFit={contentFit}
      priority={priority}
      accessibilityLabel={accessibilityLabel}
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
};
