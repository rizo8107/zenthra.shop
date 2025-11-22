import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  variant?: 'default' | 'light';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  collapsed = false, 
  variant = 'default' 
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Try multiple logo sources
  const logoSources = [
    import.meta.env.VITE_SITE_LOGO,
    '/karigai-logo.webp',
    '/karigai-logo.png', 
    '/logo.svg',
    '/logo.png'
  ].filter(Boolean);
  
  const siteName = import.meta.env.VITE_SITE_TITLE || 'Zenthra Shop';

  const handleError = () => {
    setImageError(true);
  };

  // If image failed to load or no sources available, show text fallback
  if (imageError || logoSources.length === 0) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "flex items-center justify-center rounded-lg font-bold text-lg transition-all",
          collapsed ? "h-8 w-8 text-sm" : "h-8 px-2",
          variant === 'light' ? 'text-white bg-white/20' : 'text-primary bg-primary/10'
        )}>
          {collapsed ? siteName.charAt(0).toUpperCase() : siteName.substring(0, 1).toUpperCase()}
        </div>
        {!collapsed && (
          <span className={cn(
            "font-semibold text-lg ml-1",
            variant === 'light' ? 'text-white' : 'text-foreground'
          )}>
            {siteName}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={logoSources[0]}
        alt={siteName}
        className={cn(
          "transition-all object-contain",
          collapsed ? "h-8 w-8" : "h-8 w-auto max-w-[120px]",
          variant === 'light' && "brightness-0 invert"
        )}
        onError={handleError}
      />
      {!collapsed && (
        <span className={cn(
          "font-semibold text-lg ml-1",
          variant === 'light' ? 'text-white' : 'text-foreground'
        )}>
          {siteName}
        </span>
      )}
    </div>
  );
};
