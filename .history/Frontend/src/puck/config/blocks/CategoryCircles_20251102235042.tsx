import { ComponentConfig } from "@measured/puck";
import { cn } from "@/lib/utils";

type Align = "left" | "center" | "right";

export interface CategoryItem {
  label?: string;
  href?: string;
  image?: string; // replace with your ImageSelector if you prefer
  alt?: string;
}

export interface CategoryCirclesProps {
  align?: Align;
  items: CategoryItem[];

  size?: number;        // circle diameter in px (default 120)
  gap?: number;         // gap between tiles in px (default 20)

  borderWidth?: number; // outer ring width in px
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
    shadow: { type: "switch", label: "Shadow" },
    hoverLift: { type: "switch", label: "Hover lift" },

    items: {
      type: "array",
      label: "Items",
      getItemSummary: (item: CategoryItem) => item?.label || "Item",
      fields: {
        label: { type: "text", label: "Label" },
        href: { type: "text", label: "Link URL" },
        image: { type: "image", label: "Image" },
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
      { label: "New Launches", href: "#", image: "https://picsum.photos/200?1" },
      { label: "Shampoos", href: "#", image: "https://picsum.photos/200?2" },
      { label: "Serums", href: "#", image: "https://picsum.photos/200?3" },
      { label: "Anti-Acne Range", href: "#", image: "https://picsum.photos/200?4" },
      { label: "Face Masks", href: "#", image: "https://picsum.photos/200?5" },
      { label: "Moisturisers", href: "#", image: "https://picsum.photos/200?6" },
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
          <div
            className="flex flex-wrap items-start"
            style={{ gap }}
          >
            {p.items?.map((it, idx) => {
              const Tile = (
                <div key={idx} className="flex flex-col items-center">
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

              // Safe link handling inside editor
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
