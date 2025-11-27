import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Product } from '@/lib/pocketbase';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProductImage } from '@/components/ProductImage';
import { useDynamicTheme } from '@/contexts/ThemeContext';

type ProductCardOverrides = {
  corner: 'rounded' | 'square' | 'pill';
  shadow: 'none' | 'soft' | 'medium' | 'hard';
  showWishlist: boolean;
  showTags: boolean;
  showDescription: boolean;
  ctaLabel: string;
  ctaStyle: 'pill' | 'outline' | 'default';
  ctaColor?: string;
  imageRatio: 'portrait' | 'square' | 'wide';
  titleSize: 'sm' | 'md' | 'lg';
  descSize: 'sm' | 'md' | 'lg';
  ctaSize: 'sm' | 'md' | 'lg';
  spacing: 'compact' | 'comfortable';
  imagePadding?: number; // px
  imageCorner?: 'rounded' | 'square' | 'pill';
  layout?: 'band' | 'simple' | 'split';
  // Optional px-based overrides (apply to all breakpoints when set)
  titleSizePx?: number;
  descSizePx?: number;
  priceSizePx?: number;
  originalPriceSizePx?: number;
};

type ProductCardProps = {
  product: Product;
  priority?: boolean; // above-the-fold image priority
  overrides?: Partial<ProductCardOverrides>;
};

