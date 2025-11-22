import { ComponentConfig } from "@measured/puck";
import ProductCard from "@/components/ProductCard";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import { getProducts, Product } from "@/lib/pocketbase";
import { cn } from "@/lib/utils";

export interface ProductGridProps {
  title?: string;
  description?: string;
  category?: string;
  limit?: number;
  backgroundColor?: string;
  // grid mode columns
  columnsDesktop?: 2 | 3 | 4;
  columnsTablet?: 1 | 2 | 3 | 4;
  columnsMobile?: 1 | 2 | 3 | 4;
  showFeatured?: boolean;
  mode?: "grid" | "carousel";
  carouselRows?: 1 | 2;
  showArrows?: boolean;
  showDots?: boolean;
  // Card overrides
  cardShowDescription?: boolean;
  cardTitleSize?: "sm" | "md" | "lg";
  cardDescSize?: "sm" | "md" | "lg";
  cardCorner?: "rounded" | "square" | "pill";
  imageCorner?: "rounded" | "square" | "pill";
  cardCtaLabel?: string;
  cardImageRatio?: "portrait" | "square" | "wide";
  cardSpacing?: "compact" | "comfortable";
  cardGapPx?: number;
  imagePadding?: number;
  cardLayout?: "band" | "simple" | "split";
}

