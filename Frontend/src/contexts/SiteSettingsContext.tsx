import React, { createContext, useContext, useEffect, useState } from 'react';
import { type SiteSettings, getSiteSettings } from '@/lib/pocketbase';

interface SiteSettingsContextType {
  settings: SiteSettings | null;
  loading: boolean;
  error: string | null;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: null,
  loading: true,
  error: null,
});

export const useSiteSettings = () => useContext(SiteSettingsContext);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings | null>(() => {
    // Try to load from sessionStorage to prevent flash on page refresh
    try {
      const cached = sessionStorage.getItem('site_settings');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!settings); // If we have cached settings, don't show loading
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await getSiteSettings();
        if (!cancelled) {
          setSettings(data);
          // Cache in sessionStorage for instant load on refresh
          try {
            sessionStorage.setItem('site_settings', JSON.stringify(data));
          } catch (e) {
            console.warn('Failed to cache site settings', e);
          }
        }
      } catch (e) {
        console.error('Failed to load site settings', e);
        if (!cancelled) {
          setError('Failed to load site settings');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, error }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};
