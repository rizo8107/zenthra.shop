import { useState, useEffect, useRef, useMemo, lazy, Suspense, type PointerEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Minus,
  Plus,
  Heart,
  Share2,
  Star,
  Check,
  ImageIcon,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import {
  getProduct,
  getProducts,
  getProductReviews,
  type Product,
  type ProductColor,
  pocketbase,
  Collections,
} from '@/lib/pocketbase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/ProductImage';
import { getPocketBaseImageUrl } from '@/utils/imageOptimizer';
import { useAuth } from '@/contexts/AuthContext';
import {
  trackProductView,
  trackAddToCart,
  trackButtonClick,
} from '@/lib/analytics';
import { Breadcrumbs, BreadcrumbItem } from '@/components/Breadcrumbs';
import { DEFAULT_CONFIG, getOrderConfig } from '@/lib/order-config-service';
import { getProductSettings } from '@/lib/config/product-settings';

// Lazy load heavy components that are below the fold
const ProductReviews = lazy(() => import('@/components/ProductReviews').then(module => ({ default: module.ProductReviews })));
const ProductDetails = lazy(() => import('@/components/ProductDetails').then(module => ({ default: module.ProductDetails })));

const stripPcsSuffix = (value?: string | null) => {
  if (!value) return '';
  return value.replace(/\s*(pcs|piece|pieces)\.?$/i, '').trim();
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [displayImages, setDisplayImages] = useState<string[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);

  const { addItem, items } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<{
    name: string;
    value: string;
    unit?: string;
    inStock?: boolean;
    priceOverride?: number;
    priceDelta?: number;
  } | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<{
    name: string;
    value: string;
    type?: 'bogo' | 'bundle' | 'custom';
    items?: number;
    priceOverride?: number;
    description?: string;
    discountType?: 'amount' | 'percent';
    discountValue?: number;
  } | null>(null);
  const [lastVariantPick, setLastVariantPick] =
    useState<'size' | 'combo' | null>(null);
  
  // State for managing selected products in "Buy Any X" combos
  const [selectedBuyAnyXProducts, setSelectedBuyAnyXProducts] = useState<Record<string, string[]>>({});

  const { toast } = useToast();
  const relatedLoaded = useRef(false);

  // Swipe refs
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeStartTime = useRef<number>(0);
  const swipeActive = useRef<boolean>(false);
  const isSwiping = useRef<boolean>(false);
  const activePointerId = useRef<number | null>(null);

  const swipeDisabled = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
    const navCaps = navigator as unknown as { maxTouchPoints?: number };
    const isMacTouch = ua.includes('Mac') && ((navCaps.maxTouchPoints ?? 0) > 1);
    return isIOSDevice || isMacTouch;
  }, []);

  const currentIndex = useMemo(() => {
    if (!displayImages || !selectedImage) return 0;
    const idx = displayImages.indexOf(selectedImage);
    return idx >= 0 ? idx : 0;
  }, [displayImages, selectedImage]);

  const lastAddToCartRef = useRef<number>(0);
  const lastWishlistActionRef = useRef<number>(0);
  const { user } = useAuth();

  const [averageRating, setAverageRating] = useState(0);
  const [orderConfig, setOrderConfig] = useState(DEFAULT_CONFIG);
  const [productSettings, setProductSettings] = useState(getProductSettings());

  const variantImagesMap = useMemo(() => {
    if (!product) {
      return {
        sizes: new Map<string, string[]>(),
        combos: new Map<string, string[]>(),
      };
    }

    const baseImages = Array.isArray(product.images) ? product.images : [];
    const extractName = (path: string) => path?.split('/')?.pop() || path;
    const stem = (name: string) =>
      (name || '')
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[^a-z0-9]+/g, '');

    const resolveToStored = (raw: string): string | null => {
      if (!raw) return null;
      if (raw.includes('/')) return raw;
      const rawStem = stem(raw);
      if (!rawStem) return null;
      const candidates = baseImages.map((img) => ({
        full: img,
        st: stem(extractName(img)),
      }));
      let hit = candidates.find((c) => c.st === rawStem);
      if (hit) return hit.full;
      hit = candidates.find(
        (c) => c.st.includes(rawStem) || rawStem.includes(c.st),
      );
      if (hit) return hit.full;
      return `${product.id}/${raw}`;
    };

    const variantData: any = (product as any).variants || {};
    const sizeMap = new Map<string, string[]>();
    const comboMap = new Map<string, string[]>();

    if (Array.isArray(variantData.sizes)) {
      variantData.sizes.forEach((sz: any) => {
        const key = sz?.value != null ? String(sz.value) : '';
        if (!key) return;
        const imgs = Array.isArray(sz.images) ? sz.images : [];
        const resolved = imgs
          .map((img: string) => resolveToStored(img))
          .filter(
            (img: string | null): img is string =>
              typeof img === 'string' && img.length > 0,
          );
        if (resolved.length) {
          sizeMap.set(key, resolved);
        }
      });
    }

    if (Array.isArray(variantData.combos)) {
      variantData.combos.forEach((cb: any) => {
        const key = cb?.value != null ? String(cb.value) : '';
        if (!key) return;
        const imgs = Array.isArray(cb.images) ? cb.images : [];
        const resolved = imgs
          .map((img: string) => resolveToStored(img))
          .filter(
            (img: string | null): img is string =>
              typeof img === 'string' && img.length > 0,
          );
        if (resolved.length) {
          comboMap.set(key, resolved);
        }
      });
    }

    return { sizes: sizeMap, combos: comboMap };
  }, [product]);

  const { isInCart, currentItemQty } = useMemo(() => {
    const match = items.find(
      (item) =>
        item.productId === id && (!selectedColor || item.color === selectedColor?.value),
    );
    return {
      isInCart: !!match,
      currentItemQty: match?.quantity || 0,
    };
  }, [items, id, selectedColor]);

  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    let base = Number(product.price) || 0;
    if (selectedSize) {
      if (typeof selectedSize.priceOverride === 'number')
        base = selectedSize.priceOverride as number;
      else if (typeof selectedSize.priceDelta === 'number')
        base = base + (selectedSize.priceDelta as number);
    }

    if (!selectedCombo) return base;

    if (typeof selectedCombo.priceOverride === 'number')
      return Number(selectedCombo.priceOverride) || base;

    const items = Number(selectedCombo.items) > 0 ? Number(selectedCombo.items) : 1;
    let computed = base * items;
    if (
      selectedCombo.discountType &&
      typeof selectedCombo.discountValue === 'number'
    ) {
      const val = Number(selectedCombo.discountValue) || 0;
      if (selectedCombo.discountType === 'amount') {
        computed = Math.max(0, computed - val);
      } else if (selectedCombo.discountType === 'percent') {
        computed = (computed * Math.max(0, 100 - val)) / 100;
      }
    }
    return computed;
  }, [product, selectedSize, selectedCombo]);

  const formatSizeOptionLabel = (size?: {
    name?: string;
    value?: unknown;
    unit?: string;
  } | null) => {
    if (!size) return '';
    const name = typeof size.name === 'string' ? stripPcsSuffix(size.name) : '';
    const value =
      size?.value !== undefined && size?.value !== null
        ? stripPcsSuffix(String(size.value))
        : '';
    const unitRaw = typeof size?.unit === 'string' ? size.unit.trim() : '';
    const unit = ['pcs', 'piece', 'pieces'].includes(unitRaw.toLowerCase())
      ? ''
      : unitRaw;
    const base = name || value;
    if (!unit || !base) return stripPcsSuffix(base || unit);
    const combined = base.toLowerCase().includes(unit.toLowerCase())
      ? base
      : `${base} ${unit}`;
    return stripPcsSuffix(combined);
  };

  const selectedSizeLabel = useMemo(
    () => formatSizeOptionLabel(selectedSize),
    [selectedSize],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!product) return;
    
    // Base product images
    const base = Array.isArray(product.images) ? [...product.images] : [];
    
    // Get variant-specific images
    const sizeKey = selectedSize ? String(selectedSize.value ?? '') : null;
    const comboKey = selectedCombo ? String(selectedCombo.value ?? '') : null;
    const sizeImages = sizeKey ? variantImagesMap.sizes.get(sizeKey) || [] : [];
    const comboImages = comboKey ? variantImagesMap.combos.get(comboKey) || [] : [];

    // Prioritize variant images based on last selection
    const first = lastVariantPick === 'combo' ? comboImages : sizeImages;
    const second = lastVariantPick === 'combo' ? sizeImages : comboImages;
    
    // Combine variant images first
    const variantImages = [...first, ...second].filter(Boolean);
    const uniqueVariantImages: string[] = [];
    variantImages.forEach((img) => {
      if (!uniqueVariantImages.includes(img)) uniqueVariantImages.push(img);
    });
    
    // If we have variant images, use ONLY variant images (skip main product images)
    // If no variant images, fall back to main product images
    let finalImages: string[];
    if (uniqueVariantImages.length > 0) {
      finalImages = uniqueVariantImages;
      console.log('Using variant images only:', finalImages);
    } else {
      // No variant images available, use base product images
      const uniqueBaseImages: string[] = [];
      base.forEach((img) => {
        if (!uniqueBaseImages.includes(img)) uniqueBaseImages.push(img);
      });
      finalImages = uniqueBaseImages.length > 0 ? uniqueBaseImages : ['/product-images/create-a-mockup-of-white-tote-bag--aesthetic-backg.png'];
      console.log('Using base product images:', finalImages);
    }
    
    setDisplayImages(finalImages);
    
    // Set selected image with proper fallback
    const preferred = first[0] || second[0] || base[0] || finalImages[0];
    setSelectedImage(preferred);
    console.log('Selected image:', preferred);
  }, [product, selectedSize, selectedCombo, lastVariantPick, variantImagesMap]);

  useEffect(() => {
    const loadOrderConfig = async () => {
      try {
        const config = await getOrderConfig();
        setOrderConfig(config);
        setProductSettings(getProductSettings());
      } catch (error) {
        console.error('Failed to load order configuration:', error);
      }
    };
    loadOrderConfig();
  }, []);

  useEffect(() => {
    if (displayImages && displayImages.length > 0 && !imagesPreloaded) {
      const preloadProductImages = async () => {
        try {
          // thumbnails
          displayImages.forEach((image) => {
            const img = new Image();
            img.src = getPocketBaseImageUrl(
              image,
              Collections.PRODUCTS,
              'thumbnail',
              'webp',
            );
            img.loading = 'eager';
          });

          // main image
          if (displayImages[0]) {
            const mainImage = displayImages[0];
            const mediumQualityLink = document.createElement('link');
            mediumQualityLink.rel = 'preload';
            mediumQualityLink.as = 'image';
            mediumQualityLink.href = getPocketBaseImageUrl(
              mainImage,
              Collections.PRODUCTS,
              'medium',
              'webp',
            );
            mediumQualityLink.type = 'image/webp';
            mediumQualityLink.setAttribute('fetchpriority', 'high');
            document.head.appendChild(mediumQualityLink);

            setTimeout(() => {
              const highQualityLink = document.createElement('link');
              highQualityLink.rel = 'preload';
              highQualityLink.as = 'image';
              highQualityLink.href = getPocketBaseImageUrl(
                mainImage,
                Collections.PRODUCTS,
                'large',
                'webp',
              );
              highQualityLink.type = 'image/webp';
              document.head.appendChild(highQualityLink);
            }, 1000);
          }

          // others (lazy)
          if (displayImages.length > 1) {
            setTimeout(() => {
              displayImages.slice(1).forEach((image) => {
                const img = new Image();
                img.src = getPocketBaseImageUrl(
                  image,
                  Collections.PRODUCTS,
                  'medium',
                  'webp',
                );
                img.loading = 'lazy';
              });
            }, 1500);
          }

          setImagesPreloaded(true);
        } catch (error) {
          console.error('Error preloading images:', error);
        }
      };

      preloadProductImages();
    }
  }, [displayImages, imagesPreloaded]);

  useEffect(() => {
    if (relatedProducts.length > 0 && !relatedLoaded.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !relatedLoaded.current) {
              relatedProducts.forEach((p) => {
                if (p.images?.[0]) {
                  const img = new Image();
                  img.src = getPocketBaseImageUrl(
                    p.images[0],
                    Collections.PRODUCTS,
                    'thumbnail',
                    'webp',
                  );
                  img.loading = 'lazy';
                }
              });
              relatedLoaded.current = true;
              observer.disconnect();
            }
          });
        },
        { rootMargin: '400px' },
      );

      const relatedSection = document.querySelector('#related-products');
      if (relatedSection) observer.observe(relatedSection);

      return () => observer.disconnect();
    }
  }, [relatedProducts]);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} - Karigai`;
    } else {
      document.title = 'Product | Karigai';
    }
  }, [product]);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      setLoading(true);
      setError('');

      try {
        // Load product and configuration in parallel for faster loading
        const [data, config, productSettings] = await Promise.all([
          getProduct(id).catch(async (mainError) => {
            console.error('[PROD DEBUG] Main getProduct failed:', mainError);
            const record = await pocketbase.collection('products').getOne(id, {
              $autoCancel: false,
              requestKey: `prod_fallback_${id}_${Date.now()}`,
            });

            return {
              ...record,
              $id: record.id,
              name: record.name || 'Unknown Product',
              description: record.description || '',
              price: record.price || 0,
              dimensions: record.dimensions || '',
              material: record.material || '',
              category: record.category || '',
              bestseller: record.bestseller || false,
              new: record.new || false,
              inStock: record.inStock || false,
              images: Array.isArray(record.images)
                ? record.images.map((image: string) => `${record.id}/${image}`)
                : [],
              colors:
                typeof record.colors === 'string'
                  ? JSON.parse(record.colors)
                  : record.colors || [],
              features:
                typeof record.features === 'string'
                  ? JSON.parse(record.features)
                  : record.features || [],
              care:
                typeof record.care === 'string'
                  ? JSON.parse(record.care)
                  : record.care || [],
              tags:
                typeof record.tags === 'string'
                  ? JSON.parse(record.tags)
                  : record.tags || [],
              specifications: record.specifications || {},
              reviews: 0,
            } as Product;
          }),
          getOrderConfig().catch(() => DEFAULT_CONFIG),
          Promise.resolve(getProductSettings())
        ]);

        setProduct(data);
        setOrderConfig(config);
        setProductSettings(productSettings);

        // Don't set images here - let the variant image logic handle it
        // This will be handled by the useEffect that manages variant images
        console.log('Product loaded with images:', data.images);

        const initColors =
          (data as any).variants?.colors &&
          (data as any).variants.colors.length > 0
            ? (data as any).variants.colors
            : data.colors || [];
        if (initColors.length > 0) setSelectedColor(initColors[0]);

        const initSizes = (data as any).variants?.sizes || [];
        if (Array.isArray(initSizes) && initSizes.length > 0)
          setSelectedSize(initSizes[0]);

        // Don't auto-select combo - let user choose explicitly
        // const initCombos = (data as any).variants?.combos || [];
        // if (Array.isArray(initCombos) && initCombos.length > 0)
        //   setSelectedCombo(initCombos[0]);

        const viewedProductKey = `viewed_product_${data.id}`;
        if (!sessionStorage.getItem(viewedProductKey)) {
          trackProductView({
            item_id: data.id,
            item_name: data.name,
            price: Number(data.price) || 0,
            quantity: 1,
            item_category: data.category || 'Tote Bag',
            item_brand: 'Konipai',
            affiliation: 'Konipai Web Store',
          });
          sessionStorage.setItem(viewedProductKey, 'true');
        }

        if (data.reviews && data.reviews > 0) {
          try {
            const reviews = await getProductReviews(id);
            const avgRating =
              reviews.length > 0
                ? reviews.reduce(
                    (acc: number, r: { rating: number }) => acc + r.rating,
                    0,
                  ) / reviews.length
                : 0;
            setAverageRating(avgRating);
          } catch (reviewError) {
            console.error('[PROD DEBUG] Error loading reviews:', reviewError);
            setAverageRating(0);
          }
        }

        // Don't load related products immediately - use intersection observer instead
        // This will be handled by the intersection observer for better performance
        
      } catch (err) {
        console.error('[PROD DEBUG] Error loading product:', err);
        setError('Failed to load product. Please try refreshing the page.');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
    return () => {
      relatedLoaded.current = false;
    };
  }, [id]);

  // Lazy load related products when user scrolls near the section
  useEffect(() => {
    if (!product || relatedLoaded.current) return;

    const loadRelatedProducts = async () => {
      try {
        let relatedData: Product[] = [];
        
        if (product.category) {
          try {
            relatedData = await getProducts({ category: product.category });
          } catch (categoryError) {
            console.warn('[PROD DEBUG] Category filter failed, trying without category filter:', categoryError);
            // If category filter fails, get all products as fallback
            try {
              const allProducts = await getProducts();
              relatedData = allProducts.filter((p) => p.id !== product.id);
            } catch (fallbackError) {
              console.error('[PROD DEBUG] Fallback products fetch also failed:', fallbackError);
              relatedData = [];
            }
          }
        } else {
          // No category, get all products
          relatedData = await getProducts();
        }
        
        const filteredRelated = relatedData.filter((p) => p.id !== product.id).slice(0, 4);
        setRelatedProducts(filteredRelated);
        relatedLoaded.current = true;
      } catch (relatedError) {
        console.error('[PROD DEBUG] Error loading related products:', relatedError);
        setRelatedProducts([]);
      }
    };

    // Use intersection observer to load related products when user scrolls near
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !relatedLoaded.current) {
            loadRelatedProducts();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' } // Load when 200px away from the section
    );

    // Create a target element to observe
    const target = document.createElement('div');
    target.id = 'related-products-trigger';
    target.style.position = 'absolute';
    target.style.bottom = '400px'; // Trigger when 400px from bottom
    target.style.height = '1px';
    target.style.width = '1px';
    document.body.appendChild(target);
    observer.observe(target);

    return () => {
      observer.disconnect();
      const existingTarget = document.getElementById('related-products-trigger');
      if (existingTarget) {
        document.body.removeChild(existingTarget);
      }
    };
  }, [product]);

  const handlePrevImage = () => {
    if (!displayImages || displayImages.length === 0 || !selectedImage) return;
    const idx = displayImages.indexOf(selectedImage);
    const prevIdx = idx <= 0 ? displayImages.length - 1 : idx - 1;
    handleImageSelect(displayImages[prevIdx]);
  };

  const handleNextImage = () => {
    if (!displayImages || displayImages.length === 0 || !selectedImage) return;
    const idx = displayImages.indexOf(selectedImage);
    const nextIdx = idx >= displayImages.length - 1 ? 0 : idx + 1;
    handleImageSelect(displayImages[nextIdx]);
  };

  const handleImageSelect = (image: string) => {
    setSelectedImage(image);

    const mediumQualityLink = document.createElement('link');
    mediumQualityLink.rel = 'preload';
    mediumQualityLink.as = 'image';
    mediumQualityLink.href = getPocketBaseImageUrl(
      image,
      Collections.PRODUCTS,
      'medium',
      'webp',
    );
    mediumQualityLink.type = 'image/webp';
    document.head.appendChild(mediumQualityLink);

    setTimeout(() => {
      const highQualityLink = document.createElement('link');
      highQualityLink.rel = 'preload';
      highQualityLink.as = 'image';
      highQualityLink.href = getPocketBaseImageUrl(
        image,
        Collections.PRODUCTS,
        'large',
        'webp',
      );
      highQualityLink.type = 'image/webp';
      document.head.appendChild(highQualityLink);
    }, 500);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (swipeDisabled || e.pointerType !== 'touch') return;
    const tgt = e.target as HTMLElement;
    if (tgt && tgt.closest('[data-no-swipe="true"]')) return;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    swipeStartTime.current = Date.now();
    swipeActive.current = true;
    isSwiping.current = false;
    activePointerId.current = e.pointerId;
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (swipeDisabled || e.pointerType !== 'touch') return;
    if (!swipeActive.current || swipeStartX.current === null || swipeStartY.current === null)
      return;
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    const dx = e.clientX - swipeStartX.current;
    const dy = e.clientY - swipeStartY.current;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (!isSwiping.current && absX < 6 && absY < 6) return;
    if (!isSwiping.current && absY > absX && absY > 16) {
      swipeActive.current = false;
      isSwiping.current = false;
      return;
    }
    if (!isSwiping.current && absX > 24 && absX > absY * 1.5) {
      isSwiping.current = true;
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (swipeDisabled || e.pointerType !== 'touch') return;
    if (!swipeActive.current || swipeStartX.current === null) return;
    const endTime = Date.now();
    const duration = endTime - swipeStartTime.current;
    const dx = e.clientX - swipeStartX.current;
    const threshold = 90;
    const maxDuration = 600;
    const shouldHandle =
      isSwiping.current && Math.abs(dx) >= threshold && duration <= maxDuration;
    swipeActive.current = false;
    isSwiping.current = false;
    swipeStartX.current = null;
    swipeStartY.current = null;
    activePointerId.current = null;
    if (shouldHandle) {
      if (dx < 0) handleNextImage();
      else handlePrevImage();
    }
  };

  const handlePointerCancel = () => {
    if (swipeDisabled) return;
    swipeActive.current = false;
    isSwiping.current = false;
    swipeStartX.current = null;
    swipeStartY.current = null;
    activePointerId.current = null;
  };

  const decreaseQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Handle Buy Any X combo selections
    if (selectedCombo && selectedBuyAnyXProducts[selectedCombo.value] && selectedBuyAnyXProducts[selectedCombo.value].length > 0) {
      const selectedVariants = selectedBuyAnyXProducts[selectedCombo.value];
      const requiredQuantity = selectedCombo.items || 2;
      
      if (selectedVariants.length !== requiredQuantity) {
        toast({
          title: "Incomplete Selection",
          description: `Please select ${requiredQuantity} variants to complete your ${selectedCombo.name} bundle.`,
          variant: "destructive"
        });
        return;
      }

      // Add combo as a single cart item with variant details
      const comboOptions: Record<string, string> = {
        combo: selectedCombo.name,
        comboType: 'buy_any_x',
        variants: JSON.stringify(selectedVariants),
        discountType: selectedCombo.discountType || 'percent',
        discountValue: String(selectedCombo.discountValue || 0)
      };

      addItem(
        product,
        quantity,
        selectedColor?.value || '',
        comboOptions,
        effectivePrice,
      );
    } else {
      // Regular single item or regular combo
      addItem(
        product,
        quantity,
        selectedColor?.value || '',
        {
          ...(selectedSize ? { size: String(selectedSize.value) } : {}),
          ...(selectedCombo ? { combo: String(selectedCombo.value) } : {}),
        },
        effectivePrice,
      );
    }

    const now = Date.now();
    const THROTTLE_MS = 2000;

    if (now - lastAddToCartRef.current > THROTTLE_MS) {
      trackAddToCart({
        item_id: product.id,
        item_name: product.name,
        price: Number(effectivePrice) || 0,
        quantity,
        item_variant: selectedColor?.value,
        item_category: product.category || 'Tote Bag',
        item_brand: 'Konipai',
        affiliation: 'Konipai Web Store',
      });

      trackButtonClick('add_to_cart_button', 'Add to Cart', window.location.pathname);
      lastAddToCartRef.current = now;
    }

    toast({
      title: 'Added to cart',
      description: `${quantity} ${product.name} added to your cart`,
    });
  };

  const toggleWishlist = async () => {
    const now = Date.now();
    const THROTTLE_MS = 2000;

    if (now - lastWishlistActionRef.current > THROTTLE_MS) {
      trackButtonClick(
        isWishlisted ? 'remove_from_wishlist_button' : 'add_to_wishlist_button',
        isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist',
        window.location.pathname,
      );
      lastWishlistActionRef.current = now;
    }

    try {
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Please Login',
          description: 'You need to login to add items to your wishlist.',
        });
        return;
      }

      setIsWishlisted(!isWishlisted);

      if (!isWishlisted) {
        await pocketbase.collection('wishlist').create({
          user: user.id,
          product: product!.id,
        });
        toast({
          title: 'Added to Wishlist',
          description: `${product!.name} has been added to your wishlist.`,
        });
      } else {
        const record = await pocketbase
          .collection('wishlist')
          .getFirstListItem(`user="${user.id}" && product="${product!.id}"`);
        await pocketbase.collection('wishlist').delete(record.id);
        toast({
          title: 'Removed from Wishlist',
          description: `${product!.name} has been removed from your wishlist.`,
        });
      }
    } catch (err) {
      console.error('Error updating wishlist:', err);
      setIsWishlisted(!isWishlisted);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update your wishlist. Please try again.',
      });
    }
  };

  const handleShare = async () => {
    try {
      trackButtonClick('share_button', 'Share', window.location.pathname);

      if (navigator.share) {
        await navigator.share({
          title: product?.name,
          text: `Check out ${product?.name} at Karigai!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link Copied',
          description: 'The product link has been copied to your clipboard.',
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
  ];

  if (product?.category) {
    breadcrumbItems.push({
      label: product.category.charAt(0).toUpperCase() + product.category.slice(1),
      href: `/shop?category=${product.category}`,
    });
  }

  if (product?.name) {
    breadcrumbItems.push({
      label: product.name,
    });
  }

  // SIMPLE loading / error states
  if (loading) {
    return (
      <div className="konipai-container max-w-7xl mx-auto px-4 py-10">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Skeleton className="aspect-square rounded-xl" />
            <div className="mt-4 grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="konipai-container max-w-7xl mx-auto px-4 py-20 text-center">
        <ImageIcon className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-semibold">Product not available</h1>
        <p className="mb-6 text-muted-foreground">
          {error || "Sorry, we couldn't find the product you're looking for."}
        </p>
        <Button asChild variant="outline">
          <Link to="/shop">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to shop
          </Link>
        </Button>
      </div>
    );
  }

  const unitPrice =
    typeof effectivePrice === 'number'
      ? effectivePrice
      : Number(effectivePrice) || 0;

  const selectedTotal = unitPrice * quantity;

  const discountPercent =
    product && typeof product.original_price === 'number' && product.original_price > unitPrice
      ? Math.round((1 - unitPrice / product.original_price) * 100)
      : null;

  const selectionLabelParts: string[] = [];
  if (selectedSizeLabel) selectionLabelParts.push(selectedSizeLabel);
  if (selectedCombo?.name) selectionLabelParts.push(selectedCombo.name);
  const selectionLabel = selectionLabelParts.join(' · ');

  const sizeOptions = (product as any).variants?.sizes || [];
  const comboOptions = (product as any).variants?.combos || [];
  const colorOptions =
    (product as any).variants?.colors &&
    (product as any).variants.colors.length > 0
      ? (product as any).variants.colors
      : product.colors || [];

  return (
    <div className="bg-background pb-24 md:pb-10">
      <div className="konipai-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* breadcrumbs */}
        <div className="hidden md:block pt-6 pb-4">
          <Breadcrumbs items={breadcrumbItems} isLoading={loading} />
        </div>

        {/* main grid */}
        <div className="grid gap-6 md:gap-10 md:grid-cols-2 md:pt-4">
          {/* IMAGE COLUMN */}
          <div className="md:sticky md:top-20 space-y-4">
            <Card
              className="relative overflow-hidden rounded-xl border bg-white shadow-sm touch-pan-y select-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={handlePointerCancel}
            >
              {selectedImage ? (
                <>
                  <ProductImage
                    key={selectedImage || 'main-image'}
                    url={selectedImage}
                    alt={product.name}
                    className="aspect-square w-full object-cover"
                    priority={true}
                    width={700}
                    height={700}
                    size="large"
                    aspectRatio="square"
                  />

                  {/* mobile back */}
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="md:hidden absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-foreground shadow"
                    data-no-swipe="true"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  {/* desktop actions */}
                  <div className="hidden md:flex md:flex-col md:gap-2 md:absolute md:right-4 md:top-4">
                    <button
                      onClick={toggleWishlist}
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-full bg-white/90 text-muted-foreground shadow hover:text-foreground',
                        isWishlisted && 'text-red-500',
                      )}
                      data-no-swipe="true"
                      title={
                        isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'
                      }
                    >
                      <Heart
                        className="h-4 w-4"
                        fill={isWishlisted ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      onClick={handleShare}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-muted-foreground shadow hover:text-foreground"
                      data-no-swipe="true"
                      title="Share product"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* pager dots mobile */}
                  {displayImages?.length > 1 && (
                    <div
                      className="md:hidden absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs shadow"
                      data-no-swipe="true"
                    >
                      {displayImages.map((img, i) => (
                        <button
                          key={img || i}
                          type="button"
                          aria-label={`Go to image ${i + 1}`}
                          onClick={() => handleImageSelect(img)}
                          className={cn(
                            'rounded-full transition-all',
                            currentIndex === i
                              ? 'h-1.5 w-6 bg-gray-700'
                              : 'h-1 w-1 bg-gray-400/80',
                          )}
                          data-no-swipe="true"
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-square items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </Card>

            {/* thumbnails (show only when there are multiple images) */}
            {displayImages?.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {displayImages.map((image, index) => (
                  <button
                    key={image || index}
                    type="button"
                    onClick={() => handleImageSelect(image)}
                    className={cn(
                      'relative overflow-hidden rounded-lg border bg-white transition-all',
                      selectedImage === image
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-transparent hover:border-primary/40',
                    )}
                    aria-label={`View ${product.name} image ${index + 1}`}
                  >
                    <ProductImage
                      url={image}
                      alt={`${product.name} ${index + 1}`}
                      className="aspect-square w-full object-cover"
                      width={140}
                      height={140}
                      size="thumbnail"
                      priority={index < 2}
                      aspectRatio="square"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO COLUMN */}
          <div className="space-y-6">
            {/* title + rating + tags */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {product.bestseller && (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    Bestseller
                  </Badge>
                )}
                {product.new && (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    New
                  </Badge>
                )}
                {!product.inStock && (
                  <Badge variant="outline" className="border-amber-400 text-amber-700">
                    Pre-order
                  </Badge>
                )}
              </div>

              {/* Desktop title + rating */}
              <div className="hidden md:block space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {product.name}
                  {selectedSizeLabel && (
                    <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">
                      · {selectedSizeLabel}
                    </span>
                  )}
                </h1>

                {orderConfig.showStarRating && (product.reviews || 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      <span>{averageRating.toFixed(1)}</span>
                      <Star className="h-3 w-3 fill-current" />
                    </div>
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      {Array(5)
                        .fill(null)
                        .map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-3.5 w-3.5',
                              i < Math.round(averageRating) && 'fill-current',
                            )}
                          />
                        ))}
                    </div>
                    <Link
                      to="#reviews"
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      ({product.reviews || 0} reviews)
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile compact header: title + price + discount + rating/reviews */}
              <div className="md:hidden space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    {product.name}
                  </h1>
                  {selectedSizeLabel && (
                    <span className="ml-1 align-middle text-xs font-medium text-muted-foreground">
                      · {selectedSizeLabel}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Price + discount on the left */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-primary">
                      ₹{unitPrice.toFixed(2)}
                    </span>
                    {discountPercent !== null && product.original_price && (
                      <span className="text-[11px] text-muted-foreground line-through">
                        ₹{product.original_price.toFixed(2)}
                      </span>
                    )}
                    {discountPercent !== null && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {/* Rating + review count on the right (only when > 0 reviews) */}
                  {orderConfig.showStarRating && (product.reviews || 0) > 0 && (
                    <div className="ml-auto flex items-center gap-1">
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <span>{averageRating.toFixed(1)}</span>
                        <Star className="h-3 w-3 fill-current" />
                      </div>
                      <Link
                        to="#reviews"
                        className="text-[11px] text-muted-foreground hover:text-primary"
                      >
                        ({product.reviews || 0} reviews)
                      </Link>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Inclusive of all taxes · {product.free_shipping ? (
                    <span className="text-green-600 font-medium">Free Delivery</span>
                  ) : (
                    'Free shipping on eligible orders'
                  )}
                </p>
              </div>
            </div>

            {/* price block (desktop only) */}
            <div className="hidden md:block space-y-2 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-2xl font-bold text-primary">
                  ₹{unitPrice.toFixed(2)}
                </p>
                {discountPercent !== null && product.original_price && (
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{product.original_price.toFixed(2)}
                  </span>
                )}
                {discountPercent !== null && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Inclusive of all taxes · {product.free_shipping ? (
                  <span className="text-green-600 font-medium">Free Delivery</span>
                ) : (
                  'Free shipping on eligible orders'
                )}
              </p>
            </div>

            {/* variants */}
            <div className="space-y-4">
              {/* colors */}
              {colorOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Color
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {selectedColor?.name || 'Choose'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color: any) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          'relative h-9 w-9 rounded-full border bg-white transition-all',
                          selectedColor?.value === color.value
                            ? 'border-primary ring-2 ring-primary/40'
                            : 'border-border hover:border-primary/60',
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {selectedColor?.value === color.value && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white drop-shadow" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* size */}
              {sizeOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Size
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedSizeLabel || 'Choose'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((sz: any) => (
                      <button
                        key={sz.value}
                        type="button"
                        onClick={() => {
                          setSelectedSize(sz);
                          setSelectedCombo(null); // Clear combo when size is selected
                          setLastVariantPick('size');
                        }}
                        disabled={sz.inStock === false}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                          selectedSize?.value === sz.value
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-white text-foreground hover:border-primary/50',
                          sz.inStock === false &&
                            'cursor-not-allowed opacity-40 line-through',
                        )}
                      >
                        {formatSizeOptionLabel(sz)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* combos */}
              {comboOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Combo <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedCombo?.name || 'None selected'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {comboOptions.map((cb: any) => {
                      const baseName = stripPcsSuffix(cb.name || '');
                      const suffix =
                        cb.discountType && typeof cb.discountValue === 'number'
                          ? ` −${
                              cb.discountType === 'percent'
                                ? `${cb.discountValue}%`
                                : `₹${cb.discountValue}`
                            }`
                          : '';
                      return (
                        <button
                          key={cb.value}
                          type="button"
                          onClick={() => {
                            // Toggle combo selection - click same combo to deselect
                            if (selectedCombo?.value === cb.value) {
                              setSelectedCombo(null);
                            } else {
                              setSelectedCombo(cb);
                            }
                            setLastVariantPick('combo');
                          }}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                            selectedCombo?.value === cb.value
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-border bg-white text-foreground hover:border-blue-400',
                          )}
                          title={cb.description || cb.name}
                        >
                          {`${baseName}${suffix}`.trim()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Buy Any X Combos - Always show, but with different behavior based on variants */}
              {true && (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-foreground mb-3">
                    Bundle Options <span className="text-xs font-normal text-muted-foreground">(Mix & Match)</span>
                  </div>
                  
                  {/* Quick Bundle Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {[
                      { name: 'Buy Any 2', value: 'buy-any-2', requiredQuantity: 2, discount: '10% off' },
                      { name: 'Buy Any 3', value: 'buy-any-3', requiredQuantity: 3, discount: '15% off' },
                      { name: 'Buy Any 4', value: 'buy-any-4', requiredQuantity: 4, discount: '20% off' }
                    ].map((bundle) => (
                      <button
                        key={bundle.value}
                        type="button"
                        onClick={() => {
                          // Create a synthetic combo for this bundle
                          const syntheticCombo = {
                            name: bundle.name,
                            value: bundle.value,
                            items: bundle.requiredQuantity,
                            type: 'custom' as const,
                            discountType: 'percent' as const,
                            discountValue: parseInt(bundle.discount.replace(/[^0-9]/g, ''))
                          };
                          
                          if (selectedCombo?.value === bundle.value) {
                            setSelectedCombo(null);
                            // Clear selections for this combo
                            setSelectedBuyAnyXProducts(prev => ({
                              ...prev,
                              [bundle.value]: []
                            }));
                          } else {
                            setSelectedCombo(syntheticCombo);
                            // Initialize empty selection for this combo
                            setSelectedBuyAnyXProducts(prev => ({
                              ...prev,
                              [bundle.value]: []
                            }));
                          }
                          setLastVariantPick('combo');
                        }}
                        className={cn(
                          'p-3 text-left rounded-lg border transition-all',
                          selectedCombo?.value === bundle.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-border bg-white text-foreground hover:border-blue-400 hover:bg-blue-50/50'
                        )}
                      >
                        <div className="font-medium text-sm">{bundle.name}</div>
                        <div className="text-xs text-muted-foreground">{bundle.discount}</div>
                      </button>
                    ))}
                  </div>

                  {/* Show variant selection when a combo is selected */}
                  {selectedCombo && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {selectedCombo.name || 'Bundle Selection'} 
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            (Select {selectedCombo.items || 2} variants)
                          </span>
                        </span>
                        <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                          {(selectedBuyAnyXProducts[selectedCombo.value] || []).length} / {selectedCombo.items || 2} selected
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300 shadow-sm">
                        <div className="text-sm font-medium text-blue-900 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                          Choose {selectedCombo.items || 2} variants to complete your bundle:
                        </div>
                        
                        {(selectedBuyAnyXProducts[selectedCombo.value] || []).length === 0 && (
                          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-xs text-yellow-800 font-medium mb-1">
                              👆 Getting Started:
                            </div>
                            <div className="text-xs text-yellow-700">
                              Select {selectedCombo.items || 2} different variants below to create your personalized bundle!
                            </div>
                          </div>
                        )}
                            
                            <div className="space-y-4">
                              {/* Size Variants */}
                              {sizeOptions.length > 0 && (
                                <div className="space-y-3">
                                  <h4 className="text-sm font-medium text-gray-900">Available Sizes</h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {sizeOptions.map((size: any) => {
                                      const variantKey = `size-${size.value}`;
                                      const isSelected = (selectedBuyAnyXProducts[selectedCombo.value] || []).includes(variantKey);
                                      return (
                                        <div key={variantKey} className={cn(
                                          "flex items-center space-x-2 p-3 rounded-lg border transition-all cursor-pointer",
                                          isSelected 
                                            ? "bg-white border-blue-300 shadow-sm" 
                                            : "bg-white/70 border-gray-200 hover:border-blue-200 hover:bg-white"
                                        )}>
                                          <input
                                            type="checkbox"
                                            id={`variant-${variantKey}`}
                                            checked={isSelected}
                                            onChange={(e) => {
                                              const comboValue = selectedCombo.value;
                                              const isChecked = e.target.checked;
                                              const requiredQty = selectedCombo.items || 2;
                                              
                                              setSelectedBuyAnyXProducts(prev => {
                                                const currentSelected = prev[comboValue] || [];
                                                
                                                if (isChecked) {
                                                  if (currentSelected.length < requiredQty) {
                                                    return {
                                                      ...prev,
                                                      [comboValue]: [...currentSelected, variantKey]
                                                    };
                                                  } else {
                                                    toast({
                                                      title: "Selection limit reached",
                                                      description: `You can only select ${requiredQty} items for this combo`,
                                                      variant: "destructive"
                                                    });
                                                    return prev;
                                                  }
                                                } else {
                                                  return {
                                                    ...prev,
                                                    [comboValue]: currentSelected.filter(id => id !== variantKey)
                                                  };
                                                }
                                              });
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <label htmlFor={`variant-${variantKey}`} className="flex-1 cursor-pointer">
                                            <div className="text-sm font-medium text-gray-900">
                                              {size.name || size.value} {size.unit || ''}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {size.priceOverride ? `₹${size.priceOverride}` : `₹${product.price}`}
                                            </div>
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Color Variants */}
                              {colorOptions.length > 0 && (
                                <div className="space-y-3">
                                  <h4 className="text-sm font-medium text-gray-900">Available Colors</h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {colorOptions.map((color: any) => {
                                      const variantKey = `color-${color.value}`;
                                      const isSelected = (selectedBuyAnyXProducts[selectedCombo.value] || []).includes(variantKey);
                                      return (
                                        <div key={variantKey} className={cn(
                                          "flex items-center space-x-2 p-3 rounded-lg border transition-all cursor-pointer",
                                          isSelected 
                                            ? "bg-white border-blue-300 shadow-sm" 
                                            : "bg-white/70 border-gray-200 hover:border-blue-200 hover:bg-white"
                                        )}>
                                          <input
                                            type="checkbox"
                                            id={`variant-${variantKey}`}
                                            checked={isSelected}
                                            onChange={(e) => {
                                              const comboValue = selectedCombo.value;
                                              const isChecked = e.target.checked;
                                              const requiredQty = selectedCombo.items || 2;
                                              
                                              setSelectedBuyAnyXProducts(prev => {
                                                const currentSelected = prev[comboValue] || [];
                                                
                                                if (isChecked) {
                                                  if (currentSelected.length < requiredQty) {
                                                    return {
                                                      ...prev,
                                                      [comboValue]: [...currentSelected, variantKey]
                                                    };
                                                  } else {
                                                    toast({
                                                      title: "Selection limit reached",
                                                      description: `You can only select ${requiredQty} items for this combo`,
                                                      variant: "destructive"
                                                    });
                                                    return prev;
                                                  }
                                                } else {
                                                  return {
                                                    ...prev,
                                                    [comboValue]: currentSelected.filter(id => id !== variantKey)
                                                  };
                                                }
                                              });
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <div className="flex items-center space-x-2 flex-1">
                                            <div 
                                              className="w-4 h-4 rounded-full border border-gray-300"
                                              style={{ backgroundColor: color.hex || color.value }}
                                            />
                                            <label htmlFor={`variant-${variantKey}`} className="cursor-pointer">
                                              <div className="text-sm font-medium text-gray-900">
                                                {color.name || color.value}
                                              </div>
                                            </label>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* If no variants available, show message */}
                              {sizeOptions.length === 0 && colorOptions.length === 0 && (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                  <div className="text-4xl mb-3">🎯</div>
                                  <p className="text-sm font-medium text-gray-700">No variants available for this product</p>
                                  <p className="text-xs mt-2 text-gray-500">This product doesn't have different sizes or colors to mix and match.</p>
                                  <p className="text-xs mt-1 text-gray-500">Bundle options work best with products that have multiple variants.</p>
                                </div>
                              )}
                            </div>
                            
                        <div className="mt-4 p-3 bg-blue-100/50 rounded-lg">
                          <div className="text-xs text-blue-800 font-medium mb-1">
                            Bundle Benefits:
                          </div>
                          <div className="text-xs text-blue-700">
                            • Mix & match different sizes and colors
                            • {selectedCombo.discountType === 'percent' ? `${selectedCombo.discountValue}% off` : selectedCombo.discountType === 'amount' ? `₹${selectedCombo.discountValue} off` : 'Special bundle pricing'}
                            • Free shipping on bundles
                            • Perfect for gifts or personal variety
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Enhanced qty + add to cart (desktop & tablet only; mobile uses sticky bar) */}
            <Card className="hidden md:flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm">
              {/* Selection Summary */}
              {(selectedSize || selectedCombo) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Selected:</span>
                  {selectedSize && (
                    <Badge variant="outline" className="text-xs">
                      {selectedSize.name || `${selectedSize.value} ${selectedSize.unit || ''}`.trim()}
                    </Badge>
                  )}
                  {selectedCombo && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {selectedCombo.name}
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Qty
                  </span>
                  <div className="flex items-center overflow-hidden rounded-full border bg-white text-[13px]">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      className="grid h-6 w-6 place-items-center bg-primary/5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[22px] px-0.5 border-x border-border/60 bg-white text-center font-semibold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={increaseQuantity}
                      className="grid h-6 w-6 place-items-center bg-primary/5 text-muted-foreground transition-colors hover:bg-muted"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-1 items-center justify-end gap-3">
                  <div className="text-right text-sm">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold">
                      ₹{selectedTotal.toFixed(2)}
                    </p>
                    {selectedCombo && (
                      <p className="text-xs text-green-600">Bundle savings applied!</p>
                    )}
                  </div>
                  <Button
                    className="flex-1 max-w-[180px]"
                    onClick={handleAddToCart}
                    disabled={!product.inStock}
                    size="lg"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {product.inStock ? 'Add to Cart' : 'Notify Me'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* description / reviews tabs full width */}
        <div className="mt-3 mb-20 md:mb-3 rounded-xl bg-white p-3 shadow-sm md:p-4">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="inline-flex h-10 w-full gap-1 rounded-full bg-muted/70 p-1 text-sm">
              <TabsTrigger
                value="description"
                className="flex-1 rounded-full px-4 py-1 text-xs font-medium text-muted-foreground transition data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Description
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="flex-1 rounded-full px-4 py-1 text-xs font-medium text-muted-foreground transition data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Reviews ({product.reviews || 0})
              </TabsTrigger>
            </TabsList>

            <Separator className="mt-2" />

            <TabsContent value="description" className="mt-2">
              <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
                <ProductDetails product={product} />
              </Suspense>
            </TabsContent>

            <TabsContent value="reviews" className="mt-2" id="reviews">
              {orderConfig?.showReviews && (
                <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
                  <ProductReviews
                    productId={id!}
                    initialReviewCount={product.reviews}
                    onReviewAdded={async () => {
                    if (!id) return;
                    try {
                      const updatedProduct = await getProduct(id);
                      setProduct(updatedProduct);
                      const reviews = await getProductReviews(id);
                      if (reviews.length > 0) {
                        const total = reviews.reduce(
                          (acc: number, r: { rating: number }) =>
                            acc + r.rating,
                          0,
                        );
                        const avg = total / reviews.length;
                        setAverageRating(avg);
                      } else {
                        setAverageRating(0);
                      }
                    } catch (err) {
                      console.error(
                        '[PROD DEBUG] Error refreshing product after review:',
                        err,
                      );
                    }
                  }}
                />
                </Suspense>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 md:mt-10" id="related-products">
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              You may also like
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  to={`/product/${relatedProduct.id}`}
                  className="group block rounded-xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative mb-3 overflow-hidden rounded-lg">
                    <ProductImage
                      url={relatedProduct.images?.[0] || ''}
                      alt={relatedProduct.name}
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                      width={300}
                      height={300}
                      size="medium"
                      priority={false}
                      aspectRatio="square"
                    />
                    <div className="absolute left-2 top-2 flex flex-col gap-1">
                      {relatedProduct.bestseller && (
                        <Badge className="bg-orange-500 text-white hover:bg-orange-500">
                          Best
                        </Badge>
                      )}
                      {relatedProduct.new && (
                        <Badge className="bg-blue-500 text-white hover:bg-blue-500">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
                      {relatedProduct.name}
                    </h3>
                    <p className="text-sm font-semibold">
                      ₹
                      {typeof relatedProduct.price === 'number'
                        ? relatedProduct.price.toFixed(2)
                        : '0.00'}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {(() => {
                        const colors = Array.isArray(relatedProduct.colors)
                          ? relatedProduct.colors
                          : typeof relatedProduct.colors === 'string'
                          ? (() => {
                              try {
                                return JSON.parse(
                                  relatedProduct.colors as unknown as string,
                                );
                              } catch {
                                return [];
                              }
                            })()
                          : [];
                        return (
                          <>
                            {colors.slice(0, 4).map((color: any) => (
                              <div
                                key={
                                  color.value ??
                                  color.hex ??
                                  color.name ??
                                  Math.random()
                                }
                                className="h-3 w-3 rounded-full border border-gray-300"
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                              />
                            ))}
                            {colors.length > 4 && (
                              <div className="flex h-3 w-3 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-[8px] font-medium">
                                +{colors.length - 4}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* floating whatsapp */}
        {product && (
          <a
            href={`https://wa.me/919486054899?text=${encodeURIComponent(
              `Hi Karigai, I'd like to order: ${product.name}`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-28 right-4 z-50 md:bottom-8 md:right-8"
            aria-label="Order via WhatsApp"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                className="h-7 w-7 fill-current"
              >
                <path d="M27.1 4.9A13.9 13.9 0 0 0 16 .1C7.3.1.2 7.2.2 15.9c0 2.8.8 5.5 2.2 7.8L.1 32l8.5-2.2c2.2 1.2 4.7 1.9 7.3 1.9 8.7 0 15.8-7.1 15.8-15.8 0-4.2-1.7-8.2-4.6-11zm-11.1 24c-2.3 0-4.6-.6-6.6-1.8l-.5-.3-5.1 1.3 1.4-5-.3-.5c-1.3-2.1-2-4.5-2-7 0-7.3 6-13.3 13.3-13.3 3.6 0 6.9 1.4 9.4 3.9 2.5 2.5 3.9 5.8 3.9 9.4 0 7.3-6 13.3-13.3 13.3zm7.3-9.9c-.4-.2-2.3-1.1-2.6-1.2-.4-.1-.6-.2-.9.2-.3.4-1 1.2-1.2 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.3-2.1-2.7-.2-.4 0-.6.2-.8.2-.2.4-.4.5-.6.2-.2.3-.4.4-.6.1-.2 0-.5 0-.7s-.9-2.1-1.2-2.9c-.3-.7-.6-.6-.9-.6h-.8c-.3 0-.7.1-1 .5-.3.4-1.3 1.3-1.3 3.2s1.4 3.7 1.6 4 .3.6.6 1c.8 1.1 1.8 2.1 3 2.8 1 .6 2 .8 2.7 1 .9.3 1.8.2 2.5.1.8-.1 2.3-.9 2.6-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5z" />
              </svg>
            </div>
          </a>
        )}

        {/* mobile bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 py-2.5 shadow-[0_-6px_16px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
          <div className="konipai-container mx-auto max-w-7xl px-4 space-y-2">
            {/* variant + qty + button row */}
            <div className="flex w-full items-center gap-2">
              <span className="inline-flex min-w-[96px] max-w-[40%] items-center truncate rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {selectionLabel || 'Choose option'}
              </span>
              <div className="ml-auto flex items-center overflow-hidden rounded-full border bg-white text-[13px]">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="grid h-7 w-7 place-items-center bg-primary/5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-[24px] px-0.5 border-x border-border/60 bg-white text-center font-semibold">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={increaseQuantity}
                  className="grid h-7 w-7 place-items-center bg-primary/5 text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {!isInCart && (
                <Button
                  className="flex-1 max-w-[160px]"
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {product.inStock ? 'Add to cart' : 'Out of stock'}
                </Button>
              )}
            </div>

            {/* total + secondary actions */}
            {isInCart ? (
              <div className="flex w-full items-center gap-3">
                <Button
                  variant="outline"
                  className="relative flex-1 justify-center"
                  asChild
                >
                  <Link to="/cart">
                    <ShoppingCart className="mr-2 h-4 w-4" /> View cart
                    {currentItemQty > 0 && (
                      <span className="absolute -top-1 -left-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                        {currentItemQty}
                      </span>
                    )}
                  </Link>
                </Button>
                <Button className="flex-1" asChild>
                  <Link to="/checkout">Buy now</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="text-sm font-semibold text-foreground">
                  ₹{selectedTotal.toFixed(2)}
                </div>
                <span>Total for selected options</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
