import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useDynamicTheme } from "@/contexts/ThemeContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  const { themeData } = useDynamicTheme();
  const { settings, loading } = useSiteSettings();

  const branding = themeData?.branding;

  // Wait for settings to load before showing anything
  if (loading) {
    return (
      <Link to="/" className={cn("flex items-center gap-2", className)}>
        <span className="font-bold text-xl">Loading...</span>
      </Link>
    );
  }

  const siteTitle =
    settings?.siteTitle ||
    branding?.siteTitle ||
    import.meta.env.VITE_SITE_TITLE ||
    "Viruthi Gold";

  const logoPath =
    settings?.siteLogoUrl ||
    branding?.logoUrl ||
    import.meta.env.VITE_SITE_LOGO ||
    import.meta.env.VITE_LOGO_PATH ||
    "";

  return (
    <Link to="/" className={cn("flex items-center gap-2", className)}>
      {logoPath && !logoPath.includes('/karigai-logo') ? (
        <img 
          src={logoPath} 
          alt={`${siteTitle} Logo`} 
          className="h-8 w-8"
          onError={(e) => {
            // Hide broken image on error
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : null}
      <span className="font-bold text-xl">{siteTitle}</span>
    </Link>
  );
}