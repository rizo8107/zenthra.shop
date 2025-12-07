import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useDynamicTheme } from '@/contexts/ThemeContext';
import { useCart } from '@/contexts/CartContext';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';
import { Search, ShoppingCart, Menu, SlidersHorizontal, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Cart } from '@/components/Cart';
import SearchCommand from '@/components/SearchCommand';

/**
 * Compact brand bar shown at the top on mobile for all storefront pages.
 * Uses site settings + theme colors. Hidden on md+.
 */
export function MobileBrandBar() {
  const { settings } = useSiteSettings();
  const { themeData } = useDynamicTheme();
  const { itemCount } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);

  const primaryBg = themeData?.primary?.hex || '#15803D';
  const primaryFg = themeData?.textOnPrimary || '#FFFFFF';

  return (
    <div
      className={cn(
        'md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border safe-area-top'
      )}
    >
      {/* Top Row: Home + Logo + Action Icons */}
      <div className="max-w-7xl mx-auto px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Link
            to="/"
            className="h-9 w-9 rounded-full flex items-center justify-center bg-muted text-foreground hover:bg-muted/80 transition-colors"
            aria-label="Go to home"
          >
            <Home className="h-5 w-5" />
          </Link>
          <Logo className="h-8 w-auto shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          {/* Cart Icon */}
          <Cart>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-10 w-10 rounded-xl text-white hover:opacity-90"
              style={{ backgroundColor: primaryBg }}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </Cart>
          {/* Menu/Shop Icon */}
          <Link
            to="/shop"
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white hover:opacity-90"
            style={{ backgroundColor: primaryBg }}
          >
            <Menu className="h-5 w-5" />
          </Link>
        </div>
      </div>
      
      {/* Search Bar Row */}
      <div className="max-w-7xl mx-auto px-4 pb-3">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Search className="h-5 w-5" />
          <span className="text-sm">Search</span>
          <div className="ml-auto">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
        </button>
      </div>
      
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export default MobileBrandBar;
