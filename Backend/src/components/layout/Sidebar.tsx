import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  AlertTriangle,
  Package,
  FileText,
  Palette,
  Puzzle,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Mail,
  MapPin,
  Workflow,
  Menu,
  MessageCircle,
  Megaphone,
  CreditCard,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';

interface SidebarItemProps {
  icon: React.ElementType;
  title: string;
  path: string;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  badge?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  title,
  path,
  active,
  collapsed,
  onNavigate,
  badge
}) => {
  return (
    <Link
      to={path}
      className={cn(
        "flex items-center py-3 px-4 text-sm rounded-md transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
        collapsed && "justify-center"
      )}
      onClick={onNavigate}
    >
      <Icon size={20} className={cn(collapsed ? "mx-0" : "mr-3")} />
      {!collapsed && (
        <span className="flex items-center gap-2">
          <span>{title}</span>
          {badge && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              {badge}
            </Badge>
          )}
        </span>
      )}
    </Link>
  );
};

interface SidebarGroupItem {
  title: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

interface SidebarGroup {
  title: string;
  key: string;
  items: SidebarGroupItem[];
}

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(true);
  const hoverTimeoutRef = useRef<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Ensure correct default per device and keep mobile always expanded
  useEffect(() => {
    if (isMobile) {
      setCollapsed(false);
    } else {
      setCollapsed(true);
    }
  }, [isMobile]);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current !== null) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const groups: SidebarGroup[] = [
    {
      title: 'Store',
      key: 'store',
      items: [
        { title: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { title: 'Orders', path: '/admin/orders', icon: ShoppingCart },
        { title: 'Payments', path: '/admin/payments', icon: CreditCard },
        { title: 'Coupons', path: '/admin/coupons', icon: FileText },
        { title: 'Customers', path: '/admin/customers', icon: Users },
        { title: 'Abandoned carts', path: '/admin/abandoned-carts', icon: AlertTriangle },
        { title: 'Products', path: '/admin/products', icon: Package },
      ],
    },
    {
      title: 'Automation',
      key: 'automation',
      items: [
        { title: 'Automation', path: '/admin/automation', icon: Workflow, badge: 'Beta' },
        { title: 'Checkout Flow', path: '/admin/checkout-flow', icon: Workflow, badge: 'Beta' },
      ],
    },
    {
      title: 'Marketing',
      key: 'marketing',
      items: [
        { title: 'Campaigns', path: '/admin/campaigns', icon: Megaphone },
        { title: 'Bulk Campaigns', path: '/admin/bulk-campaigns', icon: Send },
        { title: 'WhatsApp', path: '/admin/whatsapp', icon: MessageCircle },
      ],
    },
    {
      title: 'Website',
      key: 'website',
      items: [
        { title: 'Pages', path: '/admin/pages', icon: FileText },
        { title: 'Navbar', path: '/admin/navbar', icon: Menu },
        { title: 'Branding', path: '/admin/branding', icon: Palette },
        { title: 'Themes', path: '/admin/themes', icon: Palette },
        { title: 'Plugins', path: '/admin/plugins', icon: Puzzle },
      ],
    },
    {
      title: 'Settings',
      key: 'settings',
      items: [
        { title: 'Settings', path: '/admin/settings', icon: Settings },
      ],
    },
  ];

  // Initialize all groups expanded by default (run once on mount)
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const g of groups) {
      initial[g.key] = true;
    }
    setExpandedGroups(initial);
    // groups is static; safe to omit from deps to avoid re-running
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flatItems = groups.flatMap((g) => g.items);

  return (
    <div
      className={cn(
        "bg-card h-full border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        isMobile ? "w-full" : ""
      )}
      onMouseEnter={() => {
        if (!isMobile) {
          // Cancel any pending collapse and expand immediately
          if (hoverTimeoutRef.current !== null) {
            window.clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          setCollapsed(false);
        }
      }}
      onMouseLeave={() => {
        if (!isMobile) {
          // Add a small delay before collapsing to avoid jitter
          if (hoverTimeoutRef.current !== null) {
            window.clearTimeout(hoverTimeoutRef.current);
          }
          hoverTimeoutRef.current = window.setTimeout(() => {
            setCollapsed(true);
            hoverTimeoutRef.current = null;
          }, 200);
        }
      }}
    >
      {/* Logo */}
      <div className={cn(
        "h-20 flex items-center border-b px-4 pt-2 gap-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <Link to="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <img
            src="/logo.svg"
            alt="Zenthra Shop"
            className={cn(
              "transition-all brightness-0 dark:invert",
              collapsed ? "h-10 w-10" : "h-10 w-auto"
            )}
          />
        </Link>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </Button>
        )}
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {/* When collapsed, show a flat icon-only list for speed */}
        {collapsed
          ? flatItems.map((item) => (
              <SidebarItem
                key={item.path}
                icon={item.icon}
                title={item.title}
                path={item.path}
                active={location.pathname === item.path}
                collapsed={collapsed}
                onNavigate={onNavigate}
                badge={item.badge}
              />
            ))
          : groups.map((group) => {
              const isExpanded = expandedGroups[group.key] ?? true;
              return (
                <div key={group.key} className="mb-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [group.key]: !isExpanded,
                      }))
                    }
                    className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    <span>{group.title}</span>
                    <span className="text-[10px]">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-1 space-y-1">
                      {group.items.map((item) => (
                        <SidebarItem
                          key={item.path}
                          icon={item.icon}
                          title={item.title}
                          path={item.path}
                          active={location.pathname === item.path}
                          collapsed={false}
                          onNavigate={onNavigate}
                          badge={item.badge}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
      </nav>
    </div>
  );
};
