import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * useShakeDetection — detects device shake using expo-sensors Accelerometer.
 *
 * expo-sensors must be installed: npx expo install expo-sensors
 * If not installed, the hook silently does nothing.
 *
 * @param onShake callback when shake is detected
 * @param threshold acceleration threshold (default 1.5G)
 * @param cooldownMs minimum ms between triggers (default 2000)
 */
export function useShakeDetection(
  onShake: () => void,
  threshold = 1.5,
  cooldownMs = 2000,
): void {
  const lastShake = useRef(0);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    // Don't run on web
    if (Platform.OS === 'web') return;

    let Accelerometer: any = null;
    let subscription: any = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sensors = require('expo-sensors');
      Accelerometer = sensors.Accelerometer;
    } catch {
      // expo-sensors not installed
      return;
    }

    if (!Accelerometer) return;

    Accelerometer.setUpdateInterval(150);
    subscription = Accelerometer.addListener(
      (data: { x: number; y: number; z: number }) => {
        const totalForce = Math.sqrt(
          data.x * data.x + data.y * data.y + data.z * data.z,
        );

        const now = Date.now();
        if (totalForce > threshold && now - lastShake.current > cooldownMs) {
          lastShake.current = now;
          onShakeRef.current();
        }
      },
    );

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [threshold, cooldownMs]);
}
