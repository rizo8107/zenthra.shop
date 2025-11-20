import { Check, Play, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type Product } from '@/lib/pocketbase';
import { useState, useEffect, useRef, useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProductImage } from '@/components/ProductImage';
import { VideoPlayerFallback } from '@/components/ui/video-player-fallback';
import { VideoPlayer } from '@/components/ui/video-player';
import { pocketbase, Collections, getProducts } from '@/lib/pocketbase';
import { getOrderConfig, type OrderDetailsConfig } from '@/lib/order-config-service';

import { getPocketBaseImageUrl } from '@/utils/imageOptimizer';

// Helper function to extract YouTube video ID from URL
const getYouTubeVideoId = (url: string | undefined): string | null => {
  if (!url) return null;
  
  // Match YouTube URL patterns
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return match[2];
  }
  
  return null;
};

// Helper function to check if URL is a YouTube video
const isYouTubeUrl = (url: string | undefined): boolean => {
  return !!getYouTubeVideoId(url);
};

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url: string | undefined): string => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return '';
};

// Helper function to check if URL is a direct video file
const isVideoFileUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  
  // Check for common video file extensions
  const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.avi', '.wmv', '.m4v', '.mpg', '.mpeg'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

// Helper function to check if URL is a PocketBase file
const isPocketBaseFileUrl = (url?: string): boolean => {
  if (!url) return false;

  // Check if it's a PocketBase file URL pattern (contains /api/files/)
  if (url.includes('/api/files/')) {
    return true;
  }

  return !url.startsWith('http');
};

// Helper function to extract record ID and filename from PocketBase URL
const extractPocketBaseFileInfo = (url: string | undefined): { recordId: string, filename: string } | null => {
  if (!url) return null;
  
  // If it's a full URL with /api/files/ pattern
  if (url.includes('/api/files/')) {
    const parts = url.split('/api/files/')[1].split('/');
    if (parts.length >= 3) {
      const collection = parts[0];
      const recordId = parts[1];
      const filename = parts.slice(2).join('/');
      return { recordId, filename };
    }
  } 
  // If it's a relative URL in format recordId/filename
  else if (url.includes('/')) {
    const [recordId, ...filenameParts] = url.split('/');
    const filename = filenameParts.join('/');
    if (recordId && filename) {
      return { recordId, filename };
    }
  }
  
  return null;
};

// Helper function to get the full PocketBase file URL
const getPocketBaseFileUrl = (url: string | undefined, productId?: string): string => {
  if (!url) return '';
  
  // If it's already a full URL, return it
  if (url.startsWith('http')) {
    return url;
  }
  
  // Otherwise, construct the full URL using PocketBase baseUrl
  const baseUrl = pocketbase.baseUrl.endsWith('/') 
    ? pocketbase.baseUrl.slice(0, -1) 
    : pocketbase.baseUrl;
  
  // If URL contains a slash, it's already in format "recordId/filename"
  if (url.includes('/')) {
    return `${baseUrl}/api/files/${Collections.PRODUCTS}/${url}`;
  }
  
  // Otherwise, we need the productId to construct the full path
  if (productId) {
    return `${baseUrl}/api/files/${Collections.PRODUCTS}/${productId}/${url}`;
  }
    
  return `${baseUrl}/api/files/${Collections.PRODUCTS}/${url}`;
};

interface ProductDetailsProps {
  product: Product;
}

