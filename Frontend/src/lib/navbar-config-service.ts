import { pocketbase, type RecordModel } from './pocketbase';

// Interface for the navbar configuration
export type NavItem = {
  id: string;
  label: string;
  url?: string; // used when type is external or custom
  pagePath?: string; // internal page path like /about
  openInNewTab?: boolean;
  children?: NavItem[];
  mega?: boolean;
  columns?: number; // 1-4 columns for mega menu
  imageUrl?: string; // optional promo image in mega dropdown
};

export interface NavbarConfig {
  showShop: boolean;
  showAbout: boolean;
  showContact: boolean;
  showGifting: boolean;
  showBlog: boolean;
  showBestsellers: boolean;
  showNewArrivals: boolean;
  isActive: boolean;
  items?: NavItem[];
}

// Default configuration in case of fetch failure
const DEFAULT_NAVBAR_CONFIG: NavbarConfig = {
  showShop: true,
  showAbout: true,
  showContact: true,
  showGifting: true,
  showBlog: true,
  showBestsellers: true,
  showNewArrivals: true,
  isActive: true,
};

/**
 * Maps a PocketBase record to the NavbarConfig interface
 */
const mapRecordToConfig = (record: RecordModel): NavbarConfig => {
  // Safe JSON parse helper
  const safeParse = <T>(value: unknown, fallback: T): T => {
    if (Array.isArray(value)) return value as unknown as T;
    if (typeof value === 'object' && value !== null) return value as T;
    if (typeof value === 'string') {
      try { return JSON.parse(value) as T; } catch { return fallback; }
    }
    return fallback;
  };
  return {
    showShop: record.show_shop ?? true,
    showAbout: record.show_about ?? true,
    showContact: record.show_contact ?? true,
    showGifting: record.show_gifting ?? true,
    showBlog: record.show_blog ?? true,
    showBestsellers: (record as any).show_bestsellers ?? true,
    showNewArrivals: (record as any).show_new_arrivals ?? true,
    isActive: record.is_active ?? true,
    items: safeParse<(NavbarConfig['items'])>((record as any).items, undefined),
  };
};

/**
 * Gets the active navbar configuration from PocketBase
 */
export async function getNavbarConfig(): Promise<NavbarConfig> {
  try {
    const records = await pocketbase.collection('navbar_config').getList(1, 1, {
      filter: 'is_active=true',
    });

    if (records.items.length > 0) {
      return mapRecordToConfig(records.items[0]);
    }

    return DEFAULT_NAVBAR_CONFIG;
  } catch (error) {
    console.error('Failed to fetch navbar config:', error);
    return DEFAULT_NAVBAR_CONFIG;
  }
}
