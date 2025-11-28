import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Store the FCM token
let fcmToken: string | null = null;

/**
 * Check if we're running in a native Capacitor environment
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current FCM token (if registered)
 */
export function getFcmToken(): string | null {
  return fcmToken;
}

/**
 * Initialize push notifications for native platforms.
 * Call this once on app startup (e.g., in App.tsx useEffect).
 */
export async function initPushNotifications(): Promise<void> {
  if (!isNativePlatform()) {
    console.log('[Push] Not a native platform, skipping push init');
    return;
  }

  try {
    // Request permission
    const permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive === 'granted') {
      // Register with FCM
      await PushNotifications.register();
      console.log('[Push] Registration initiated');
    } else {
      console.warn('[Push] Permission not granted:', permStatus.receive);
    }

    // Listen for registration success
    PushNotifications.addListener('registration', (token) => {
      fcmToken = token.value;
      console.log('[Push] FCM Token:', token.value);
      
      // Send token to backend
      registerTokenWithBackend(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });

    // Listen for push notifications received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received:', notification);
      
      // You can show a toast or in-app notification here
      // The notification will also appear in the system tray
    });

    // Listen for notification tap (user clicked on notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification action performed:', action);
      
      const data = action.notification.data;
      
      // Handle different notification types
      if (data?.type === 'new_order' && data?.order_id) {
        // Navigate to order details
        window.location.href = `/#/admin/orders?highlight=${data.order_id}`;
      }
    });

  } catch (error) {
    console.error('[Push] Failed to initialize:', error);
  }
}

/**
 * Register the FCM token with your backend
 */
async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    const response = await fetch('/api/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: Capacitor.getPlatform(), // 'android' or 'ios'
      }),
    });

    if (response.ok) {
      console.log('[Push] Token registered with backend');
    } else {
      console.error('[Push] Failed to register token:', response.status);
    }
  } catch (error) {
    console.error('[Push] Error registering token:', error);
  }
}

/**
 * Check current notification permission status
 */
export async function checkPushPermissions(): Promise<string> {
  if (!isNativePlatform()) {
    return 'denied';
  }

  const status = await PushNotifications.checkPermissions();
  return status.receive;
}
