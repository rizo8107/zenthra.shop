import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Bell, User, Menu } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { pb } from '@/lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Close sidebar when switching to mobile view
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Simple left-edge swipe to open menu on mobile
  useEffect(() => {
    if (!isMobile) return;

    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // only start if near left edge (<= 24px)
      if (touch.clientX <= 24) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
      } else {
        touchStartX.current = null;
        touchStartY.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX.current;
      const dy = touch.clientY - touchStartY.current;

      // basic right-swipe detection with small vertical movement
      if (dx > 40 && Math.abs(dy) < 30) {
        setIsSidebarOpen(true);
        touchStartX.current = null;
        touchStartY.current = null;
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = null;
      touchStartY.current = null;
    };

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchmove', handleTouchMove);
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile]);

  const handleLogout = () => {
    try {
      pb.authStore.clear();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <div ref={containerRef} className="flex h-screen overflow-hidden bg-background touch-pan-y">
      {/* Mobile sidebar with Sheet */}
      {isMobile ? (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden ml-2 absolute z-50 top-8"
            >
              <Menu size={24} />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[250px]">
            <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop sidebar */
        <Sidebar />
      )}
      
      {/* Main content */}
      {/* Extra top padding on small screens so content clears the Android status bar */}
      <div className="flex flex-col flex-1 overflow-hidden pt-6 md:pt-0">
        {/* Top navigation */}
        <header className="flex items-center justify-end p-4 bg-card border-b shadow-sm">
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell size={20} />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-60 overflow-y-auto">
                  <DropdownMenuItem>
                    <div className="flex flex-col">
                      <span className="font-medium">New order received</span>
                      <span className="text-xs text-muted-foreground">5 minutes ago</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div className="flex flex-col">
                      <span className="font-medium">Payment confirmed</span>
                      <span className="text-xs text-muted-foreground">1 hour ago</span>
                    </div>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
