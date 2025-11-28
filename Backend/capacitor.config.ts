import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'zenthra.shopapp',
  appName: 'Zenthra Shop',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0F172A',
    },
  },
  android: {
    allowMixedContent: true,
  },
  server: {
    // For development, you can set this to your dev server URL
    // url: 'http://10.0.2.2:5173',
    // cleartext: true,
  },
};

export default config;
