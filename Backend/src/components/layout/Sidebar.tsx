import React, { useState } from 'react';
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
  MessageSquare,
  Mail,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarItemProps {
  icon: React.ElementType;
  title: string;
  path: string;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: Icon, 
  title, 
  path, 
  active, 
  collapsed,
  onNavigate
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
      {!collapsed && <span>{title}</span>}
    </Link>
  );
};

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { title: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { title: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { title: 'Customers', path: '/admin/customers', icon: Users },
    { title: 'Abandoned carts', path: '/admin/abandoned-carts', icon: AlertTriangle },
    { title: 'Products', path: '/admin/products', icon: Package },
    { title: 'Pages', path: '/admin/pages', icon: FileText },
    { title: 'Themes', path: '/admin/themes', icon: Palette },
    { title: 'Plugins', path: '/admin/plugins', icon: Puzzle },
    { title: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div 
      className={cn(
        "bg-card h-full border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        isMobile ? "w-full" : ""
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center border-b px-4 gap-3",
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
        {items.map((item) => (
          <SidebarItem
            key={item.path}
            icon={item.icon}
            title={item.title}
            path={item.path}
            active={location.pathname === item.path}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
};
