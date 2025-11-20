import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useDynamicTheme } from "@/contexts/ThemeContext";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  const { themeData } = useDynamicTheme();

  const branding = themeData?.branding;

  const siteTitle =
    branding?.siteTitle ||
    import.meta.env.VITE_SITE_TITLE ||
    "Karigai";

  const logoPath =
    branding?.logoUrl ||
    import.meta.env.VITE_SITE_LOGO ||
    import.meta.env.VITE_LOGO_PATH ||
    "/karigai-logo.webp";

  return (
    <Link to="/" className={cn("flex items-center gap-2", className)}>
      <img src={logoPath} alt={`${siteTitle} Logo`} className="h-8 w-8" />
      <span className="font-bold text-xl">{siteTitle}</span>
    </Link>
  );
}