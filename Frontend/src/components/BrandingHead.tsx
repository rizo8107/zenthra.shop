import { useEffect } from "react";
import { useDynamicTheme } from "@/contexts/ThemeContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

/**
 * BrandingHead synchronizes favicon, logo-related meta tags, and default SEO
 * metadata (title/description/social image) from the active theme's
 * branding block stored in PocketBase (ThemeSettings.data.branding).
 *
 * This runs on the client and updates document.head so SEO tools, crawlers
 * and social previews see the configured branding assets.
 */
export function BrandingHead() {
  const { themeData } = useDynamicTheme();
  const { settings, loading } = useSiteSettings();

  useEffect(() => {
    // Wait for settings to load before updating head tags
    if (loading) return;

    const branding = themeData?.branding;

    const siteTitle =
      settings?.siteTitle ||
      branding?.siteTitle;

    const siteDescription =
      settings?.siteDescription ||
      branding?.siteDescription;

    const faviconUrl =
      settings?.siteFaviconUrl ||
      branding?.faviconUrl;

    const socialImageUrl =
      settings?.ogImageUrl ||
      branding?.socialImageUrl;

    const safeTitle = siteTitle || document.title || "Viruthi Gold";
    const safeDescription =
      siteDescription ||
      document
        .querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.getAttribute("content") ||
      "Discover our handmade natural soaps, crafted with care for your skin and the environment.";

    // Document title
    if (safeTitle && typeof document !== "undefined") {
      document.title = safeTitle;
    }

    const ensureMeta = (
      selector: string,
      createAttrs: Record<string, string>,
      content?: string,
    ) => {
      if (!content) return;
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        Object.entries(createAttrs).forEach(([k, v]) => el!.setAttribute(k, v));
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Basic SEO
    ensureMeta('meta[name="description"]', { name: "description" }, safeDescription);

    // OpenGraph / social tags
    ensureMeta('meta[property="og:title"]', { property: "og:title" }, safeTitle);
    ensureMeta(
      'meta[property="og:description"]',
      { property: "og:description" },
      safeDescription,
    );
    if (socialImageUrl) {
      ensureMeta('meta[property="og:image"]', { property: "og:image" }, socialImageUrl);
      ensureMeta(
        'meta[name="twitter:image"]',
        { name: "twitter:image" },
        socialImageUrl,
      );
      ensureMeta('meta[name="image"]', { name: "image" }, socialImageUrl);
    }

    // Twitter title/description
    ensureMeta('meta[name="twitter:title"]', { name: "twitter:title" }, safeTitle);
    ensureMeta(
      'meta[name="twitter:description"]',
      { name: "twitter:description" },
      safeDescription,
    );

    // Favicon / apple-touch-icon
    if (faviconUrl) {
      const updateLink = (rel: string) => {
        let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
        if (!link) {
          link = document.createElement("link");
          link.rel = rel;
          document.head.appendChild(link);
        }
        link.href = faviconUrl;
      };

      updateLink("icon");
      updateLink("apple-touch-icon");
    }
  }, [themeData, settings, loading]);

  return null;
}