const ProductGridContent = ({
  title,
  description,
  category,
  limit,
  backgroundColor,
  columnsDesktop,
  columnsTablet,
  columnsMobile,
  showFeatured,
  mode,
  carouselRows = 1,
  showArrows = true,
  showDots = true,
  cardShowDescription,
  cardTitleSize,
  cardDescSize,
  cardCorner,
  imageCorner,
  cardCtaLabel,
  cardImageRatio,
  cardSpacing,
  cardGapPx,
  imagePadding,
  cardLayout,
}: ProductGridProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [internalCategory, setInternalCategory] = useState<string>(category || "");

  useEffect(() => {
    setInternalCategory(category || "");
  }, [category]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const allProducts = await getProducts();

        let filtered = allProducts;

        if (showFeatured) {
          filtered = filtered.filter((p) => p.bestseller);
        }

        if (internalCategory) {
          const term = internalCategory.toLowerCase();
          filtered = filtered.filter((p) => {
            const name = p.name?.toLowerCase() || "";
            const cat =
              (p as any).category?.toLowerCase?.() ||
              ("" + (p as any).category || "").toLowerCase();
            const desc =
              (p as any).description?.toLowerCase?.() ||
              ("" + (p as any).description || "").toLowerCase();
            return name.includes(term) || cat.includes(term) || desc.includes(term);
          });
        }

        filtered = filtered.slice(0, limit || 8);
        setProducts(filtered);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit, internalCategory, showFeatured]);

  // track breakpoint
  useEffect(() => {
    const el = containerRef.current;
    const compute = (w: number): "desktop" | "tablet" | "mobile" =>
      w >= 1024 ? "desktop" : w >= 640 ? "tablet" : "mobile";

    const H = 24;
    let raf: number | null = null;

    const update = (w: number) => {
      setDevice((prev) => {
        if (prev === "desktop") return w < 1024 - H ? compute(w) : prev;
        if (prev === "tablet")
          return w > 1024 + H || w < 640 - H ? compute(w) : prev;
        return w > 640 + H ? compute(w) : prev;
      });
    };

    if (!el || typeof ResizeObserver === "undefined") {
      const w = typeof window !== "undefined" ? window.innerWidth : 0;
      update(w);
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || 0;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => update(w));
    });

    ro.observe(el);
    update(el.clientWidth);

    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const gridCols = useMemo(() => {
    const m = Math.max(1, columnsMobile || 1);
    const t = Math.max(1, columnsTablet || 2);
    const d = Math.max(1, columnsDesktop || 4);
    return [`grid-cols-${m}`, `sm:grid-cols-${t}`, `lg:grid-cols-${d}`].join(" ");
  }, [columnsMobile, columnsTablet, columnsDesktop]);

  const gapPx = typeof cardGapPx === "number" && cardGapPx >= 0 ? cardGapPx : 20;

  const currentCols =
    device === "desktop"
      ? columnsDesktop || 4
      : device === "tablet"
      ? columnsTablet || 2
      : columnsMobile || 1;

  const itemsPerPage = (currentCols as number) * (carouselRows as number);

  const pages = useMemo(() => {
    if (mode !== "carousel" || !products.length) return [] as Product[][];
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += itemsPerPage) {
      chunks.push(products.slice(i, i + itemsPerPage));
    }
    return chunks;
  }, [products, itemsPerPage, mode]);

  const cardOverrides = useMemo(
    () => ({
      showDescription: cardShowDescription,
      titleSize: cardTitleSize,
      descSize: cardDescSize,
      corner: cardCorner,
      imageCorner,
      ctaLabel: cardCtaLabel,
      imageRatio: cardImageRatio,
      spacing: cardSpacing,
      imagePadding,
      layout: cardLayout,
    }),
    [
      cardShowDescription,
      cardTitleSize,
      cardDescSize,
      cardCorner,
      imageCorner,
      cardCtaLabel,
      cardImageRatio,
      cardSpacing,
      imagePadding,
      cardLayout,
    ]
  );

  const [pageIndex, setPageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => setPageIndex(0), [itemsPerPage, mode, products.length]);

  // swipe
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 30;
    const isRightSwipe = distance < -30;

    if (isLeftSwipe && pageIndex < pages.length - 1) {
      setPageIndex((prev) => prev + 1);
    }
    if (isRightSwipe && pageIndex > 0) {
      setPageIndex((prev) => prev - 1);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const SectionShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <section
      className="py-10 md:py-12"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div ref={containerRef} className="konipai-container">
        {(title || description) && (
          <header className="mb-6 md:mb-8 text-center flex flex-col items-center gap-2">
            {title && (
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );

  // Loading
  if (loading) {
    return (
      <SectionShell>
        <div
          className={cn("grid", gridCols)}
          style={{ gap: gapPx }}
        >
          {Array.from({ length: limit || 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 sm:h-72 rounded-xl bg-muted/60 animate-pulse border border-border/60"
            />
          ))}
        </div>
      </SectionShell>
    );
  }

  // Empty state
  if (!loading && products.length === 0) {
    const chips = ["soap", "oil", "powder"];
    return (
      <SectionShell>
        <div className="mx-auto max-w-xl">
          <div className="bg-card border border-dashed border-border rounded-2xl p-6 md:p-8 text-center space-y-4">
            <p className="text-sm md:text-base text-muted-foreground">
              No products found for this selection.
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Try a quick filter:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs md:text-sm bg-background transition-colors",
                    internalCategory.toLowerCase() === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  )}
                  onClick={() => setInternalCategory(c)}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
              {internalCategory && (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full border text-xs md:text-sm hover:bg-muted bg-background"
                  onClick={() => setInternalCategory("")}
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  // Grid mode
  if (mode !== "carousel") {
    return (
      <SectionShell>
        <div
          className={cn("grid", gridCols)}
          style={{ gap: gapPx }}
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 4}
              overrides={cardOverrides}
            />
          ))}
        </div>
      </SectionShell>
    );
  }

  // Carousel mode
  return (
    <SectionShell>
      <div className="relative">
        {showArrows && pages.length > 1 && (
          <>
            <button
              aria-label="Previous"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 border border-border text-foreground hover:bg-muted shadow-sm items-center justify-center text-sm"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
              ‹
            </button>
            <button
              aria-label="Next"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 border border-border text-foreground hover:bg-muted shadow-sm items-center justify-center text-sm"
              onClick={() => setPageIndex((p) => Math.min(pages.length - 1, p + 1))}
            >
              ›
            </button>
          </>
        )}

        <div
          className="overflow-hidden rounded-2xl bg-transparent"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex carousel-smooth"
            style={{ transform: `translate3d(-${pageIndex * 100}%, 0, 0)` }}
          >
            {pages.map((group, gi) => (
              <div key={gi} className="shrink-0 w-full px-1 sm:px-2">
                <div
                  className={cn("grid", `grid-cols-${currentCols}`)}
                  style={{
                    gridAutoRows: "1fr",
                    minHeight: "360px",
                    gap: gapPx,
                  }}
                >
                  {group.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priority={index < currentCols}
                      overrides={cardOverrides}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showDots && pages.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {pages.map((_, di) => (
              <button
                key={di}
                aria-label={`Go to page ${di + 1}`}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  di === pageIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/40 hover:bg-muted-foreground/70"
                )}
                onClick={() => setPageIndex(di)}
              />
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
};

export const ProductGrid: ComponentConfig<ProductGridProps> = {
  fields: {
    title: { type: "text", label: "Section Title" },
    description: { type: "textarea", label: "Description (optional)" },
    category: { type: "text", label: "Category Filter" },
    limit: { type: "number", label: "Number of Products", min: 1, max: 40 },
    backgroundColor: {
      type: "custom",
      label: "Background Color",
      render: ({ value, onChange }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={
                typeof value === "string" && value !== "" && value !== "transparent"
                  ? value
                  : "#f5f5f5"
              }
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
              aria-label="Section background color"
              disabled={value === "transparent"}
            />
            <input
              type="text"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#f5f5f5 or transparent"
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
          <button
            type="button"
            className="self-start text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            onClick={() => onChange("transparent")}
          >
            Use transparent background
          </button>
        </div>
      ),
    },
    cardCorner: {
      type: "select",
      label: "Card: Corner Radius",
      options: [
        { label: "Rounded", value: "rounded" },
        { label: "Square", value: "square" },
        { label: "Pill", value: "pill" },
      ],
    },
    mode: {
      type: "select",
      label: "Display Mode",
      options: [
        { label: "Grid", value: "grid" },
        { label: "Carousel", value: "carousel" },
      ],
    },
    columnsDesktop: {
      type: "select",
      label: "Desktop Columns",
      options: [
        { label: "2", value: 2 },
        { label: "3", value: 3 },
        { label: "4", value: 4 },
      ],
    },
    columnsTablet: {
      type: "select",
      label: "Tablet Columns",
      options: [
        { label: "1", value: 1 },
        { label: "2", value: 2 },
        { label: "3", value: 3 },
        { label: "4", value: 4 },
      ],
    },
    columnsMobile: {
      type: "select",
      label: "Mobile Columns",
      options: [
        { label: "1", value: 1 },
        { label: "2", value: 2 },
        { label: "3", value: 3 },
        { label: "4", value: 4 },
      ],
    },
    showFeatured: {
      type: "radio",
      options: [
        { label: "All Products", value: false },
        { label: "Featured Only", value: true },
      ],
    },
    carouselRows: {
      type: "select",
      label: "Carousel Rows",
      options: [
        { label: "1", value: 1 },
        { label: "2", value: 2 },
      ],
    },
    showArrows: {
      type: "radio",
      label: "Show Arrows",
      options: [
        { label: "No", value: false },
        { label: "Yes", value: true },
      ],
    },
    showDots: {
      type: "radio",
      label: "Show Dots",
      options: [
        { label: "No", value: false },
        { label: "Yes", value: true },
      ],
    },
    cardShowDescription: {
      type: "radio",
      label: "Card: Show Description",
      options: [
        { label: "No", value: false },
        { label: "Yes", value: true },
      ],
    },
    cardTitleSize: {
      type: "select",
      label: "Card: Title Size",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    cardDescSize: {
      type: "select",
      label: "Card: Description Size",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    cardCtaLabel: { type: "text", label: "Card: CTA Label" },
    cardImageRatio: {
      type: "select",
      label: "Card: Image Ratio",
      options: [
        { label: "Portrait", value: "portrait" },
        { label: "Square", value: "square" },
        { label: "Wide", value: "wide" },
      ],
    },
    cardSpacing: {
      type: "select",
      label: "Card: Spacing",
      options: [
        { label: "Compact", value: "compact" },
        { label: "Comfortable", value: "comfortable" },
      ],
    },
    imageCorner: {
      type: "select",
      label: "Image: Corner Radius",
      options: [
        { label: "Rounded", value: "rounded" },
        { label: "Square", value: "square" },
        { label: "Pill", value: "pill" },
      ],
    },
    cardGapPx: {
      type: "number",
      label: "Card Gap (px)",
      min: 0,
    },
    imagePadding: {
      type: "number",
      label: "Image Padding (px)",
      min: 0,
    },
    cardLayout: {
      type: "select",
      label: "Card Layout",
      options: [
        { label: "Band (price + button)", value: "band" },
        { label: "Simple (stacked)", value: "simple" },
        { label: "Split (row, no band)", value: "split" },
      ],
    },
  },
  defaultProps: {
    title: "Featured Products",
    description: "Explore our most-loved picks, tailored just for you.",
    limit: 8,
    mode: "grid",
    columnsDesktop: 4,
    columnsTablet: 2,
    columnsMobile: 2,
    showFeatured: false,
    carouselRows: 1,
    showArrows: true,
    showDots: true,
    cardShowDescription: false,
    cardGapPx: 16,
    imagePadding: 0,
    cardLayout: "split",
    cardCtaLabel: "Add to Cart",
  },
  render: (props) => <ProductGridContent {...props} />,
};

export const KarigaiProductGrid: ComponentConfig<ProductGridProps> = ProductGrid;
