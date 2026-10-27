// Short buzzes on hits. The web build uses the Vibration API, which works on Android but not in
// iOS Safari (it has none). The Capacitor build swaps this one function for native haptics.
export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // No vibration on this device.
  }
}
