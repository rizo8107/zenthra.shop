import { ComponentConfig } from "@measured/puck";
import { useEffect, useMemo, useState } from "react";
import { getProduct, type Product, pocketbase } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Minus, Star } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export interface SingleProductProps {
  productId?: string;
  showGallery?: boolean;
  showPrice?: boolean;
  showFeatures?: boolean;
  showCTA?: boolean;
  align?: "left" | "right"; // image side
  ribbonText?: string;
  theme?: "brand" | "green" | "neutral";
  ctaLabel?: string;
}

const Gallery = ({ images, alt, radiusClass }: { images: string[]; alt: string; radiusClass: string }) => {
  const src = images?.[0] ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/products/${images[0]}` : '';
  return (
    <div className={cn("aspect-square w-full overflow-hidden bg-muted", radiusClass)}>
      {src ? (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={src} alt={alt || "Product image"} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
};

function SingleProductClient({ productId, showGallery = true, showPrice = true, showFeatures = true, showCTA = true, align = "left", ribbonText, theme = "green", ctaLabel = "Add To Cart", puck }: SingleProductProps & { puck?: { isEditing?: boolean } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!productId) return;
      try {
        setLoading(true);
        const p = await getProduct(productId);
        if (mounted) setProduct(p as any);
      } catch (e) {
        console.warn("SingleProductDetails: failed to fetch product", e);
      } finally { setLoading(false); }
    };
    run();
    return () => { mounted = false; };
  }, [productId]);

  // Must be declared before any early returns to keep hook order stable
  const themeStyles = useMemo(() => {
    if (theme === "brand") return { btn: "from-violet-600 to-fuchsia-500", badge: "bg-violet-600/90" };
    if (theme === "neutral") return { btn: "from-stone-700 to-stone-500", badge: "bg-stone-700/90" };
    return { btn: "from-emerald-600 to-lime-500", badge: "bg-emerald-700/90" };
  }, [theme]);

  if (!productId) {
    return (
      <div className="rounded-xl border bg-card text-card-foreground p-6">
        <p className="text-sm text-muted-foreground">Select a Product ID in the sidebar to preview.</p>
      </div>
    );
  }

  if (loading || !product) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
        <div className="space-y-3">
          <div className="h-8 w-2/3 bg-muted animate-pulse rounded" />
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
          <div className="h-10 w-40 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }


  const Details = (
    <div className="space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>
      {showPrice && (
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold">₹{product.price?.toFixed?.(2) ?? product.price}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-muted-foreground line-through">₹{product.original_price.toFixed(2)}</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span>{(product as any).reviews ?? 0}.0</span>
        <span>•</span>
        <span>in stock</span>
      </div>
      {product.description && (
        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{product.description}</p>
      )}
      {showFeatures && Array.isArray(product.features) && product.features.length > 0 && (
        <ul className="space-y-1 list-disc pl-5 text-sm">
          {product.features.slice(0, 6).map((f: any, i: number) => (
            <li key={i}>{String(f)}</li>
          ))}
        </ul>
      )}
      {showCTA && (
        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center border rounded-full overflow-hidden bg-background">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQty((q) => Math.max(1, q-1))}><Minus className="h-4 w-4" /></Button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQty((q) => q+1)}><Plus className="h-4 w-4" /></Button>
          </div>
          <Button
            disabled={!!puck?.isEditing}
            onClick={() => addItem(product as any, qty, '')}
            className={cn("px-8 h-10 rounded-full text-white bg-gradient-to-r", themeStyles.btn)}
          >
            {ctaLabel}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className={cn("grid gap-8 items-start", "md:grid-cols-2")}> 
        {align === "left" ? (
          <>
            <div className="relative">
              {showGallery && <Gallery images={product.images || []} alt={product.name} radiusClass="rounded-3xl" />}
              {ribbonText && (
                <div className={cn("absolute left-0 top-0 w-full text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-t-3xl", themeStyles.badge)}>
                  {ribbonText}
                </div>
              )}
            </div>
            {Details}
          </>
        ) : (
          <>
            {Details}
            <div className="relative">
              {showGallery && <Gallery images={product.images || []} alt={product.name} radiusClass="rounded-3xl" />}
              {ribbonText && (
                <div className={cn("absolute left-0 top-0 w-full text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-t-3xl", themeStyles.badge)}>
                  {ribbonText}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export const SingleProductDetails: ComponentConfig<SingleProductProps> = {
  label: "Single Product",
  fields: {
    productId: {
      type: "custom",
      label: "Product",
      render: ({ value, onChange }) => {
        const [q, setQ] = useState("");
        const [list, setList] = useState<{ id: string; name: string }[]>([]);
        const run = async (term: string) => {
          try {
            const res = await pocketbase.collection('products').getList(1, 10, { filter: term ? `name~"${term}"` : '', $autoCancel: false });
            setList(res.items.map((it: any) => ({ id: it.id, name: it.name })));
          } catch { setList([]); }
        };
        return (
          <div className="space-y-2">
            <input value={q} onChange={(e) => { setQ(e.target.value); run(e.target.value); }} placeholder="Search product by name" className="w-full border rounded-md px-2 py-1 text-sm" />
            <div className="max-h-40 overflow-auto border rounded-md">
              {list.map((it) => (
                <button key={it.id} type="button" onClick={() => onChange(it.id)} className={cn("w-full text-left px-2 py-1 text-sm hover:bg-muted", value === it.id && "bg-muted")}>{it.name}</button>
              ))}
            </div>
            <input value={value as string || ''} onChange={(e)=>onChange(e.target.value)} placeholder="Or paste product ID" className="w-full border rounded-md px-2 py-1 text-sm" />
          </div>
        );
      }
    },
    showGallery: { type: "radio", label: "Show Gallery", options: [{ label: "No", value: false }, { label: "Yes", value: true }] },
    showPrice: { type: "radio", label: "Show Price", options: [{ label: "No", value: false }, { label: "Yes", value: true }] },
    showFeatures: { type: "radio", label: "Show Features", options: [{ label: "No", value: false }, { label: "Yes", value: true }] },
    showCTA: { type: "radio", label: "Show CTA", options: [{ label: "No", value: false }, { label: "Yes", value: true }] },
    align: { type: "select", label: "Image Side", options: [
      { label: "Left", value: "left" }, { label: "Right", value: "right" }
    ]},
    ribbonText: { type: "text", label: "Ribbon Text (e.g., FLAT 20% off | Use Code: HURRY20)" },
    theme: { type: "select", label: "Theme", options: [
      { label: "Green Gradient", value: "green" },
      { label: "Brand (Violet)", value: "brand" },
      { label: "Neutral", value: "neutral" },
    ]},
    ctaLabel: { type: "text", label: "CTA Label" },
  },
  defaultProps: {
    productId: "",
    showGallery: true,
    showPrice: true,
    showFeatures: true,
    showCTA: true,
    align: "left",
    ribbonText: "",
    theme: "green",
    ctaLabel: "Add To Cart",
  },
  render: (props) => <SingleProductClient {...props} />,
};
