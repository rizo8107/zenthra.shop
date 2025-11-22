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
  const { addItem } = useCart();
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

  const cardRadius = pc.corner === 'pill' ? 'rounded-3xl' : pc.corner === 'square' ? 'rounded-md' : 'rounded-xl';
  const shadowCls = pc.shadow === 'none' ? '' : pc.shadow === 'soft' ? 'shadow-sm' : pc.shadow === 'medium' ? 'shadow-md' : 'shadow-lg';
  const ctaRounded = pc.ctaStyle === 'pill' ? 'rounded-full' : '';
  // Force a 1:1 aspect ratio for the product image area to match the desired card design
  const aspectCls = 'aspect-square';
  const titleSizeCls = pc.titleSize === 'lg' ? 'text-lg' : pc.titleSize === 'sm' ? 'text-sm' : 'text-base';
  const descSizeCls = pc.descSize === 'lg' ? 'text-base' : pc.descSize === 'sm' ? 'text-xs' : 'text-sm';
  const ctaSize: 'sm' | 'default' | 'lg' = pc.ctaSize === 'lg' ? 'lg' : pc.ctaSize === 'sm' ? 'sm' : 'default';
  const bodyPadding = pc.spacing === 'comfortable' ? 'p-4' : 'p-3';
  const imagePaddingStyle = pc.imagePadding ? { padding: pc.imagePadding } : undefined;
  const imageCornerCls = pc.imageCorner === 'pill'
    ? 'rounded-full'
    : pc.imageCorner === 'square'
    ? ''
    : 'rounded-xl';
  
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

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        'group block bg-card overflow-hidden transition-all duration-300 relative',
        cardRadius,
        shadowCls,
        'hover:shadow-xl'
      )}
    >
      {/* Image area */}
      <div
        className={cn('relative bg-white flex items-center justify-center px-5 pt-5 pb-4', aspectCls)}
        style={imagePaddingStyle}
      >
        <div className={cn('relative w-full h-full bg-background flex items-center justify-center overflow-hidden', imageCornerCls)}>
          <ProductImage
            url={product.images?.[0] || ''}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            aspectRatio="square"
            priority={priority}
            size="small"
            width={400}
            height={400}
            useResponsive={false}
          />
        </div>

        {/* Tags / badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
          {product.bestseller && (
            <Badge
              variant="secondary"
              className="bg-background/90 text-foreground border border-border rounded-full px-3 py-1 text-xs font-medium"
            >
              Best Seller
            </Badge>
          )}
          {product.new && (
            <Badge
              variant="secondary"
              className="bg-primary/90 text-primary-foreground rounded-full px-3 py-1 text-xs font-medium"
            >
              New
            </Badge>
          )}
          {pc.showTags &&
            Array.isArray(product.tags) &&
            product.tags.slice(0, 2).map((t) => (
              <span
                key={String(t)}
                className="px-2 py-0.5 rounded-full bg-background/90 text-foreground text-[10px] shadow-sm border border-border/60"
              >
                {String(t)}
              </span>
            ))}
        </div>

        {/* Wishlist */}
        {pc.showWishlist && (
          <button
            className="absolute top-3 right-3 p-2 rounded-full bg-background/90 backdrop-blur-sm opacity-100 transition-all duration-300 hover:bg-background shadow-sm"
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
      <div className={cn(bodyPadding, 'flex flex-col gap-3 pb-4')}>
        <div className="space-y-1">
          {product.brand && (
            <p className="text-xs font-medium text-primary">{String(product.brand)}</p>
          )}
          <h3
            className={cn(
              'font-semibold text-foreground group-hover:text-foreground transition-colors line-clamp-2',
              titleSizeCls
            )}
          >
            {product.name}
          </h3>
          {pc.showDescription && product.description && (
            <p className={cn('text-muted-foreground line-clamp-2', descSizeCls)}>
              {product.description}
            </p>
          )}
        </div>

        {pc.layout === 'band' ? (
          <div
            className="mt-3 rounded-2xl bg-primary/5 px-3 py-3 flex items-center justify-between gap-3"
            style={ctaVars}
          >
            <div className="inline-flex flex-col items-start">
              <span className="text-sm font-semibold text-foreground">
                ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{product.original_price.toFixed(2)}
                </span>
              )}
            </div>

            <Button
              onClick={handleQuickAdd}
              size={ctaSize}
              className={cn(
                'w-auto min-w-[7rem] justify-center',
                ctaRounded || 'rounded-full',
                pc.ctaStyle === 'outline'
                  ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                  : undefined,
                primaryColor
                  ? '!bg-[var(--cta-color)] !text-[var(--cta-text)] hover:!bg-[var(--cta-hover)]'
                  : null
              )}
            >
              {pc.ctaLabel}
            </Button>
          </div>
        ) : pc.layout === 'simple' ? (
          <div className="mt-3 flex flex-col gap-2" style={ctaVars}>
            <div className="inline-flex flex-col items-start">
              <span className="text-sm font-semibold text-foreground">
                ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{product.original_price.toFixed(2)}
                </span>
              )}
            </div>
            <Button
              onClick={handleQuickAdd}
              size={ctaSize}
              className={cn(
                'w-full justify-center',
                ctaRounded || 'rounded-full',
                pc.ctaStyle === 'outline'
                  ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                  : undefined,
                primaryColor
                  ? '!bg-[var(--cta-color)] !text-[var(--cta-text)] hover:!bg-[var(--cta-hover)]'
                  : null
              )}
            >
              {pc.ctaLabel}
            </Button>
          </div>
        ) : (
          <div
            className="mt-3 flex items-center justify-between gap-3"
            style={ctaVars}
          >
            <div className="inline-flex flex-col items-start">
              <span className="text-sm font-semibold text-foreground">
                ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{product.original_price.toFixed(2)}
                </span>
              )}
            </div>
            <Button
              onClick={handleQuickAdd}
              size={ctaSize}
              className={cn(
                'w-auto min-w-[7rem] justify-center',
                ctaRounded || 'rounded-full',
                pc.ctaStyle === 'outline'
                  ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                  : undefined,
                primaryColor
                  ? '!bg-[var(--cta-color)] !text-[var(--cta-text)] hover:!bg-[var(--cta-hover)]'
                  : null
              )}
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
