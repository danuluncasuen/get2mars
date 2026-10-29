import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type BuzzKind = 'nearMiss' | 'chicken' | 'shieldPop' | 'crash';

// Web fallback in ms: the Vibration API works on Android, not in iOS Safari (it has none).
const WEB_PATTERNS: Record<BuzzKind, number | number[]> = {
  nearMiss: 10,
  chicken: 30,
  shieldPop: 40,
  crash: [60, 40, 120],
};

const IMPACTS: Record<Exclude<BuzzKind, 'crash'>, ImpactStyle> = {
  nearMiss: ImpactStyle.Light,
  chicken: ImpactStyle.Medium,
  shieldPop: ImpactStyle.Heavy,
};

const native = Capacitor.isNativePlatform();

// Short haptic on game events: the Taptic Engine in the iOS app, vibration on the web.
export function buzz(kind: BuzzKind): void {
  if (native) {
    const done =
      kind === 'crash'
        ? Haptics.notification({ type: NotificationType.Error })
        : Haptics.impact({ style: IMPACTS[kind] });
    done.catch(() => {});
    return;
  }
  try {
    navigator.vibrate?.(WEB_PATTERNS[kind]);
  } catch {
    // No vibration on this device.
  }
}
