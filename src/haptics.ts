import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type BuzzKind = 'star' | 'nearMiss' | 'chicken' | 'egg' | 'shieldPop' | 'crash';

// Native feel, softest first. 'selection' is the tiny tick iOS uses for pickers.
const NATIVE: Record<BuzzKind, 'selection' | ImpactStyle> = {
  star: 'selection',
  nearMiss: 'selection',
  chicken: ImpactStyle.Light,
  egg: ImpactStyle.Light,
  shieldPop: ImpactStyle.Medium,
  crash: ImpactStyle.Heavy,
};

// Web fallback in ms: the Vibration API works on Android, not in iOS Safari (it has none).
const WEB: Record<BuzzKind, number> = {
  star: 5,
  nearMiss: 8,
  chicken: 15,
  egg: 15,
  shieldPop: 25,
  crash: 50,
};

// Back-to-back buzzes blur into a rattle, so drop any that come too soon after the last one.
const GAP_MS = 90;

const native = Capacitor.isNativePlatform();
// The selection generator has to be started once before it can tick.
if (native) Haptics.selectionStart().catch(() => {});
let last = -Infinity;

// Short haptic on game events: the Taptic Engine in the iOS app, vibration on the web.
export function buzz(kind: BuzzKind): void {
  const now = performance.now();
  if (kind !== 'crash' && now - last < GAP_MS) return;
  last = now;
  if (native) {
    const style = NATIVE[kind];
    const done = style === 'selection' ? Haptics.selectionChanged() : Haptics.impact({ style });
    done.catch(() => {});
    return;
  }
  try {
    navigator.vibrate?.(WEB[kind]);
  } catch {
    // No vibration on this device.
  }
}
