import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Bundle ID; must match the App ID you register in your Apple Developer account.
  appId: 'com.get2mars.app',
  appName: 'Get2Mars',
  webDir: 'dist',
  backgroundColor: '#1B1F3B',
  ios: {
    // Let the page handle the notch itself (it reads env(safe-area-inset-*)).
    contentInset: 'never',
    // The game is one fixed screen: no rubber-band scrolling.
    scrollEnabled: false,
    backgroundColor: '#1B1F3B',
  },
};

export default config;
