import { useEffect, useMemo, useState } from "react";
import { type Product } from "@/lib/pocketbase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { cn } from "@/lib/utils";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface ProductDetailHeroEmbeddedProps {
  product: Product;
  disabled?: boolean;
  showGallery?: boolean;
  showPrice?: boolean;
  showCTA?: boolean;
  align?: "left" | "right";
  ctaLabel?: string;
}

const stripPcsSuffix = (value?: string | null): string => {
  if (!value) return "";
  return value.replace(/\s*(pcs|piece|pieces)\.?$/i, "").trim();
};

const normalizeVariantNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const normalizeSizeVariant = (size: any) => {
  if (!size || typeof size !== "object") return size;
  return {
    ...size,
    priceOverride: normalizeVariantNumber(size?.priceOverride),
    priceDelta: normalizeVariantNumber(size?.priceDelta),
    originalPrice: normalizeVariantNumber(size?.originalPrice),
  };
};

const formatSizeOptionLabel = (size?: {
  name?: string;
  value?: unknown;
  unit?: string;
} | null): string => {
  if (!size) return "";
  const name = typeof size.name === "string" ? stripPcsSuffix(size.name) : "";
  const value =
    size?.value !== undefined && size?.value !== null
      ? stripPcsSuffix(String(size.value))
      : "";
  const unitRaw = typeof size?.unit === "string" ? size.unit.trim() : "";
  const unit = ["pcs", "piece", "pieces"].includes(unitRaw.toLowerCase())
    ? ""
    : unitRaw;
  const base = name || value;
  if (!unit || !base) return stripPcsSuffix(base || unit);
  const combined = base.toLowerCase().includes(unit.toLowerCase())
    ? base
    : `${base} ${unit}`;
  return stripPcsSuffix(combined);
};

