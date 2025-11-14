import { useState, useEffect } from "react";
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ShoppingBag, Menu, Award, Sparkles, Info, Package, Heart, Settings, LogOut, Gift, Mail, Rss, Search } from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Cart } from "./Cart"
import { Logo } from '@/components/Logo'
import { getNavbarConfig, type NavbarConfig, type NavItem } from "@/lib/navbar-config-service";
import SearchCommand from "@/components/SearchCommand";

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { itemCount } = useCart()
  const [navConfig, setNavConfig] = useState<NavbarConfig | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await getNavbarConfig();
      setNavConfig(config);
    };
    fetchConfig();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 flex h-14 lg:h-16 items-center gap-3 relative">

        {/* Mobile menu button (left side) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              className="px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 lg:hidden"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
            <nav className="flex flex-col h-full bg-background">
              {/* Header */}
              <div className="border-b p-6">
                <SheetClose asChild>
                  <Link to="/" className="flex items-center gap-2">
                    <Logo className="h-6" />
                  </Link>
                </SheetClose>
              </div>
              
              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1 p-4">

                  {navConfig?.showShop && (
                    <SheetClose asChild>
                      <Link 
                        to="/shop" 
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent"
                      >
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        Shop
                      </Link>
                    </SheetClose>
                  )}
                  {navConfig?.showBestsellers && (
                    <SheetClose asChild>
                      <Link 
                        to="/bestsellers" 
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent"
                      >
                        <Award className="h-5 w-5 text-muted-foreground" />
                        Bestsellers
                      </Link>
                    </SheetClose>
                  )}
                  {navConfig?.showNewArrivals && (
                    <SheetClose asChild>
                      <Link 
                        to="/new-arrivals" 
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent"
                      >
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                        New Arrivals
                      </Link>
                    </SheetClose>
                  )}
                  {navConfig?.showAbout && (
                    <SheetClose asChild>
                      <Link 
                        to="/about" 
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent"
                      >
                        <Info className="h-5 w-5 text-muted-foreground" />
                        About
                      </Link>
                    </SheetClose>
                  )}
                  {navConfig?.showGifting && (
                    <SheetClose asChild>
                      <Link 
                        to="/gifting"
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent"
                      >
                        <Gift className="h-5 w-5 text-muted-foreground" />
                        Gifting
                      </Link>
                    </SheetClose>
                  )}
                  {navConfig?.showContact && (
                    <SheetClose asChild>
                      <Link 
                        to="/contact"
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent"
                      >
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        Contact
                      </Link>
                    </SheetClose>
                  )}
                  {navConfig?.showBlog && (
                    <SheetClose asChild>
                      <Link 
                        to="/blog"
                        className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent"
                      >
                        <Rss className="h-5 w-5 text-muted-foreground" />
                        Blog
                      </Link>
                    </SheetClose>
                  )}
                  {/* Custom items */}
                  {navConfig?.items?.map((item: NavItem) => (
                    <div key={item.id} className="flex flex-col">
                      {(() => {
                        const label = item.label || '';
                        const to = item.pagePath || '';
                        const ext = item.url;
                        const target = item.openInNewTab ? '_blank' : undefined;
                        if (ext) {
                          return (
                            <a href={ext} target={target} rel={item.openInNewTab ? 'noopener noreferrer' : undefined} className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent">
                              {label}
                            </a>
                          );
                        }
                        return (
                          <SheetClose asChild>
                            <Link to={to || '#'} className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent">
                              {label}
                            </Link>
                          </SheetClose>
                        );
                      })()}
                      {Array.isArray(item.children) && item.children.length > 0 && (
                        <div className="ml-6 mt-1 flex flex-col">
                          {item.children.map((ch) => {
                            const label = ch.label || '';
                            const to = ch.pagePath || '';
                            const ext = ch.url;
                            const target = ch.openInNewTab ? '_blank' : undefined;
                            if (ext) {
                              return (
                                <a key={ch.id} href={ext} target={target} rel={ch.openInNewTab ? 'noopener noreferrer' : undefined} className="px-4 py-2 text-sm rounded-md hover:bg-accent">
                                  {label}
                                </a>
                              );
                            }
                            return (
                              <SheetClose asChild key={ch.id}>
                                <Link to={to || '#'} className="px-4 py-2 text-sm rounded-md hover:bg-accent">
                                  {label}
                                </Link>
                              </SheetClose>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Footer - Auth Section */}
              <div className="border-t p-4">
                {user ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name ? user.name.charAt(0) : '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Log out">
                        <LogOut className="h-5 w-5" />
                      </Button>
                    </SheetClose>
                  </div>
                ) : (
                  <SheetClose asChild>
                    <Button asChild className="w-full">
                      <Link to="/auth/login">Sign In</Link>
                    </Button>
                  </SheetClose>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Mobile centered logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 lg:hidden">
          <Link to="/" className="flex items-center">
            <Logo className="h-6" />
          </Link>
        </div>
        
        {/* Desktop logo - left aligned */}
        <Link to="/" className="mr-6 hidden lg:flex items-center space-x-2">
          <Logo />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden lg:flex items-center gap-1 justify-center mx-auto">
          {navConfig?.showShop && (
            <Link
              to="/shop"
              className="text-sm font-medium text-foreground/80 hover:text-foreground rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
            >
              Shop
            </Link>
          )}
          {navConfig?.showBestsellers && (
            <Link
              to="/bestsellers"
              className="text-sm font-medium text-foreground/80 hover:text-foreground rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
            >
              Bestsellers
            </Link>
          )}
          {navConfig?.showNewArrivals && (
            <Link
              to="/new-arrivals"
              className="text-sm font-medium text-foreground/80 hover:text-foreground rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
            >
              New Arrivals
            </Link>
          )}
          {navConfig?.showAbout && (
            <Link
              to="/about"
              className="text-sm font-medium text-foreground/80 hover:text-foreground rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
            >
              About
            </Link>
          )}
          {navConfig?.showGifting && (
            <Link
              to="/gifting"
              className="text-sm font-medium text-foreground/80 hover:text-foreground rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
            >
              Gifting
            </Link>
          )}
          {navConfig?.showContact && (
            <Link
              to="/contact"
              className="text-sm font-medium text-foreground/80 hover:text-foreground rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
            >
              Contact
            </Link>
          )}
          {navConfig?.showBlog && (
            <Link
              to="/blog"
              className="text-sm font-medium text-foreground/80 hover:text-foreground rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
            >
              Blog
            </Link>
          )}
          {navConfig?.items?.map((item: NavItem) => {
            const label = item.label || '';
            const to = item.pagePath || '';
            const ext = item.url;
            const target = item.openInNewTab ? '_blank' : undefined;
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            if (!hasChildren) {
              if (ext) {
                return (
                  <a key={item.id} href={ext} target={target} rel={item.openInNewTab ? 'noopener noreferrer' : undefined} className="text-sm font-medium text-foreground/80 hover:text-foreground rounded-md px-3 py-2 transition-colors hover:bg-accent/50">
                    {label}
                  </a>
                );
              }
              return (
                <Link key={item.id} to={to || '#'} className="text-sm font-medium text-foreground/80 hover:text-foreground rounded-md px-3 py-2 transition-colors hover:bg-accent/50">
                  {label}
                </Link>
              );
            }
            // With children: normal dropdown or mega menu
            if (item.mega) {
              const cols = Math.min(4, Math.max(1, item.columns || 3));
              const gridColsClass = cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : 'grid-cols-4';
              return (
                <DropdownMenu key={item.id}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="px-3 py-2 h-auto text-sm font-medium text-foreground/80 hover:text-foreground rounded-md hover:bg-accent/50">
                      {label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-xl p-4 shadow-lg border bg-popover/95 backdrop-blur-sm w-[min(90vw,820px)]">
                    <div className={`grid ${gridColsClass} gap-3`}>
                      {item.children!.map((ch) => {
                        const clabel = ch.label || '';
                        const cto = ch.pagePath || '';
                        const cext = ch.url;
                        const ctarget = ch.openInNewTab ? '_blank' : undefined;
                        if (cext) {
                          return (
                            <DropdownMenuItem key={ch.id} asChild className="rounded-md">
                              <a href={cext} target={ctarget} rel={ch.openInNewTab ? 'noopener noreferrer' : undefined} className="block px-3 py-2 rounded-md hover:bg-accent/60">{clabel}</a>
                            </DropdownMenuItem>
                          );
                        }
                        return (
                          <DropdownMenuItem key={ch.id} asChild className="rounded-md">
                            <Link to={cto || '#'} className="block px-3 py-2 rounded-md hover:bg-accent/60">{clabel}</Link>
                          </DropdownMenuItem>
                        );
                      })}
                      {item.imageUrl && (
                        <div className="col-span-full md:col-span-1">
                          <div className="rounded-lg overflow-hidden border">
                            <img src={item.imageUrl} alt={`${label} promo`} className="w-full h-32 object-cover" />
                          </div>
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            return (
              <DropdownMenu key={item.id}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="px-3 py-2 h-auto text-sm font-medium text-foreground/80 hover:text-foreground rounded-md hover:bg-accent/50">
                    {label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl p-1 shadow-lg border bg-popover/95 backdrop-blur-sm">
                  {item.children!.map((ch) => {
                    const clabel = ch.label || '';
                    const cto = ch.pagePath || '';
                    const cext = ch.url;
                    const ctarget = ch.openInNewTab ? '_blank' : undefined;
                    if (cext) {
                      return (
                        <DropdownMenuItem key={ch.id} asChild className="rounded-md">
                          <a href={cext} target={ctarget} rel={ch.openInNewTab ? 'noopener noreferrer' : undefined}>{clabel}</a>
                        </DropdownMenuItem>
                      );
                    }
                    return (
                      <DropdownMenuItem key={ch.id} asChild className="rounded-md">
                        <Link to={cto || '#'}>{clabel}</Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        {/* Search, cart and user menu */}
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Search (Ctrl/Cmd+K)">
              <Search className="h-5 w-5" />
            </Button>
            <Cart>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
                <span className="sr-only">Open cart</span>
              </Button>
            </Cart>

            <div className="hidden lg:block">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name ? user.name.charAt(0) : '?'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders">Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => signOut()}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" asChild>
                  <Link to="/auth/login">Sign in</Link>
                </Button>
              )}
            </div>
          </nav>
        </div>
        <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </header>
  )
}