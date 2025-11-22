import { ComponentConfig } from "@measured/puck";
import { Button as UIButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageSelector } from "@/puck/fields/ImageSelector";
import { useEffect, useState } from "react";
import { pocketbase } from "@/lib/pocketbase";

export interface CategorySectionProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  categories: {
    name: string;
    image: string;
    href: string;
    description?: string;
  }[];
  columns?: 2 | 3 | 4;
  showDescription?: boolean;
  // data source
  source?: "manual" | "pocketbase";
  pbCollection?: string;
  pbLimit?: number;
  pbNameField?: string;
  pbImageField?: string;
  pbSlugField?: string;
  pbHrefPrefix?: string;
  pbDescriptionField?: string;
}

export const CategorySection: ComponentConfig<CategorySectionProps> = {
  fields: {
    title: {
      type: "text",
      label: "Section Title",
    },
    subtitle: {
      type: "textarea",
      label: "Section Subtitle",
    },
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
    paddingTop: {
      type: "number",
      label: "Section Padding Top (px)",
      min: 0,
    },
    paddingBottom: {
      type: "number",
      label: "Section Padding Bottom (px)",
      min: 0,
    },
    paddingLeft: {
      type: "number",
      label: "Section Padding Left (px)",
      min: 0,
    },
    paddingRight: {
      type: "number",
      label: "Section Padding Right (px)",
      min: 0,
    },
    source: {
      type: "select",
      label: "Data Source",
      options: [
        { label: "Manual", value: "manual" },
        { label: "PocketBase", value: "pocketbase" },
      ],
    },
    columns: {
      type: "select",
      options: [
        { label: "2 Columns", value: 2 },
        { label: "3 Columns", value: 3 },
        { label: "4 Columns", value: 4 },
      ],
    },
    showDescription: {
      type: "radio",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
    pbCollection: { type: "text", label: "PB Collection" },
    pbLimit: { type: "number", label: "Limit" },
    pbNameField: { type: "text", label: "Name field" },
    pbImageField: { type: "text", label: "Image field" },
    pbSlugField: { type: "text", label: "Slug field" },
    pbHrefPrefix: { type: "text", label: "Href prefix" },
    pbDescriptionField: { type: "text", label: "Description field" },
    categories: {
      type: "array",
      arrayFields: {
        name: { type: "text" },
        image: ImageSelector,
        href: { type: "text" },
        description: { type: "textarea" },
      },
      defaultItemProps: {
        name: "Category Name",
        image: "https://via.placeholder.com/300x200",
        href: "/category",
        description: "Category description",
      },
      getItemSummary: (item) => item.name || "Category",
    },
  },
  defaultProps: {
    title: "Shop by Category",
    subtitle: "Discover our carefully curated collections",
    columns: 3,
    showDescription: true,
    source: "manual",
    pbCollection: "categories",
    pbLimit: 12,
    pbNameField: "name",
    pbImageField: "image",
    pbSlugField: "slug",
    pbHrefPrefix: "/category/",
    pbDescriptionField: "description",
    categories: [
      {
        name: "Electronics",
        image: "https://via.placeholder.com/300x200",
        href: "/category/electronics",
        description: "Latest gadgets and electronics",
      },
      {
        name: "Fashion",
        image: "https://via.placeholder.com/300x200",
        href: "/category/fashion",
        description: "Trending fashion and accessories",
      },
      {
        name: "Home & Garden",
        image: "https://via.placeholder.com/300x200",
        href: "/category/home-garden",
        description: "Beautiful home and garden items",
      },
    ],
  },
  render: (props) => {
    const View: React.FC<typeof props> = ({ title, subtitle, backgroundColor, paddingTop, paddingRight, paddingBottom, paddingLeft, categories, columns, showDescription, source, pbCollection, pbLimit, pbNameField, pbImageField, pbSlugField, pbHrefPrefix, pbDescriptionField, puck }) => {
      const [displayCategories, setDisplayCategories] = useState(categories || []);

      useEffect(() => {
        if (source === "pocketbase") {
          (async () => {
            try {
              const list = await pocketbase
                .collection(pbCollection || "categories")
                .getList(1, pbLimit || 12, {});
              const mapped = list.items.map((r: any) => {
                const name = r[pbNameField || "name"] ?? "Category";
                const slug = r[pbSlugField || "slug"] ?? r.id;
                const description = r[pbDescriptionField || "description"] ?? "";
                const imgVal = r[pbImageField || "image"];
                let image = "";
                if (imgVal) {
                  if (typeof imgVal === "string") {
                    image = pocketbase.files.getURL(r, imgVal) as unknown as string;
                  } else if (Array.isArray(imgVal) && imgVal.length) {
                    image = pocketbase.files.getURL(r, imgVal[0]) as unknown as string;
                  }
                }
                if (!image) image = "https://via.placeholder.com/300x200";
                return {
                  name,
                  image,
                  href: (pbHrefPrefix || "/category/") + String(slug),
                  description,
                };
              });
              setDisplayCategories(mapped);
            } catch (err) {
              console.warn("[CategorySection] Failed to load categories from PocketBase", err);
              setDisplayCategories(categories || []);
            }
          })();
        } else {
          setDisplayCategories(categories || []);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [source, pbCollection, pbLimit, pbNameField, pbImageField, pbSlugField, pbHrefPrefix, pbDescriptionField, JSON.stringify(categories)]);
      const columnClasses = {
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    };

      return (
        <section
          className="py-16"
          style={{
            ...(backgroundColor ? { backgroundColor } : {}),
            ...(typeof paddingTop === "number" ? { paddingTop } : {}),
            ...(typeof paddingRight === "number" ? { paddingRight } : {}),
            ...(typeof paddingBottom === "number" ? { paddingBottom } : {}),
            ...(typeof paddingLeft === "number" ? { paddingLeft } : {}),
          }}
        >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {(title || subtitle) && (
            <div className="text-center mb-12">
              {title && (
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
              )}
              {subtitle && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          <div className={cn("grid gap-8", columnClasses[columns || 3])}>
            {displayCategories.map((category, index) => (
              <div
                key={index}
                className="group cursor-pointer"
                onClick={() => {
                  if (!puck?.isEditing && category.href) {
                    window.location.href = category.href;
                  }
                }}
              >
                <div className="relative overflow-hidden rounded-lg bg-muted aspect-[4/3] mb-4">
                  <img
                    src={category.image || "https://via.placeholder.com/300x200"}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  {showDescription && category.description && (
                    <p className="text-muted-foreground text-sm">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        </section>
      );
    };

    return <View {...props} />;
  },
};
