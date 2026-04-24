import { useTheme, FONT_SCALES } from '../contexts/ThemeContext';
import type { FontSizePref } from '../lib/storage';

/**
 * 字号缩放 hook。
 *
 * 重要：QA 标注的坑——`StyleSheet.create({ title: { fontSize: 18 } })` 这种静态
 * 值不会跟着 Context 变化！任何需要随字号调整的 Text，必须：
 *
 *   const { scale, scaled } = useFontScale();
 *   <Text style={[styles.title, { fontSize: scaled(18) }]}>…</Text>
 *
 * scaled(base) 直接返回 base * scale，不再 Math.round，避免字号阶梯感。
 */
export const useFontScale = () => {
  const { fontScale, fontSize, setFontSize } = useTheme();
  const scaled = (base: number): number => base * fontScale;
  return {
    scale: fontScale,
    fontSize,
    setFontSize,
    scaled,
  };
};

export { FONT_SCALES };
export type { FontSizePref };
