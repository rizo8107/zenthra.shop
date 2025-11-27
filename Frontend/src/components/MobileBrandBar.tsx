import { Link } from 'react-router-dom';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useDynamicTheme } from '@/contexts/ThemeContext';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

/**
 * Compact brand bar shown at the top on mobile for all storefront pages.
 * Uses site settings + theme colors. Hidden on md+.
 */
export function MobileBrandBar() {
  const { settings } = useSiteSettings();
  const { themeData } = useDynamicTheme();

  const siteTitle =
    settings?.siteTitle ||
    import.meta.env.VITE_SITE_TITLE ||
    'Your Brand';

  const tagline = settings?.siteTagline || 'Cold-pressed goodness, delivered fresh.';

  const primaryBg = themeData?.primary?.hex || '#111827';
  const primaryFg = themeData?.textOnPrimary || '#FFFFFF';

  // Simple path guard: hide on checkout/auth/admin/embed via layout, and hide on desktop via classes.

  return (
    <div
      className={cn(
        'md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border safe-area-top'
      )}
    >
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Plain responsive brand image/logo */}
          <Logo className="h-6 w-auto shrink-0" />
        </div>
        <div className="ml-auto">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium shadow-sm"
            style={{ backgroundColor: primaryBg, color: primaryFg }}
          >
            <span>Shop now</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MobileBrandBar;
