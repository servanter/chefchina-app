/**
 * Haptics 触觉反馈工具
 *
 * expo-haptics 需要 npx expo install expo-haptics 安装
 * 在不支持或未安装的环境下静默降级（不影响功能）
 */

let Haptics: typeof import('expo-haptics') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not installed — haptics will be silently skipped
}

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (!Haptics) return;

  try {
    switch (style) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // silently ignore haptic errors
  }
}

export function triggerSelection(): void {
  if (!Haptics) return;
  try {
    Haptics.selectionAsync();
  } catch {
    // ignore
  }
}
