import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wellworksco.wellsync',
  appName: 'WellSync',
  webDir: 'dist',
  // The default (dark) theme's navy: shown behind the web view while it loads, so launch has no white flash.
  backgroundColor: '#16212e',
};

export default config;