export const ProductDetailHeroEmbedded = ({
  product,
  disabled,
  showGallery = true,
  showPrice = true,
  showCTA = true,
  align = "left",
  ctaLabel,
}: ProductDetailHeroEmbeddedProps) => {
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<any | null>(null);
  const [selectedSize, setSelectedSize] = useState<any | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<any | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const baseImages = Array.isArray(product.images) ? product.images : [];
  const hasGallery = showGallery && baseImages.length > 0;

  useEffect(() => {
    setSelectedImage(hasGallery ? baseImages[0] || null : null);

    const initColors =
      (product as any)?.variants?.colors && (product as any).variants.colors.length > 0
        ? (product as any).variants.colors
        : product.colors || [];
    setSelectedColor(initColors[0] ?? null);

    const rawSizes = (product as any)?.variants?.sizes || [];
    const initSizes = Array.isArray(rawSizes)
      ? rawSizes.map((s: any) => normalizeSizeVariant(s))
      : [];
    setSelectedSize(initSizes[0] ?? null);

    setSelectedCombo(null);
    setQuantity(1);
  }, [product.id, hasGallery]);

  const rawSizeOptions = (product as any)?.variants?.sizes || [];
  const sizeOptions = Array.isArray(rawSizeOptions)
    ? rawSizeOptions.map((size: any) => normalizeSizeVariant(size))
    : [];
  const comboOptions = (product as any)?.variants?.combos || [];
  const standardCombos = comboOptions.filter(
    (cb: any) => (cb?.type || "").toLowerCase() !== "bundle",
  );
  const bundleCombos = comboOptions.filter(
    (cb: any) => (cb?.type || "").toLowerCase() === "bundle",
  );
  const colorOptions =
    (product as any)?.variants?.colors && (product as any).variants.colors.length > 0
      ? (product as any).variants.colors
      : product.colors || [];

  const computeVariantPrice = (size: any): { final: number; original?: number } => {
    const basePrice = Number(product?.price) || 0;
    let final = basePrice;
    if (typeof size?.priceOverride === "number") {
      final = size.priceOverride;
    } else if (typeof size?.priceDelta === "number") {
      final = basePrice + size.priceDelta;
    }
    const original = typeof size?.originalPrice === "number"
      ? size.originalPrice
      : typeof product?.original_price === "number"
        ? product.original_price
        : undefined;
    return { final, original };
  };

  const effectivePrice = useMemo(() => {
    let base = Number(product.price) || 0;
    if (selectedSize) {
      if (typeof selectedSize.priceOverride === "number") {
        base = selectedSize.priceOverride as number;
      } else if (typeof selectedSize.priceDelta === "number") {
        base = base + (selectedSize.priceDelta as number);
      }
    }

    if (!selectedCombo) return base;

    if (typeof selectedCombo.priceOverride === "number") {
      return Number(selectedCombo.priceOverride) || base;
    }

    const items = Number(selectedCombo.items) > 0 ? Number(selectedCombo.items) : 1;
    let computed = base * items;
    if (
      selectedCombo.discountType &&
      typeof selectedCombo.discountValue === "number"
    ) {
      const val = Number(selectedCombo.discountValue) || 0;
      if (selectedCombo.discountType === "amount") {
        computed = Math.max(0, computed - val);
      } else if (selectedCombo.discountType === "percent") {
        computed = (computed * Math.max(0, 100 - val)) / 100;
      }
    }
    return computed;
  }, [product, selectedSize, selectedCombo]);

  const unitPrice =
    typeof effectivePrice === "number" ? effectivePrice : Number(effectivePrice) || 0;
  const selectedTotal = unitPrice * quantity;

  const resolvedOriginalPrice = useMemo(() => {
    const variantOriginal =
      selectedSize && typeof selectedSize.originalPrice === "number"
        ? selectedSize.originalPrice
        : undefined;
    const productOriginal =
      typeof product.original_price === "number" ? product.original_price : undefined;
    return variantOriginal ?? productOriginal;
  }, [product, selectedSize]);

  const discountPercent =
    resolvedOriginalPrice && resolvedOriginalPrice > unitPrice
      ? Math.round((1 - unitPrice / resolvedOriginalPrice) * 100)
      : null;

  const selectedSizeLabel = useMemo(
    () => formatSizeOptionLabel(selectedSize),
    [selectedSize],
  );

  const resolvedCtaLabel = product.inStock
    ? ctaLabel || "Add to Cart"
    : "Notify Me";

  const handleAddToCart = () => {
    if (disabled) return;
    const variantOptions: Record<string, string> = {};
    if (selectedSize?.value != null) {
      variantOptions.size = String(selectedSize.value);
    }
    if (selectedCombo?.value != null) {
      variantOptions.combo = String(selectedCombo.value);
    }
    addItem(product as any, quantity, selectedColor?.value || "", variantOptions, unitPrice);
  };

  const handleDecreaseQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleIncreaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const imageColumn = hasGallery
    ? (
        <div className="space-y-4">
          <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
            {selectedImage ? (
              <ProductImage
                key={selectedImage || "main-image"}
                url={selectedImage}
                alt={product.name}
                className="aspect-square w-full object-cover"
                priority={true}
                width={700}
                height={700}
                size="large"
                aspectRatio="square"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center">
                <span className="text-sm text-muted-foreground">No image</span>
              </div>
            )}
          </Card>

          {baseImages.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {baseImages.map((image, index) => (
                <button
                  key={image || index}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={cn(
                    "relative overflow-hidden rounded-lg border bg-white transition-all",
                    selectedImage === image
                      ? "border-primary ring-1 ring-primary"
                      : "border-transparent hover:border-primary/40",
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
      )
    : null;

  const infoColumn = (
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

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {product.name}
            {selectedSizeLabel && (
              <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">
                · {selectedSizeLabel}
              </span>
            )}
          </h1>

          {showPrice && (
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-2xl font-bold text-primary">
                  ₹{unitPrice.toFixed(2)}
                </p>
                {discountPercent !== null && resolvedOriginalPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{resolvedOriginalPrice.toFixed(2)}
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
                  "Free shipping on eligible orders"
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* variants */}
      <div className="space-y-4">
        {/* colors */}
        {colorOptions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Color</span>
              <span className="text-xs capitalize text-muted-foreground">
                {selectedColor?.name || "Choose"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color: any) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "relative h-9 w-9 rounded-full border bg-white transition-all",
                    selectedColor?.value === color.value
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border hover:border-primary/60",
                  )}
                  style={{ backgroundColor: color.hex || color.value }}
                  title={color.name}
                >
                  {selectedColor?.value === color.value && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-2.5 w-2.5 rounded-full bg-white shadow" />
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
              <span className="text-sm font-medium text-foreground">Size</span>
              <span className="text-xs text-muted-foreground">
                {selectedSizeLabel || "Choose"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((sz: any) => {
                const priceInfo = computeVariantPrice(sz);
                const finalPrice = Number.isFinite(priceInfo.final)
                  ? priceInfo.final
                  : 0;
                const originalPrice =
                  priceInfo.original && priceInfo.original > finalPrice
                    ? priceInfo.original
                    : undefined;
                return (
                  <button
                    key={sz.value}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    disabled={sz.inStock === false}
                    className={cn(
                      "rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all bg-background/80 hover:bg-background shadow-sm/0",
                      selectedSize?.value === sz.value
                        ? "border-primary border-dashed bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10"
                        : "border-border text-foreground/80 hover:border-primary/40 hover:bg-accent/5",
                      sz.inStock === false &&
                        "cursor-not-allowed opacity-40 line-through",
                    )}
                  >
                    <div className="flex flex-col items-start gap-0.5 text-left">
                      <span>{formatSizeOptionLabel(sz)}</span>
                      <span className="text-[11px] font-semibold text-foreground">
                        ₹{finalPrice.toFixed(2)}
                      </span>
                      {originalPrice && (
                        <span className="text-[10px] text-muted-foreground line-through">
                          ₹{originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* standard combos */}
        {standardCombos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Combo <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedCombo?.name || "None selected"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {standardCombos.map((cb: any) => {
                const baseName = stripPcsSuffix(cb.name || "");
                const suffix =
                  cb.discountType && typeof cb.discountValue === "number"
                    ? ` −${
                        cb.discountType === "percent"
                          ? `${cb.discountValue}%`
                          : `₹${cb.discountValue}`
                      }`
                    : "";
                return (
                  <button
                    key={cb.value}
                    type="button"
                    onClick={() => {
                      if (selectedCombo?.value === cb.value) {
                        setSelectedCombo(null);
                      } else {
                        setSelectedCombo(cb);
                      }
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition-all bg-background/80 hover:bg-background",
                      selectedCombo?.value === cb.value
                        ? "border-primary border-dashed bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10"
                        : "border-border text-foreground/80 hover:border-primary/40 hover:bg-accent/5",
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

        {/* bundle combos: show buttons only (no deep mix & match UI to keep embed lightweight) */}
        {bundleCombos.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">
              Bundle Options <span className="text-xs font-normal text-muted-foreground">(Mix & Match)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bundleCombos.map((bundle: any) => {
                const itemsCount = Number(bundle.items) > 0 ? Number(bundle.items) : 1;
                const discountLabel =
                  bundle.discountType && typeof bundle.discountValue === "number"
                    ? bundle.discountType === "percent"
                      ? `${bundle.discountValue}% off`
                      : `₹${bundle.discountValue} off`
                    : "Special price";
                return (
                  <button
                    key={bundle.value}
                    type="button"
                    onClick={() => {
                      if (selectedCombo?.value === bundle.value) {
                        setSelectedCombo(null);
                      } else {
                        setSelectedCombo({
                          name: bundle.name,
                          value: bundle.value,
                          items: itemsCount,
                          priceOverride:
                            typeof bundle.priceOverride === "number"
                              ? bundle.priceOverride
                              : undefined,
                          description: bundle.description,
                          discountType: bundle.discountType,
                          discountValue: bundle.discountValue,
                        });
                      }
                    }}
                    className={cn(
                      "p-3 text-left rounded-lg border transition-colors bg-background/80",
                      selectedCombo?.value === bundle.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground/80 hover:border-primary/40 hover:bg-accent/5",
                    )}
                  >
                    <div className="font-medium text-sm">{bundle.name}</div>
                    <div className="text-xs text-muted-foreground">{discountLabel}</div>
                    {itemsCount > 1 && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Buy any {itemsCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* qty + add to cart */}
      {showCTA && (
        <Card className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Qty
              </span>
              <div className="flex items-center overflow-hidden rounded-full border bg-white text-[13px]">
                <button
                  type="button"
                  onClick={handleDecreaseQuantity}
                  disabled={disabled || quantity <= 1}
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
                  onClick={handleIncreaseQuantity}
                  disabled={disabled}
                  className="grid h-6 w-6 place-items-center bg-primary/5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="text-right text-sm">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">₹{selectedTotal.toFixed(2)}</p>
                {selectedCombo && (
                  <p className="text-xs text-green-600">Bundle savings applied!</p>
                )}
              </div>
              <Button
                className="flex-1 max-w-[180px]"
                onClick={handleAddToCart}
                disabled={disabled || !product.inStock}
                size="lg"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {resolvedCtaLabel}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "grid gap-6 md:gap-10 md:pt-4",
        hasGallery ? "md:grid-cols-2" : "md:grid-cols-1",
      )}
    >
      {hasGallery && align === "right" ? (
        <>
          {infoColumn}
          {imageColumn}
        </>
      ) : (
        <>
          {imageColumn}
          {infoColumn}
        </>
      )}
    </div>
  );
}
