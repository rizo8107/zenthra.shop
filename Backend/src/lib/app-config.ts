import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const BACKEND_URL_KEY = 'zenthra_backend_url';
const POCKETBASE_URL_KEY = 'zenthra_pocketbase_url';

// Default URLs (fallback)
const DEFAULT_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const DEFAULT_POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || '';

/**
 * Check if running in native app
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the configured backend URL
 */
export async function getBackendUrl(): Promise<string> {
  if (!isNativeApp()) {
    // Web: use environment variable
    return DEFAULT_BACKEND_URL;
  }

  try {
    const { value } = await Preferences.get({ key: BACKEND_URL_KEY });
    return value || DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

/**
 * Get the configured PocketBase URL
 */
export async function getPocketBaseUrl(): Promise<string> {
  if (!isNativeApp()) {
    // Web: use environment variable
    return DEFAULT_POCKETBASE_URL;
  }

  try {
    const { value } = await Preferences.get({ key: POCKETBASE_URL_KEY });
    return value || DEFAULT_POCKETBASE_URL;
  } catch {
    return DEFAULT_POCKETBASE_URL;
  }
}

/**
 * Save the backend URL (for native app)
 */
export async function setBackendUrl(url: string): Promise<void> {
  if (!isNativeApp()) return;

  await Preferences.set({
    key: BACKEND_URL_KEY,
    value: url.trim().replace(/\/$/, ''), // Remove trailing slash
  });
}

/**
 * Save the PocketBase URL (for native app)
 */
export async function setPocketBaseUrl(url: string): Promise<void> {
  if (!isNativeApp()) return;

  await Preferences.set({
    key: POCKETBASE_URL_KEY,
    value: url.trim().replace(/\/$/, ''), // Remove trailing slash
  });
}

/**
 * Check if backend URL is configured
 */
export async function isBackendConfigured(): Promise<boolean> {
  if (!isNativeApp()) return true; // Web always uses env vars

  const url = await getPocketBaseUrl();
  return !!url && url.length > 0;
}

/**
 * Clear saved URLs (for logout/reset)
 */
export async function clearSavedUrls(): Promise<void> {
  if (!isNativeApp()) return;

  await Preferences.remove({ key: BACKEND_URL_KEY });
  await Preferences.remove({ key: POCKETBASE_URL_KEY });
}
