import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { getProducts, type Product, pocketbase } from "@/lib/pocketbase";
import { Link } from "react-router-dom";
import { FileText, Link as LinkIcon, Search, ShoppingBag } from "lucide-react";

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
    const prod = products.filter((p) =>
      (p.name || "").toLowerCase().includes(normalizedQuery) ||
      (p.description || "").toLowerCase().includes(normalizedQuery) ||
      (Array.isArray(p.tags) ? p.tags : []).some((t) => t.toLowerCase().includes(normalizedQuery))
    ).slice(0, 8);
    const pg = pages.filter((p) =>
      (p.title || "").toLowerCase().includes(normalizedQuery) || (p.slug || "").toLowerCase().includes(normalizedQuery)
    ).slice(0, 8);
    return { products: prod, pages: pg };
  }, [normalizedQuery, products, pages]);

  const quickLinks = [
    { label: "Shop", to: "/shop", icon: ShoppingBag },
    { label: "Cart", to: "/cart", icon: ShoppingBag },
    { label: "Contact", to: "/contact", icon: LinkIcon },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search products and pages... (Ctrl/Cmd + K)" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>{loading ? "Loading..." : "No results found."}</CommandEmpty>

        <CommandGroup heading="Quick Links">
          {quickLinks.map((q) => (
            <CommandItem
              key={q.to}
              onSelect={() => {
                onOpenChange(false);
                navigate(q.to);
              }}
            >
              <q.icon className="mr-2 h-4 w-4" />
              <span>{q.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {filtered.products.length > 0 && (
          <CommandGroup heading="Products">
            {filtered.products.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => {
                  onOpenChange(false);
                  navigate(`/product/${p.id}`);
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                <span className="mr-2 line-clamp-1">{p.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">₹{Number(p.price || 0)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filtered.pages.length > 0 && (
          <CommandGroup heading="Pages">
            {filtered.pages.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => {
                  onOpenChange(false);
                  navigate(`/page/${p.slug}`);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span className="mr-2 line-clamp-1">{p.title || p.slug}</span>
                <span className="ml-auto text-xs text-muted-foreground">/page/{p.slug}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
