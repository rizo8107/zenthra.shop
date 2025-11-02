import { ComponentConfig } from "@measured/puck";
import { cn } from "@/lib/utils";

// ⬇️ Edit this import to your ImageSelector editor component
// It must accept { value?: string; onChange: (url: string) => void }
import { ImageSelector } from "@/components/puck/ImageSelector";

type Align = "left" | "center" | "right";

export interface CategoryItem {
  label?: string;
  href?: string;
  image?: string; // URL stored; editor uses ImageSelector
  alt?: string;
}

export interface CategoryCirclesProps {
  align?: Align;
  items: CategoryItem[];

  size?: number;        // px
  gap?: number;         // px

  borderWidth?: number; // px
  ringColor?: "brand" | "muted" | "none";
  hoverLift?: boolean;
  shadow?: boolean;

  puck?: { isEditing?: boolean };
}

const ringClass = (tone: CategoryCirclesProps["ringColor"]) => {
  switch (tone) {
    case "brand":
      return "ring-2 ring-violet-300";
    case "muted":
      return "ring-2 ring-neutral-200";
    default:
      return "";
  }
};

export const CategoryCircles: ComponentConfig<CategoryCirclesProps> = {
  label: "Category Circles",
  fields: {
    align: {
      type: "select",
      label: "Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    size: { type: "number", label: "Circle size (px)" },
    gap: { type: "number", label: "Gap (px)" },
    borderWidth: { type: "number", label: "Border width (px)" },
    ringColor: {
      type: "select",
      label: "Ring color",
      options: [
        { label: "Brand", value: "brand" },
        { label: "Muted", value: "muted" },
        { label: "None", value: "none" },
      ],
    },
    shadow: { 
      type: "radio", 
      label: "Shadow",
      options: [ { label: "No", value: false }, { label: "Yes", value: true } ]
    },
    hoverLift: { 
      type: "radio", 
      label: "Hover lift",
      options: [ { label: "No", value: false }, { label: "Yes", value: true } ]
    },

    items: {
      type: "array",
      label: "Items",
      getItemSummary: (item: CategoryItem) => item?.label || "Item",
      fields: {
        label: { type: "text", label: "Label" },
        href: { type: "text", label: "Link URL" },
        // 🔁 Use custom ImageSelector in the Puck sidebar
        image: {
          type: "custom",
          label: "Image",
          render: ({ value, onChange }) => (
            <ImageSelector value={value as string} onChange={(url: string) => onChange(url)} />
          ),
        },
        alt: { type: "text", label: "Alt text" },
      },
    },
  },

  defaultProps: {
    align: "center",
    size: 120,
    gap: 24,
    borderWidth: 2,
    ringColor: "brand",
    shadow: false,
    hoverLift: true,
    items: [
      { label: "New Launches", href: "#", image: "https://picsum.photos/360?1" },
      { label: "Shampoos", href: "#", image: "https://picsum.photos/360?2" },
      { label: "Serums", href: "#", image: "https://picsum.photos/360?3" },
      { label: "Anti-Acne Range", href: "#", image: "https://picsum.photos/360?4" },
      { label: "Face Masks", href: "#", image: "https://picsum.photos/360?5" },
      { label: "Moisturisers", href: "#", image: "https://picsum.photos/360?6" },
    ],
  },

  render: (p) => {
    const isEditing = !!p.puck?.isEditing;

    const size = Math.max(72, Number(p.size) || 120);
    const gap = Math.max(8, Number(p.gap) || 24);
    const border = Math.max(0, Number(p.borderWidth) || 2);

    return (
      <section className="overflow-hidden px-4 sm:px-6 lg:px-8 py-6">
        <div
          className={cn(
            "max-w-7xl mx-auto",
            p.align === "left" && "text-left",
            p.align === "center" && "text-center",
            p.align === "right" && "text-right"
          )}
        >
          {/* Mobile: horizontal carousel (no-wrap, snap)  |  md+: wrapped grid */}
          <div
            className={cn(
              "flex items-start -mx-2 px-2 no-scrollbar",
              "overflow-x-auto md:overflow-visible",
              "snap-x snap-mandatory md:snap-none",
              "md:flex-wrap"
            )}
            style={{ gap }}
          >
            {p.items?.map((it, idx) => {
              const Tile = (
                <div key={idx} className="flex flex-col items-center snap-start">
                  <div
                    className={cn(
                      "rounded-full overflow-hidden bg-white border",
                      ringClass(p.ringColor),
                      p.shadow && "shadow-sm",
                      p.hoverLift && "transition-transform duration-200 hover:-translate-y-1"
                    )}
                    style={{
                      width: size,
                      height: size,
                      borderWidth: border,
                      marginRight: gap, // keeps spacing in mobile flow
                    }}
                    aria-hidden={!it.alt}
                    role={it.alt ? "img" : undefined}
                  >
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image}
                        alt={it.alt || ""}
                        className="h-full w-full object-cover"
                        draggable={false}
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full bg-neutral-100" />
                    )}
                  </div>
                  {it.label && (
                    <div className="mt-2 w-[min(12rem,90%)] text-center">
                      <span className="text-sm font-medium leading-6">
                        {it.label}
                      </span>
                    </div>
                  )}
                </div>
              );

              return it.href ? (
                <a
                  key={idx}
                  href={it.href}
                  onClick={(e) => isEditing && e.preventDefault()}
                  className="inline-block"
                >
                  {Tile}
                </a>
              ) : (
                <div key={idx}>{Tile}</div>
              );
            })}
          </div>
        </div>
      </section>
    );
  },
};
