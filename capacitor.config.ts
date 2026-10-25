import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wellworksco.wellsync',
  appName: 'WellSync',
  webDir: 'dist',
  // The logo's yellow: shown behind the web view while it loads, so launch has no white flash.
  backgroundColor: '#ffde59',
};

export default config;
