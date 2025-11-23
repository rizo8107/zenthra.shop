import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'light';
}

export function Logo({ className, variant = 'default' }: LogoProps) {
  const { settings, loading } = useSiteSettings();

  // Wait for settings to load before showing anything
  if (loading) {
    return (
      <div className={cn("font-bold text-xl", variant === 'light' ? "text-white" : "", className)}>
        Loading...
      </div>
    );
  }

  const siteTitle =
    settings?.siteTitle ||
    import.meta.env.VITE_SITE_TITLE ||
    'Viruthi Gold';

  const logoUrl =
    settings?.siteLogoUrl ||
    import.meta.env.VITE_SITE_LOGO ||
    (variant === 'light' 
      ? '/karigai-logo-white.webp'
      : '/karigai-logo.webp');

  const [error, setError] = useState<boolean>(false);

  // Fallback handling if the logo fails to load
  const handleError = () => {
    console.error('Logo failed to load:', logoUrl);
    setError(true);
  };

  // If logo fails to load or no logo URL, show site title as text
  if (error || !logoUrl || logoUrl.includes('/karigai-logo')) {
    return (
      <div className={cn("font-bold text-xl", variant === 'light' ? "text-white" : "", className)}>
        {siteTitle}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <img 
        src={logoUrl} 
        alt={siteTitle ? `${siteTitle} Logo` : 'Store Logo'} 
        className={cn("h-8 w-auto", "opacity-100", "transition-opacity")}
        width={144}
        height={56}
        loading="eager"
        onError={handleError}
      />
    </div>
  );
}