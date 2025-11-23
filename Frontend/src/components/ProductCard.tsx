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
  imageRatio: 'portrait' | 'square' | 'wide';
  titleSize: 'sm' | 'md' | 'lg';
  descSize: 'sm' | 'md' | 'lg';
  ctaSize: 'sm' | 'md' | 'lg';
  spacing: 'compact' | 'comfortable';
  imagePadding?: number; // px
  imageCorner?: 'rounded' | 'square' | 'pill';
  layout?: 'band' | 'simple' | 'split';
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


  const pc = useMemo(() => ({
    corner: overrides?.corner ?? themeData?.productCard?.corner ?? 'rounded',
    shadow: overrides?.shadow ?? themeData?.productCard?.shadow ?? 'soft',
    showWishlist: overrides?.showWishlist ?? themeData?.productCard?.showWishlist ?? true,
    showTags: overrides?.showTags ?? themeData?.productCard?.showTags ?? true,
    showDescription: overrides?.showDescription ?? themeData?.productCard?.showDescription ?? true,
    ctaLabel: overrides?.ctaLabel ?? themeData?.productCard?.ctaLabel ?? 'Buy Now',
    ctaStyle: overrides?.ctaStyle ?? themeData?.productCard?.ctaStyle ?? 'pill',
    imageRatio: overrides?.imageRatio ?? themeData?.productCard?.imageRatio ?? 'portrait',
    titleSize: overrides?.titleSize ?? themeData?.productCard?.titleSize ?? 'md',
    descSize: overrides?.descSize ?? themeData?.productCard?.descSize ?? 'sm',
    ctaSize: overrides?.ctaSize ?? themeData?.productCard?.ctaSize ?? 'md',
    spacing: overrides?.spacing ?? themeData?.productCard?.spacing ?? 'compact',
    imagePadding: overrides?.imagePadding ?? themeData?.productCard?.imagePadding,
    imageCorner: overrides?.imageCorner ?? themeData?.productCard?.imageCorner,
    layout: overrides?.layout ?? themeData?.productCard?.layout ?? 'band',
  }), [themeData, overrides]);

  const cardRadius = pc.corner === 'pill' ? 'rounded-[24px]' : pc.corner === 'square' ? 'rounded-md' : 'rounded-[24px]';
  const shadowCls = pc.shadow === 'none' ? '' : pc.shadow === 'soft' ? 'shadow-sm' : pc.shadow === 'medium' ? 'shadow-md' : 'shadow-lg';
  const ctaRounded = pc.ctaStyle === 'pill' ? 'rounded-[24px]' : '';
  // Force a 1:1 aspect ratio for the product image area to match the desired card design
  const aspectCls = 'aspect-square';
  const titleSizeCls = pc.titleSize === 'lg' ? 'text-2xl' : pc.titleSize === 'sm' ? 'text-lg' : 'text-[24px] leading-[30px]';
  const descSizeCls = pc.descSize === 'lg' ? 'text-lg' : pc.descSize === 'sm' ? 'text-sm' : 'text-[16px] leading-[20px]';
  const ctaSize: 'sm' | 'default' | 'lg' = pc.ctaSize === 'lg' ? 'lg' : pc.ctaSize === 'sm' ? 'sm' : 'default';
  const bodyPadding =
    pc.spacing === 'comfortable'
      ? 'px-3 py-3 sm:px-4 sm:py-4'
      : 'p-[10px]'; // Default to 10px padding as per design
  const imagePaddingStyle = pc.imagePadding ? { padding: pc.imagePadding } : undefined;
  const imageCornerCls = pc.imageCorner === 'pill'
    ? 'rounded-full'
    : pc.imageCorner === 'square'
    ? ''
    : 'rounded-[17px]';
  
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
        shadowCls,
        'hover:shadow-xl'
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

      {/* Text + price + CTA */}
      <div className="flex flex-col gap-[20px] px-0 pb-0">
        <div className="flex flex-col items-start gap-1">
          {product.brand && (
            <p className="text-xs font-medium text-primary mb-1">{String(product.brand)}</p>
          )}
          <h3
            className={cn(
              'font-bold text-black group-hover:text-primary transition-colors text-[5px]',
              titleSizeCls
            )}
          >
            {product.name}
          </h3>
          {pc.showDescription && product.description && (
            <p className={cn('text-black line-clamp-2 mt-1', descSizeCls)}>
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
              <span className="text-[22px] font-semibold text-black leading-[27px]">
                ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-[16px] text-[#5E5E5E] line-through leading-[20px]">
                  ₹{product.original_price.toFixed(2)}
                </span>
              )}
            </div>

            {currentQty <= 0 ? (
              <Button
                onClick={handleQuickAdd}
                size={ctaSize}
                className={cn(
                  'w-auto min-w-[7rem] justify-center h-[40px] font-bold text-[16px]',
                  ctaRounded || 'rounded-[24px]',
                  pc.ctaStyle === 'outline'
                    ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                    : 'bg-[#15803D] text-white hover:bg-[#15803D]/90'
                )}
              >
                {pc.ctaLabel}
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-0 w-[139px] h-[40px] border-2 border-[#829F8D] rounded-[24px] relative">
                <button
                  onClick={handleDecrement}
                  className="absolute left-[3.5px] top-[3.5px] w-[33px] h-[33px] rounded-[17px] bg-[#6D8877] flex items-center justify-center text-white text-xl leading-none"
                  aria-label="Decrease quantity"
                >
                  –
                </button>
                <span className="text-[16px] font-bold text-black">
                  {currentQty}
                </span>
                <button
                  onClick={handleIncrement}
                  className="absolute right-[3.5px] top-[3.5px] w-[33px] h-[33px] rounded-[17px] bg-[#15803D] flex items-center justify-center text-white text-xl leading-none"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            )}
          </div>
        ) : pc.layout === 'simple' ? (
           // Map simple to split-like stacked if needed, but let's keep simple stacked
          <div className="mt-auto flex flex-col gap-2" style={ctaVars}>
             <div className="inline-flex flex-col items-start">
              <span className="text-[22px] font-semibold text-black leading-[27px]">
                ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
            </div>
            {currentQty <= 0 ? (
              <Button
                onClick={handleQuickAdd}
                size={ctaSize}
                className={cn(
                  'w-full justify-center h-[40px] font-bold text-[16px]',
                  ctaRounded || 'rounded-[24px]',
                   'bg-[#15803D] text-white hover:bg-[#15803D]/90'
                )}
              >
                {pc.ctaLabel}
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-0 w-full h-[40px] border-2 border-[#829F8D] rounded-[24px] relative">
                <button
                  onClick={handleDecrement}
                  className="absolute left-[3.5px] top-[3.5px] w-[33px] h-[33px] rounded-[17px] bg-[#6D8877] flex items-center justify-center text-white text-xl leading-none"
                  aria-label="Decrease quantity"
                >
                  –
                </button>
                <span className="text-[16px] font-bold text-black">
                  {currentQty}
                </span>
                <button
                  onClick={handleIncrement}
                  className="absolute right-[3.5px] top-[3.5px] w-[33px] h-[33px] rounded-[17px] bg-[#15803D] flex items-center justify-center text-white text-xl leading-none"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            )}
          </div>
        ) : (
          // Split layout (matches Frame 2)
          <div
            className="mt-auto flex items-center justify-between gap-3"
            style={ctaVars}
          >
            <div className="inline-flex flex-col items-start">
              <span className="text-[22px] font-semibold text-black leading-[27px]">
                ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-[16px] text-[#5E5E5E] line-through leading-[20px]">
                  ₹{product.original_price.toFixed(2)}
                </span>
              )}
            </div>
            {currentQty <= 0 ? (
              <Button
                onClick={handleQuickAdd}
                size={ctaSize}
                className={cn(
                  'w-auto min-w-[139px] justify-center h-[40px] font-bold text-[16px] px-6',
                  ctaRounded || 'rounded-[24px]',
                  pc.ctaStyle === 'outline'
                    ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                    : 'bg-[#15803D] text-white hover:bg-[#15803D]/90'
                )}
              >
                {pc.ctaLabel}
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-0 w-[139px] h-[40px] border-2 border-[#829F8D] rounded-[24px] relative">
                <button
                  onClick={handleDecrement}
                  className="absolute left-[3.5px] top-[3.5px] w-[33px] h-[33px] rounded-[17px] bg-[#6D8877] flex items-center justify-center text-white text-xl leading-none"
                  aria-label="Decrease quantity"
                >
                  –
                </button>
                <span className="text-[16px] font-bold text-black">
                  {currentQty}
                </span>
                <button
                  onClick={handleIncrement}
                  className="absolute right-[3.5px] top-[3.5px] w-[33px] h-[33px] rounded-[17px] bg-[#15803D] flex items-center justify-center text-white text-xl leading-none"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default memo(ProductCard);