const ProductCard = ({ product, priority = false, overrides }: ProductCardProps) => {
  const { addItem, getItem, updateQuantity } = useCart();
  const { themeData } = useDynamicTheme();
  const primaryColor = themeData?.primary?.hex;
  const primaryHover = themeData?.primary?.hoverHex ?? primaryColor;
  const primaryForeground = themeData?.textOnPrimary;
  const ctaVars = useMemo(() => {
    if (!primaryColor && !primaryForeground) {
      return undefined;
    }
    return {
      '--cta-color': primaryColor ?? undefined,
      '--cta-hover': primaryHover ?? primaryColor ?? undefined,
      '--cta-text': primaryForeground ?? undefined,
    } as React.CSSProperties;
  }, [primaryColor, primaryHover, primaryForeground]);


  const pc = useMemo(() => {
    const productCardSettings = (themeData as any)?.productCard ?? {};
    return {
      corner: overrides?.corner ?? productCardSettings.corner ?? 'rounded',
      shadow: overrides?.shadow ?? productCardSettings.shadow ?? 'soft',
      showWishlist: overrides?.showWishlist ?? productCardSettings.showWishlist ?? true,
      showTags: overrides?.showTags ?? productCardSettings.showTags ?? true,
      showDescription: overrides?.showDescription ?? productCardSettings.showDescription ?? true,
      ctaLabel: overrides?.ctaLabel ?? productCardSettings.ctaLabel ?? 'Buy Now',
      ctaStyle: overrides?.ctaStyle ?? productCardSettings.ctaStyle ?? 'pill',
      ctaColor: overrides?.ctaColor ?? productCardSettings.ctaColor,
      imageRatio: overrides?.imageRatio ?? productCardSettings.imageRatio ?? 'portrait',
      titleSize: overrides?.titleSize ?? productCardSettings.titleSize ?? 'md',
      descSize: overrides?.descSize ?? productCardSettings.descSize ?? 'sm',
      ctaSize: overrides?.ctaSize ?? productCardSettings.ctaSize ?? 'md',
      spacing: overrides?.spacing ?? productCardSettings.spacing ?? 'compact',
      imagePadding: overrides?.imagePadding ?? productCardSettings.imagePadding,
      imageCorner: overrides?.imageCorner ?? productCardSettings.imageCorner,
      layout: overrides?.layout ?? productCardSettings.layout ?? 'band',
      titleSizePx: overrides?.titleSizePx ?? productCardSettings.titleSizePx,
      descSizePx: overrides?.descSizePx ?? productCardSettings.descSizePx,
      priceSizePx: overrides?.priceSizePx ?? productCardSettings.priceSizePx,
      originalPriceSizePx: overrides?.originalPriceSizePx ?? productCardSettings.originalPriceSizePx,
    };
  }, [themeData, overrides]);

  const cardRadius = pc.corner === 'square' ? 'rounded-md' : 'rounded-xl';
  const shadowCls = pc.shadow === 'none' ? '' : pc.shadow === 'soft' ? 'shadow-sm' : pc.shadow === 'medium' ? 'shadow-md' : 'shadow-lg';
  const ctaRounded = pc.ctaStyle === 'pill' ? 'rounded-[24px]' : '';
  // Force a 1:1 aspect ratio for the product image area to match the desired card design
  const aspectCls = 'aspect-[4/5] md:aspect-[4/5]';
  // Make title and description text smaller on mobile while preserving existing sizes on larger screens
  const titleSizeCls =
    pc.titleSize === 'lg'
      ? 'text-lg md:text-2xl'
      : pc.titleSize === 'sm'
      ? 'text-sm md:text-lg'
      : 'text-sm md:text-[24px] md:leading-[30px]';
  const descSizeCls =
    pc.descSize === 'lg'
      ? 'text-sm md:text-lg'
      : pc.descSize === 'sm'
      ? 'text-xs md:text-sm'
      : 'text-xs md:text-[14px] md:leading-[20px]';
  const ctaSize: 'sm' | 'default' | 'lg' = pc.ctaSize === 'lg' ? 'lg' : pc.ctaSize === 'sm' ? 'sm' : 'default';
  const bodyPadding =
    pc.spacing === 'comfortable'
      ? 'px-3 py-3 sm:px-4 sm:py-4'
      : 'p-[10px]'; // Default to 10px padding as per design
  const imagePaddingStyle = pc.imagePadding ? { padding: pc.imagePadding } : undefined;
  const titleStyle = pc.titleSizePx ? { fontSize: `${pc.titleSizePx}px` } : undefined;
  const descStyle = pc.descSizePx ? { fontSize: `${pc.descSizePx}px` } : undefined;
  const priceStyle = pc.priceSizePx ? { fontSize: `${pc.priceSizePx}px` } : undefined;
  const originalPriceStyle = pc.originalPriceSizePx ? { fontSize: `${pc.originalPriceSizePx}px` } : undefined;
  const imageCornerCls = pc.imageCorner === 'square'
    ? 'rounded-lg'
    : 'rounded-xl';

  const effectiveCtaColor = pc.ctaColor || primaryColor || '#111111';
  const effectiveCtaTextColor = primaryForeground || '#FFFFFF';
  
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const colorOptions =
      (product as any).variants?.colors && (product as any).variants.colors.length > 0
        ? (product as any).variants.colors
        : product.colors || [];

    if (!Array.isArray(colorOptions) || colorOptions.length === 0) {
      addItem(product, 1, '');
      return;
    }

    addItem(product, 1, colorOptions[0].value);
  };

  const currentCartItem = getItem(product.id);
  const currentQty = currentCartItem?.quantity ?? 0;

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, currentQty + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentQty <= 1) {
      updateQuantity(product.id, 0);
    } else {
      updateQuantity(product.id, currentQty - 1);
    }
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        'group block bg-white overflow-hidden transition-all duration-300 relative flex flex-col gap-[10px] p-[10px]',
        cardRadius,
        shadowCls
      )}
    >
      {/* Image area */}
      <div
        className={cn(
          'relative bg-gray-50 flex items-center justify-center overflow-hidden',
          aspectCls,
          imageCornerCls
        )}
      >
        <div className={cn('relative w-full h-full flex items-center justify-center overflow-hidden', imageCornerCls)}>
          <ProductImage
            url={product.images?.[0] || ''}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            aspectRatio="square"
            priority={priority}
            size="small"
            width={400}
            height={400}
            useResponsive={false}
          />
        </div>

        {/* Tags / badges */}
        <div className="absolute top-[10px] left-[10px] flex flex-wrap gap-2 z-10">
          {product.bestseller && (
            <Badge
              variant="secondary"
              className="bg-[#928B6D] text-white border-none rounded-[24px] px-3 py-1 text-[12px] font-semibold hover:bg-[#928B6D]/90"
            >
              Best seller
            </Badge>
          )}
          {product.new && !product.bestseller && (
            <Badge
              variant="secondary"
              className="bg-primary/90 text-primary-foreground rounded-full px-3 py-1 text-xs font-medium"
            >
              New
            </Badge>
          )}
        </div>

        {/* Wishlist */}
        {pc.showWishlist && (
          <button
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white shadow-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-label="Add to wishlist"
            title="Add to wishlist"
          >
            <Heart className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
          </button>
        )}
      </div>

      {/* Text + rating + price + CTA */}
      <div className="flex flex-col gap-[14px] px-0 pb-0">
        <div className="flex flex-col items-start gap-1.5">
          {product.brand && (
            <p className="text-xs font-medium text-primary mb-1">{String(product.brand)}</p>
          )}
          <h3
            className={cn(
              'font-bold text-black group-hover:text-primary transition-colors text-[4px]',
              titleSizeCls
            )}
            style={titleStyle}
          >
            {product.name}
          </h3>
          {typeof (product as any).rating === 'number' && (product as any).rating > 0 && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#5E5E5E]">
              <span className="flex items-center text-[#F59E0B]">
                {'★★★★★'.slice(0, Math.round((product as any).rating))}
              </span>
              {typeof (product as any).review_count === 'number' && (
                <span className="text-[10px] text-muted-foreground">({(product as any).review_count})</span>
              )}
            </div>
          )}
          {pc.showDescription && product.description && (
            <p
              className={cn('text-black line-clamp-2 mt-1', descSizeCls)}
              style={descStyle}
            >
              {product.description}
            </p>
          )}
        </div>

        {pc.layout === 'band' ? (
          <div
            className="mt-auto rounded-2xl bg-primary/5 px-3 py-3 flex items-center justify-between gap-3"
            style={ctaVars}
          >
            <div className="inline-flex flex-col items-start">
              <span
                className="text-base md:text-[22px] font-semibold text-black leading-[22px] md:leading-[27px]"
                style={priceStyle}
              >
                ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span
                  className="text-xs md:text-[16px] text-[#5E5E5E] line-through leading-[16px] md:leading-[20px]"
                  style={originalPriceStyle}
                >
                  ₹{product.original_price.toFixed(2)}
                </span>
              )}
            </div>

          </div>
        ) : pc.layout === 'simple' ? (
          <div className="mt-auto flex flex-col gap-2" style={ctaVars}>
            <div className="inline-flex flex-col items-start">
              <span
                className="text-[22px] font-semibold text-black leading-[27px]"
                style={priceStyle}
              >
                ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
            </div>
            <Button
              onClick={handleQuickAdd}
              size={ctaSize}
              className={cn(
                'w-full justify-center h-[40px] font-semibold text-[15px]',
                'rounded-xl'
              )}
              style={{ backgroundColor: effectiveCtaColor, color: effectiveCtaTextColor }}
            >
              {pc.ctaLabel}
            </Button>
          </div>
        ) : (
          // Split layout (matches Frame 2)
          <div
            className="mt-auto flex items-center justify-between gap-3"
            style={ctaVars}
          >
            <div className="inline-flex flex-col items-start">
              <span
                className="text-[22px] font-semibold text-black leading-[27px]"
                style={priceStyle}
              >
                ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span
                  className="text-[16px] text-[#5E5E5E] line-through leading-[20px]"
                  style={originalPriceStyle}
                >
                  ₹{product.original_price.toFixed(2)}
                </span>
              )}
            </div>
            <Button
              onClick={handleQuickAdd}
              size={ctaSize}
              className={cn(
                'w-auto min-w-[8.75rem] justify-center h-[40px] font-semibold text-[15px] px-6',
                'rounded-xl',
                pc.ctaStyle === 'outline'
                  ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                  : 'hover:opacity-90'
              )}
              style={
                pc.ctaStyle === 'outline'
                  ? undefined
                  : { backgroundColor: effectiveCtaColor, color: effectiveCtaTextColor }
              }
            >
              {pc.ctaLabel}
            </Button>
          </div>
        )}
      </div>
    </Link>
  );
};

export default memo(ProductCard);
