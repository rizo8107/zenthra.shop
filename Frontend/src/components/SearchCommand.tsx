import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { getProducts, type Product, pocketbase } from "@/lib/pocketbase";
import { FileText, Link as LinkIcon, Search, ShoppingBag, ShoppingCart, Mail } from "lucide-react";

type PageLite = { id: string; title?: string; slug?: string; published?: boolean };

export default function SearchCommand({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [pages, setPages] = useState<PageLite[]>([]);
  const [loading, setLoading] = useState(false);

  // Toggle with Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Prefetch products (limited)
        const prod = await getProducts();
        if (!cancelled) setProducts(prod || []);
        // Prefetch pages (published)
        const pg = await pocketbase.collection("pages").getFullList<PageLite>({
          filter: "published=true",
          fields: "id,title,slug,published",
          sort: "-updated",
          $autoCancel: false,
        });
        if (!cancelled) setPages(pg || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) {
      return {
        products: products.slice(0, 8),
        pages: pages.slice(0, 8),
      };
    }
    const prod = products
      .filter((p) => (p.name || "").toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
    const pg = pages.filter((p) =>
      (p.title || "").toLowerCase().includes(normalizedQuery) || (p.slug || "").toLowerCase().includes(normalizedQuery)
    ).slice(0, 8);
    return { products: prod, pages: pg };
  }, [normalizedQuery, products, pages]);

  const quickLinks = [
    { label: "Shop", to: "/shop", icon: ShoppingBag },
    { label: "Cart", to: "/cart", icon: ShoppingCart },
    { label: "Contact", to: "/contact", icon: Mail },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-2 sm:p-4">
        {/* Top pill search bar with close button */}
        <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <CommandInput
            placeholder="Search products and pages... (Ctrl/Cmd + K)"
            value={query}
            onValueChange={setQuery}
            className="border-0 bg-transparent px-0 text-sm focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
          />
        </div>

        {/* Results card */}
        <div className="rounded-2xl bg-background shadow-sm border border-border/60 overflow-hidden">
          <CommandList className="max-h-[360px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {loading ? "Loading..." : "No results found."}
            </CommandEmpty>

            <CommandGroup
              heading={
                <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                  Quick links
                </div>
              }
            >
              {quickLinks.map((q) => (
                <CommandItem
                  key={q.to}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate(q.to);
                  }}
                >
                  <div className="flex items-center gap-3 w-full px-1 py-1.5">
                    <q.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{q.label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            {filtered.products.length > 0 && (
              <>
                <CommandSeparator className="mx-3 my-1" />
                <CommandGroup
                  heading={
                    <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                      Products
                    </div>
                  }
                >
                  {filtered.products.map((p) => (
                    <CommandItem
                      key={p.id}
                      onSelect={() => {
                        onOpenChange(false);
                        navigate(`/product/${p.id}`);
                      }}
                    >
                      <div className="flex items-center gap-3 w-full px-1 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground truncate">
                            {p.name}
                          </span>
                        </div>
                        <span className="ml-auto text-xs font-semibold text-foreground">
                          ₹{typeof p.price === "number" ? p.price.toFixed(2) : Number(p.price || 0).toFixed(2)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {filtered.pages.length > 0 && (
              <>
                <CommandSeparator className="mx-3 my-1" />
                <CommandGroup
                  heading={
                    <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                      Pages
                    </div>
                  }
                >
                  {filtered.pages.map((p) => (
                    <CommandItem
                      key={p.id}
                      onSelect={() => {
                        onOpenChange(false);
                        navigate(`/page/${p.slug}`);
                      }}
                    >
                      <div className="flex items-center gap-3 w-full px-1 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground truncate">{p.title || p.slug}</span>
                        </div>
                        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">
                          /page/{p.slug}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </div>
      </div>
    </CommandDialog>
  );
}
