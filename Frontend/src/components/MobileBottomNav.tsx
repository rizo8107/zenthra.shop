import { Link, useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Cart } from './Cart';

// Minimal custom SVG icons for cleaner look
const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const ShopIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const BagIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6h12l1.5 12H4.5L6 6z" />
    <path d="M9 6V4a3 3 0 116 0v2" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number;
  onClick?: () => void;
  children?: React.ReactNode;
}

const NavItem = ({ to, icon, label, isActive, badge, onClick, children }: NavItemProps) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-0.5 relative">
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] rounded-full bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );

  const baseClasses = cn(
    "flex-1 flex items-center justify-center py-2 transition-colors min-h-[56px]",
    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
  );

  if (children) {
    return <div className={baseClasses}>{children}</div>;
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={baseClasses}>
        {content}
      </button>
    );
  }

  if (to) {
    return (
      <Link to={to} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return <div className={baseClasses}>{content}</div>;
};

export function MobileBottomNav() {
  const location = useLocation();
  const { itemCount, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const pathname = location.pathname;

  // Don't show on checkout, auth pages, or admin
  const hiddenPaths = ['/checkout', '/auth', '/admin', '/puck'];
  const shouldHide = hiddenPaths.some(path => pathname.startsWith(path));

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border lg:hidden safe-area-bottom">
      <div className="flex items-stretch">
        <NavItem
          to="/"
          icon={<HomeIcon className="h-5 w-5" />}
          label="Home"
          isActive={pathname === '/'}
        />
        <NavItem
          to="/shop"
          icon={<ShopIcon className="h-5 w-5" />}
          label="Shop"
          isActive={pathname === '/shop'}
        />
        <div className="flex-1 flex items-center justify-center py-2 min-h-[56px] text-muted-foreground hover:text-foreground">
          <Cart>
            <button className="flex flex-col items-center justify-center gap-0.5 relative w-full h-full">
              <div className="relative">
                <BagIcon className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] rounded-full bg-primary text-[9px] font-semibold text-primary-foreground flex items-center justify-center px-0.5">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">Cart</span>
            </button>
          </Cart>
        </div>
        <NavItem
          to={user ? "/profile" : "/auth/login"}
          icon={<UserIcon className="h-5 w-5" />}
          label={user ? "Account" : "Sign In"}
          isActive={pathname.startsWith('/profile') || pathname.startsWith('/auth')}
        />
      </div>
    </nav>
  );
}

export default MobileBottomNav;
