import { ComponentConfig } from "@measured/puck";
import { cn } from "@/lib/utils";
import { ImageSelector } from "@/puck/fields/ImageSelector";

export interface FeatureSectionProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  features: {
    title: string;
    description: string;
    icon?: string;
  }[];
  columns?: 2 | 3 | 4;
  centered?: boolean;
}

export const FeatureSection: ComponentConfig<FeatureSectionProps> = {
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
    columns: {
      type: "select",
      options: [
        { label: "2 Columns", value: 2 },
        { label: "3 Columns", value: 3 },
        { label: "4 Columns", value: 4 },
      ],
    },
    centered: {
      type: "radio",
      options: [
        { label: "No", value: false },
        { label: "Yes", value: true },
      ],
    },
    features: {
      type: "array",
      arrayFields: {
        title: { type: "text" },
        description: { type: "textarea" },
        icon: ImageSelector,
      },
      defaultItemProps: {
        title: "Feature Title",
        description: "Feature description goes here",
        icon: "✨",
      },
      getItemSummary: (item) => item.title || "Feature",
    },
  },
  defaultProps: {
    title: "Why Choose Us",
    subtitle: "We provide the best service with these amazing features",
    columns: 3,
    centered: true,
    features: [
      {
        title: "Fast Delivery",
        description: "Get your orders delivered quickly and safely",
        icon: "🚚",
      },
      {
        title: "Quality Products",
        description: "We ensure all products meet our high quality standards",
        icon: "⭐",
      },
      {
        title: "24/7 Support",
        description: "Our customer support team is always here to help",
        icon: "💬",
      },
    ],
  },
  render: ({ title, subtitle, backgroundColor, paddingTop, paddingRight, paddingBottom, paddingLeft, features, columns, centered }) => {
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
            <div className={cn("mb-12", centered && "text-center")}>
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
            {features.map((feature, index) => (
              <div
                key={index}
                className={cn(
                  "space-y-4",
                  centered && "text-center"
                )}
              >
                {feature.icon && (
                  <div className={cn("flex", centered ? "justify-center" : "justify-start")}>
                    {feature.icon.startsWith('http') ? (
                      <img
                        src={feature.icon}
                        alt=""
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <span className="text-4xl">{feature.icon}</span>
                    )}
                  </div>
                )}
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  },
};