export const ProductDetails = ({ product }: ProductDetailsProps) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [orderConfig, setOrderConfig] = useState<OrderDetailsConfig | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);
  const [recommendationsVisible, setRecommendationsVisible] = useState(false);
  const recommendationsRef = useRef<HTMLDivElement | null>(null);

  // Load backend-driven toggles for product sections
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await getOrderConfig({ forceRefresh: true });
        if (mounted) setOrderConfig(cfg);
      } catch (e) {
        // ignore; defaults will show sections
        if (mounted) setOrderConfig(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Generate or fetch thumbnail for the video
  useEffect(() => {
    if (!product?.videoUrl) return;
    
    setThumbnailLoading(true);
    setThumbnailError(false);
    
    // First priority: Check if there's a dedicated videoThumbnail field
    if (product.videoThumbnail) {
      try {
        // Check if the videoThumbnail is already a full URL
        if (product.videoThumbnail.startsWith('http')) {
          setThumbnailUrl(product.videoThumbnail);
          console.log('Using full URL video thumbnail:', product.videoThumbnail);
          setThumbnailLoading(false);
        } else {
          // Construct the URL using PocketBase pattern
          const baseUrl = pocketbase.baseUrl.endsWith('/') 
            ? pocketbase.baseUrl.slice(0, -1) 
            : pocketbase.baseUrl;
          
          // Use the direct URL approach
          const videoThumbnail = `${baseUrl}/api/files/${Collections.PRODUCTS}/${product.id}/${product.videoThumbnail}`;
          setThumbnailUrl(videoThumbnail);
          console.log('Using constructed video thumbnail URL:', videoThumbnail);
          setThumbnailLoading(false);
        }
      } catch (error) {
        console.error('Error using dedicated video thumbnail:', error);
        // Fallback to using product image as thumbnail
        if (product.images && product.images.length > 0) {
          try {
            const thumbnailImage = getPocketBaseImageUrl(
              product.images[0], 
              Collections.PRODUCTS, 
              "medium", 
              "webp"
            );
            setThumbnailUrl(thumbnailImage);
            console.log('Fallback: Using product image as video thumbnail:', thumbnailImage);
          } catch (imgError) {
            console.error('Error generating thumbnail from product image:', imgError);
            setThumbnailError(true);
          }
        } else {
          setThumbnailError(true);
        }
        setThumbnailLoading(false);
      }
    }
    // Second priority: For YouTube videos, get the thumbnail from YouTube
    else if (isYouTubeUrl(product.videoUrl)) {
      const videoId = getYouTubeVideoId(product.videoUrl);
      if (videoId) {
        // YouTube provides several thumbnail options
        setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
        setThumbnailLoading(false);
      }
    } 
    // Third priority: For PocketBase videos
    else if (isPocketBaseFileUrl(product.videoUrl)) {
      // If product has images, use the first one as thumbnail
      if (product.images && product.images.length > 0) {
        try {
          // Use the optimized image utility to get a proper thumbnail
          const thumbnailImage = getPocketBaseImageUrl(
            product.images[0], 
            Collections.PRODUCTS, 
            "medium", 
            "webp"
          );
          setThumbnailUrl(thumbnailImage);
          setThumbnailLoading(false);
          console.log('Using product image as video thumbnail:', thumbnailImage);
        } catch (error) {
          console.error('Error generating thumbnail from product image:', error);
          setThumbnailError(true);
          setThumbnailLoading(false);
        }
      } else {
        // Fallback to direct URL
        setThumbnailUrl(getPocketBaseFileUrl(product.videoUrl, product.id));
        console.log('Using direct video URL as thumbnail:', product.videoUrl);
        setThumbnailLoading(false);
      }
    }
    // For other videos, just use a generic thumbnail
    else {
      setThumbnailUrl(null);
      setThumbnailLoading(false);
    }
  }, [product?.videoUrl, product?.images]);

  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
  };
  
  const handleThumbnailError = () => {
    setThumbnailError(true);
  };

  // Lazy-load recommended products: fetch only after the section becomes visible
  useEffect(() => {
    if (!recommendationsVisible || !product?.category) {
      if (!product?.category) {
        setRecommendedProducts([]);
      }
      return;
    }

    let cancelled = false;

    setRecommendedLoading(true);
    
    // Use the getProducts function with proper error handling
    const fetchRecommendations = async () => {
      try {
        const products = await getProducts({ category: product.category });
        if (cancelled) return;
        
        // Filter out the current product and limit to 8 items
        const filteredProducts = products
          .filter((item) => item.id !== product.id)
          .slice(0, 8);
        
        setRecommendedProducts(filteredProducts);
        setRecommendedError(null);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching recommended products:', error);
        setRecommendedError('Unable to load recommendations right now.');
        setRecommendedProducts([]);
      } finally {
        if (!cancelled) setRecommendedLoading(false);
      }
    };

    fetchRecommendations();

    return () => {
      cancelled = true;
    };
  }, [product?.category, product?.id, recommendationsVisible]);

  // Observe when the recommendations section scrolls into view
  useEffect(() => {
    if (recommendationsVisible) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setRecommendationsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRecommendationsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px',
        threshold: 0.1,
      },
    );

    const target = recommendationsRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
    };
  }, [recommendationsVisible]);

  const featureList = Array.isArray(product.features)
    ? product.features.filter((feature) => typeof feature === 'string' && feature.trim().length > 0)
    : [];

  const specificationEntries = [
    { label: 'Material', value: product.specifications?.material || product.material },
    { label: 'Dimensions', value: product.specifications?.dimensions || product.dimensions },
    { label: 'Weight', value: product.specifications?.weight || '' },
    { label: 'Capacity', value: product.specifications?.capacity || '' },
    { label: 'Style', value: product.specifications?.style || '' },
    { label: 'Pattern', value: product.specifications?.pattern || '' },
    { label: 'Closure', value: product.specifications?.closure || (product as any)?.closure },
    { label: 'Water Resistant', value: product.specifications?.waterResistant ? 'Yes' : undefined }
  ].filter((spec) => spec.value && String(spec.value).trim().length > 0 && spec.value !== 'Standard');

  const cleaningList = Array.isArray(product.care_instructions?.cleaning)
    ? product.care_instructions.cleaning.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : Array.isArray((product as any).care)
      ? (product as any).care.filter((item: string) => typeof item === 'string' && item.trim().length > 0)
      : [];

  const storageList = Array.isArray(product.care_instructions?.storage)
    ? product.care_instructions.storage.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : [];

  const usageRecommended = Array.isArray(product.usage_guidelines?.recommended_use)
    ? product.usage_guidelines.recommended_use.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : [];

  const usageTips = Array.isArray(product.usage_guidelines?.pro_tips)
    ? product.usage_guidelines.pro_tips.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : [];

  const hasDescription = typeof product.description === 'string' && product.description.trim().length > 0;
  const hasSpecs = orderConfig?.showProductSpecifications !== false && specificationEntries.length > 0;
  const hasCare = orderConfig?.showCareInstructions !== false && (cleaningList.length > 0 || storageList.length > 0);
  const hasFeatures = orderConfig?.showFeaturesAndBenefits !== false && featureList.length > 0;
  const hasUsage = orderConfig?.showUsageGuidelines !== false && (usageRecommended.length > 0 || usageTips.length > 0);
  // Don't show video if it's a blob URL (invalid/temporary URL)
  const hasVideo = !!product.videoUrl && !product.videoUrl.startsWith('blob:');

  const recommendations = recommendedProducts.filter((item) => item.id !== product.id).slice(0, 4);
  const showRecommendations = recommendedLoading || recommendedError || recommendations.length > 0;

  const videoUrl = product.videoUrl || '';

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <div className={`grid gap-6 ${hasVideo ? 'md:grid-cols-2' : ''}`}>
        {hasVideo && (
          <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 text-white">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold">Product Story</CardTitle>
              <p className="text-sm text-white/70">See the product in action before you buy.</p>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                {!isVideoPlaying ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur">
                    {thumbnailLoading ? (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                        <p className="text-sm text-white/80 font-medium">Loading preview…</p>
                      </div>
                    ) : thumbnailError || !thumbnailUrl ? (
                      <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                        <ImageIcon size={48} className="text-white/50" />
                        <p className="text-sm text-white/70 font-medium">Product video</p>
                      </div>
                    ) : (
                      <img
                        src={thumbnailUrl}
                        alt="Video thumbnail"
                        className="h-full w-full object-cover"
                        onError={() => setThumbnailError(true)}
                      />
                    )}
                    <button
                      onClick={() => setIsVideoPlaying(true)}
                      className="group absolute inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-blue-600 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white z-10"
                      aria-label="Play video"
                    >
                      <Play size={28} className="ml-1" fill="currentColor" />
                    </button>
                  </div>
                ) : isYouTubeUrl(product.videoUrl) ? (
                  <iframe
                    src={`${getYouTubeEmbedUrl(product.videoUrl)}?autoplay=1&rel=0`}
                    title="YouTube video player"
                    className="absolute inset-0 h-full w-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : isPocketBaseFileUrl(product.videoUrl) || isVideoFileUrl(product.videoUrl) ? (
                  <div className="relative h-full w-full">
                    <video
                      key={isPocketBaseFileUrl(product.videoUrl) ? getPocketBaseFileUrl(product.videoUrl, product.id) : videoUrl}
                      controls
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 h-full w-full object-contain bg-black"
                      onEnded={() => setIsVideoPlaying(false)}
                      onError={(e) => {
                        const videoSrc = isPocketBaseFileUrl(product.videoUrl) ? getPocketBaseFileUrl(product.videoUrl, product.id) : videoUrl;
                        console.error('Video playback error');
                        console.error('Video URL:', videoSrc);
                        console.error('Product videoUrl:', product.videoUrl);
                        console.error('Product ID:', product.id);
                        console.error('Is PocketBase URL:', isPocketBaseFileUrl(product.videoUrl));
                        console.error('Error event:', e.nativeEvent);
                      }}
                      onLoadedData={() => {
                        console.log('Video loaded successfully');
                      }}
                    >
                      <source 
                        src={isPocketBaseFileUrl(product.videoUrl) ? getPocketBaseFileUrl(product.videoUrl, product.id) : videoUrl}
                        type="video/mp4"
                      />
                      <source 
                        src={isPocketBaseFileUrl(product.videoUrl) ? getPocketBaseFileUrl(product.videoUrl, product.id) : videoUrl}
                        type="video/webm"
                      />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <iframe
                    src={`${videoUrl}${videoUrl.includes('?') ? '&' : '?'}autoplay=1`}
                    title="Product video"
                    className="absolute inset-0 h-full w-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {hasDescription && (
          <Card className="border border-muted/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Description</CardTitle>
              <Separator className="bg-blue-100" />
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                {product.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {orderConfig === null && (
        <Card className="animate-pulse border border-muted/40">
          <CardContent className="space-y-4 py-8">
            <div className="h-6 w-40 rounded-full bg-muted" />
            <div className="h-4 w-full rounded-full bg-muted" />
            <div className="h-4 w-5/6 rounded-full bg-muted" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {hasSpecs && (
          <Card className="border border-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                Specifications
                <Badge variant="outline" className="rounded-full border-blue-200 text-blue-600">
                  Quality Checked
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-muted/40">
              {specificationEntries.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">{spec.label}</span>
                  <span className="text-sm font-semibold text-foreground">{spec.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {hasFeatures && (
          <Card className="border border-muted/40">
            <CardHeader className="pb-3">
              <CardTitle>Highlights</CardTitle>
              <p className="text-sm text-muted-foreground">Why customers love this product</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {featureList.map((feature, index) => (
                <div key={feature + index} className="flex items-start gap-4 rounded-2xl bg-blue-50/70 p-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow">
                    <Check className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-blue-900">
                    {feature}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {hasCare && (
        <Card className="border border-muted/40">
          <CardHeader className="pb-3">
            <CardTitle>Care & Storage</CardTitle>
            <p className="text-sm text-muted-foreground">Keep your purchase looking new for years.</p>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {cleaningList.length > 0 && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-blue-600" /> Cleaning
                </h4>
                <ul className="space-y-3">
                  {cleaningList.map((instruction: string, index: number) => (
                    <li key={`clean-${index}`} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm leading-relaxed text-muted-foreground">{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {storageList.length > 0 && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-blue-600" /> Storage
                </h4>
                <ul className="space-y-3">
                  {storageList.map((instruction: string, index: number) => (
                    <li key={`storage-${index}`} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm leading-relaxed text-muted-foreground">{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasUsage && (
        <Card className="border border-muted/40">
          <CardHeader className="pb-3">
            <CardTitle>Usage Guidelines</CardTitle>
            <p className="text-sm text-muted-foreground">Make the most of your purchase.</p>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {usageRecommended.length > 0 && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-blue-600" /> Recommended Use
                </h4>
                <ul className="space-y-3">
                  {usageRecommended.map((guideline: string, index: number) => (
                    <li key={`use-${index}`} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm leading-relaxed text-muted-foreground">{guideline}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {usageTips.length > 0 && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-blue-600" /> Pro Tips
                </h4>
                <ul className="space-y-3">
                  {usageTips.map((tip: string, index: number) => (
                    <li key={`tip-${index}`} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm leading-relaxed text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div ref={recommendationsRef}>
        {recommendationsVisible && showRecommendations && (
          <Card className="border border-muted/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                Recommended for You
                {product.category && (
                  <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700">
                    {product.category}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Curated picks that pair well or are loved by similar shoppers.
              </p>
            </CardHeader>
            <CardContent>
              {recommendedLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="animate-pulse space-y-3 rounded-2xl border border-muted/30 p-4">
                      <div className="aspect-square rounded-xl bg-muted" />
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-4 w-1/2 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              )}

              {recommendedError && !recommendedLoading && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {recommendedError}
                </div>
              )}

              {!recommendedLoading && !recommendedError && recommendations.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {recommendations.map((item) => (
                    <Link
                      key={item.id}
                      to={`/product/${item.id}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-muted/40 bg-gradient-to-b from-white to-blue-50/30 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <ProductImage
                          url={item.images?.[0] || ''}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          size="small"
                          aspectRatio="square"
                          useResponsive={false}
                        />
                        <div className="absolute inset-x-0 top-2 flex items-center justify-between px-3">
                          {item.bestseller && (
                            <Badge className="rounded-full bg-orange-500 text-white">Bestseller</Badge>
                          )}
                          {item.new && (
                            <Badge variant="secondary" className="rounded-full bg-blue-600/90 text-white">
                              New Arrival
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-blue-600">
                          {item.name}
                        </h3>
                        <p className="text-base font-bold text-blue-700">
                          ₹{typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                        </p>
                        {Array.isArray(item.colors) && item.colors.length > 0 && (
                          <div className="flex gap-1">
                            {item.colors.slice(0, 4).map((color: any) => (
                              <span
                                key={`${item.id}-${color.value}`}
                                className="h-3 w-3 rounded-full border border-white shadow-sm"
                                style={{ backgroundColor: color.hex || color.value }}
                              />
                            ))}
                            {item.colors.length > 4 && (
                              <span className="flex h-3 w-3 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground">
                                +{item.colors.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};