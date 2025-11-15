import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProducts, type Product } from '@/lib/pocketbase';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Heart, Star, ImageIcon, Loader2, ShoppingBag, Search, SlidersHorizontal, Plus, Minus, X } from 'lucide-react';
import { ProductImage } from '@/components/ProductImage';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { preloadImages } from '@/utils/imageOptimizer';
import { Collections } from '@/lib/pocketbase';
import { pocketbase } from '@/lib/pocketbase';
import { Breadcrumbs, BreadcrumbItem } from '@/components/Breadcrumbs';
import ProductCard from '@/components/ProductCard';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<"default" | "name" | "price" | "bestseller">('default');
  const [category, setCategory] = useState<string>('all');
  const [visibleProducts, setVisibleProducts] = useState<Set<string>>(new Set());
  const priceBounds = useMemo(() => {
    if (!products || products.length === 0) return [0, 0] as [number, number];
    const prices = products.map((p) => Number(p.price || 0));
    return [Math.min(...prices), Math.max(...prices)] as [number, number];
  }, [products]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    setPriceRange((prev) => {
      const [min, max] = priceBounds;
      if (!filtersInitializedRef.current) {
        return priceBounds;
      }
      const nextMin = Math.max(min, Math.min(prev[0], max));
      const nextMax = Math.max(min, Math.min(prev[1], max));
      if (nextMin === prev[0] && nextMax === prev[1]) {
        return prev;
      }
      return [nextMin, nextMax];
    });
  }, [priceBounds]);
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      tags.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [products]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const { addItem } = useCart();
  const { toast } = useToast();
  const [wishlistedItems, setWishlistedItems] = useState<Set<string>>(new Set());
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const productGridRef = useRef<HTMLDivElement>(null);
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());
  const [searchParams, setSearchParams] = useSearchParams();
  const filtersInitializedRef = useRef(false);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setSearchTerm(searchInput);
    }, 250);
    return () => window.clearTimeout(handler);
  }, [searchInput]);
  
  // Calculate the filtered products (memoized)
  const categories = useMemo(
    () => ['all', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    const list = products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(lower) ||
        product.description.toLowerCase().includes(lower);
      const matchesCategory = category === 'all' || product.category === category;
      const matchesPrice = Number(product.price || 0) >= priceRange[0] && Number(product.price || 0) <= priceRange[1];
      const tagsArr = Array.isArray(product.tags) ? product.tags : [];
      const matchesTags = selectedTags.size === 0 || tagsArr.some((t) => selectedTags.has(t));
      return matchesSearch && matchesCategory && matchesPrice && matchesTags;
    });
    // Preserve backend order when sortBy is 'default'
    if (sortBy === 'default') return list;
    // Otherwise, apply the chosen sort
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'bestseller':
          return Number(b.bestseller) - Number(a.bestseller);
        default:
          return 0;
      }
    });
  }, [products, searchTerm, category, sortBy, priceRange, selectedTags]);

  useEffect(() => {
    if (filtersInitializedRef.current) {
      return;
    }

    const paramsEntries = Object.fromEntries(searchParams.entries());
    let initialized = false;

    if (paramsEntries.q) {
      setSearchTerm(paramsEntries.q);
      setSearchInput(paramsEntries.q);
      initialized = true;
    }
    if (paramsEntries.category) {
      setCategory(paramsEntries.category);
      initialized = true;
    }
    if (paramsEntries.sort) {
      const sortValue = paramsEntries.sort as typeof sortBy;
      if (['default', 'name', 'price', 'bestseller'].includes(sortValue)) {
        setSortBy(sortValue);
        initialized = true;
      }
    }
    if (paramsEntries.tags) {
      const tags = paramsEntries.tags.split(',').filter(Boolean);
      if (tags.length > 0) {
        setSelectedTags(new Set(tags));
        initialized = true;
      }
    }
    if (paramsEntries.price) {
      const [min, max] = paramsEntries.price.split('-').map((value) => Number(value));
      if (!Number.isNaN(min) && !Number.isNaN(max) && min <= max) {
        setPriceRange([min, max]);
        initialized = true;
      }
    }

    if (!initialized && typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('shopFilters');
        if (stored) {
          const parsed = JSON.parse(stored) as {
            searchTerm?: string;
            category?: string;
            sortBy?: typeof sortBy;
            selectedTags?: string[];
            priceRange?: [number, number];
          };
          if (parsed.searchTerm) {
            setSearchTerm(parsed.searchTerm);
            setSearchInput(parsed.searchTerm);
          }
          if (parsed.category) {
            setCategory(parsed.category);
          }
          if (parsed.sortBy && ['default', 'name', 'price', 'bestseller'].includes(parsed.sortBy)) {
            setSortBy(parsed.sortBy);
          }
          if (parsed.selectedTags && parsed.selectedTags.length > 0) {
            setSelectedTags(new Set(parsed.selectedTags));
          }
          if (parsed.priceRange && parsed.priceRange.length === 2) {
            setPriceRange(parsed.priceRange);
          }
        }
      } catch (error) {
        console.warn('Failed to parse stored shop filters', error);
      }
    }

    filtersInitializedRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!filtersInitializedRef.current) {
      return;
    }

    const params = new URLSearchParams();
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      params.set('q', trimmedSearch);
    }
    if (category !== 'all') {
      params.set('category', category);
    }
    if (sortBy !== 'default') {
      params.set('sort', sortBy);
    }
    if (selectedTags.size > 0) {
      params.set('tags', Array.from(selectedTags).join(','));
    }
    const [defaultMin, defaultMax] = priceBounds;
    if (priceRange[0] !== defaultMin || priceRange[1] !== defaultMax) {
      params.set('price', `${priceRange[0]}-${priceRange[1]}`);
    }

    const newParamsString = params.toString();
    const currentParamsString = searchParams.toString();
    if (newParamsString !== currentParamsString) {
      setSearchParams(params, { replace: true });
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'shopFilters',
        JSON.stringify({
          searchTerm: trimmedSearch,
          category,
          sortBy,
          selectedTags: Array.from(selectedTags),
          priceRange,
        })
      );
    }
  }, [searchTerm, category, sortBy, selectedTags, priceRange, priceBounds, searchParams, setSearchParams]);

  const selectedTagsArray = useMemo(() => Array.from(selectedTags), [selectedTags]);
  const isDefaultPrice = priceRange[0] === priceBounds[0] && priceRange[1] === priceBounds[1];
  const hasActiveFilters = Boolean(searchTerm.trim()) || category !== 'all' || selectedTags.size > 0 || !isDefaultPrice || sortBy !== 'default';

  const handleRemoveTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setCategory('all');
    setSelectedTags(new Set());
    setSearchInput('');
    setSearchTerm('');
    setSortBy('default');
    setPriceRange(priceBounds);
  }, [priceBounds]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log("Fetching products for Shop page...");
        
        // First try to use the main getProducts function
        let data = await getProducts(undefined, controller.signal);
        
        // If no products were returned, use a fallback approach
        if (!data || data.length === 0) {
          console.log("No products returned, trying direct PocketBase approach");
          try {
            // Direct approach to PocketBase as a fallback
            const records = await pocketbase.collection(Collections.PRODUCTS).getList(1, 100, {
              $autoCancel: false,
              requestKey: `shop_products_fallback_${Date.now()}`
            });
            
            console.log(`Fallback method returned ${records.items.length} products`);
            
            // Transform the data to match our Product interface
            data = records.items.map(record => ({
              ...record,
              $id: record.id,
              images: Array.isArray(record.images) 
                ? record.images.map((image: string) => `${record.id}/${image}`)
                : [],
              colors: typeof record.colors === 'string' ? JSON.parse(record.colors) : record.colors,
              features: typeof record.features === 'string' ? JSON.parse(record.features) : record.features,
              care: typeof record.care === 'string' ? JSON.parse(record.care) : record.care,
              tags: typeof record.tags === 'string' ? JSON.parse(record.tags) : record.tags,
              createdAt: record.created,
              updatedAt: record.updated,
              reviews: 0
            })) as unknown as Product[];
          } catch (fallbackError) {
            console.error("Fallback product fetch also failed:", fallbackError);
            // If both approaches fail, show an error toast
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Failed to load products. Please try again later.',
            });
          }
        }
        
        if (data && data.length > 0) {
          console.log(`Successfully loaded ${data.length} products for Shop page`);
          setProducts(data);
          
          // Preload first 8 images for better initial load performance
          const criticalImages = data.slice(0, 8)
            .map(product => product.images?.[0])
            .filter(Boolean) as string[];
            
          // Preload with high priority for first 4 (visible above the fold)
          preloadImages(criticalImages.slice(0, 4), Collections.PRODUCTS, "medium", true);
          
          // Preload remaining with normal priority
          preloadImages(criticalImages.slice(4), Collections.PRODUCTS, "small", false);
        }
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'AbortError') {
          console.error('Error fetching products:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load products. Please try again later.',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      controller.abort();
      // Clean up any observers
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current.clear();
    };
  }, [toast]);

  // Setup intersection observer to track which products are visible
  useEffect(() => {
    if (loading || products.length === 0 || !productGridRef.current) return;
    
    // Clean up previous observers
    observersRef.current.forEach(observer => observer.disconnect());
    observersRef.current.clear();
    
    // Create new observers for product elements
    const productElements = productGridRef.current.querySelectorAll('[data-product-id]');
    
    productElements.forEach(element => {
      const productId = element.getAttribute('data-product-id');
      if (!productId) return;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Mark product as visible
              setVisibleProducts(prev => new Set([...prev, productId]));
              
              // Once we've seen it, we can stop observing
              observer.unobserve(entry.target);
              observersRef.current.delete(productId);
            }
          });
        },
        { 
          rootMargin: '200px', // Start loading when product is 200px from viewport
          threshold: 0.1 // Consider visible when 10% is in viewport
        }
      );
      
      observer.observe(element);
      observersRef.current.set(productId, observer);
    });
    
    return () => {
      // Clean up observers
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current.clear();
    };
  }, [loading, products, filteredProducts]);

  const handleAddToCart = useCallback((product: Product) => {
    const quantity = productQuantities[product.id] || 1;
  
    // Fix: Pass parameters correctly to match CartContext's addItem function
    // The function expects (product: Product, quantity: number, color: string)
    const colorOptions = (product as any).variants?.colors && (product as any).variants.colors.length > 0
      ? (product as any).variants.colors
      : (product.colors || []);
    const defaultColor = colorOptions.length > 0 ? colorOptions[0].value : '';
    addItem(product, quantity, defaultColor);

    // Toast is already shown by the CartContext's addItem function
  
    // Reset quantity after adding to cart
    setProductQuantities(prev => ({
      ...prev,
      [product.id]: 1
    }));
  }, [addItem, productQuantities]);
  
  const handleQuantityChange = (e: React.MouseEvent, productId: string, change: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setProductQuantities(prev => {
      const currentQty = prev[productId] || 1;
      const newQty = Math.max(1, currentQty + change);
      return {
        ...prev,
        [productId]: newQty
      };
    });
  };

  const toggleWishlist = (productId: string) => {
    setWishlistedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-[300px] bg-gray-100 animate-pulse" />
        <div className="konipai-container py-10">
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div className="w-full max-w-sm">
                <div className="h-10 bg-muted rounded-md animate-pulse" />
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-[150px] bg-muted rounded-md animate-pulse" />
                <div className="h-10 w-[100px] bg-muted rounded-md animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="aspect-square bg-muted rounded-lg animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generate breadcrumb items
  const breadcrumbItems = [
    { label: 'Shop' }
  ];
  
  // Add category if filtered
  if (category && category !== 'all') {
    breadcrumbItems.push({
      label: category.charAt(0).toUpperCase() + category.slice(1),
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section removed as requested */}

      <div className="konipai-container py-10">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={breadcrumbItems} 
          className="mb-6"
          isLoading={loading}
        />
        
        <div className="space-y-8">
          {/* Search and Filters */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-4">
              <Select value={sortBy} onValueChange={(value: 'default' | 'name' | 'price' | 'bestseller') => setSortBy(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="bestseller">Bestseller</SelectItem>
                </SelectContent>
              </Select>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <Separator className="my-4" />
                  <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-2 text-sm font-medium">Categories</h4>
                        <div className="space-y-2">
                          {categories.map((cat) => (
                            <SheetClose key={cat} asChild>
                              <Button
                                variant={category === cat ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setCategory(cat)}
                              >
                                {cat === 'all' ? 'All Categories' : cat}
                              </Button>
                            </SheetClose>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-medium">Price</h4>
                        <div className="text-xs text-muted-foreground mb-2">₹{priceRange[0]} – ₹{priceRange[1]}</div>
                        <Slider
                          min={priceBounds[0]}
                          max={priceBounds[1]}
                          step={1}
                          value={[priceRange[0], priceRange[1]]}
                          onValueChange={(v) => setPriceRange([Number(v[0]), Number(v[1])])}
                        />
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-medium">Tags</h4>
                        <div className="space-y-2">
                          {availableTags.length === 0 && (
                            <div className="text-xs text-muted-foreground">No tags</div>
                          )}
                          {availableTags.map((tag) => (
                            <label key={tag} className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedTags.has(tag)}
                                onCheckedChange={(v) =>
                                  setSelectedTags((prev) => {
                                    const next = new Set(prev);
                                    if (Boolean(v)) next.add(tag);
                                    else next.delete(tag);
                                    return next;
                                  })
                                }
                              />
                              <span className="text-sm">{tag}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          onClick={handleClearFilters}
                        >
                          Clear all filters
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {searchTerm.trim() && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-full px-3"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                  }}
                >
                  <span className="mr-1">Search: {searchTerm.trim()}</span>
                  <X className="h-3 w-3" />
                </Button>
              )}
              {category !== 'all' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-full px-3 capitalize"
                  onClick={() => setCategory('all')}
                >
                  <span className="mr-1">Category: {category}</span>
                  <X className="h-3 w-3" />
                </Button>
              )}
              {!isDefaultPrice && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-full px-3"
                  onClick={() => setPriceRange(priceBounds)}
                >
                  <span className="mr-1">₹{priceRange[0]} – ₹{priceRange[1]}</span>
                  <X className="h-3 w-3" />
                </Button>
              )}
              {selectedTagsArray.map((tag) => (
                <Button
                  key={tag}
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-full px-3"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <span className="mr-1">#{tag}</span>
                  <X className="h-3 w-3" />
                </Button>
              ))}
              {sortBy !== 'default' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-full px-3"
                  onClick={() => setSortBy('default')}
                >
                  <span className="mr-1">Sort: {sortBy}</span>
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 px-3" onClick={handleClearFilters}>
                Clear all
              </Button>
            </div>
          )}

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div ref={productGridRef} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
              {filteredProducts.map((product, index) => (
                <div key={product.id} data-product-id={product.id}>
                  <ProductCard product={product} priority={index < 4} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
