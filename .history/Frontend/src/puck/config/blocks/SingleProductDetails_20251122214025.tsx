import { ComponentConfig } from "@measured/puck";
import { useEffect, useState } from "react";
import { getProduct, type Product, pocketbase } from "@/lib/pocketbase";
import { LazyProductDetails } from "@/components/LazyLoad";
import { ProductDetailHeroEmbedded } from "@/components/ProductDetailHeroEmbedded";
import { cn } from "@/lib/utils";

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

function SingleProductClient({ productId, puck, showGallery, showPrice, showFeatures, showCTA, align, ribbonText, theme, ctaLabel }: SingleProductProps & { puck?: { isEditing?: boolean } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <ProductDetailHeroEmbedded
        product={product as Product}
        disabled={!!puck?.isEditing}
      />
      <div className="mt-10">
        <LazyProductDetails product={product as Product} />
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
