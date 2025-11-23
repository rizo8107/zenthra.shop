import { Config } from "@measured/puck";
import { Hero } from "./blocks/Hero";
import { ProductGrid } from "./blocks/ProductGrid";
import { CategorySection } from "./blocks/CategorySection";
import { FeatureSection } from "./blocks/FeatureSection";
import { TestimonialSection } from "./blocks/TestimonialSection";
import { NewsletterSection } from "./blocks/NewsletterSection";
import { Text } from "./blocks/Text";
import { Button } from "./blocks/Button";
import { Image } from "./blocks/Image";
import { Spacer } from "./blocks/Spacer";
import { Container } from "./blocks/Container";
import { Grid } from "./blocks/Grid";
import { OfferBanner } from "./blocks/OfferBanner";
import { BrandShowcase } from "./blocks/BrandShowcase";
import { ProductCardV2Block } from "./blocks/ProductCardV2";

// Root component configuration
const Root = {
  fields: {
    title: { type: "text" as const },
    description: { type: "textarea" as const },
    pageBackground: {
      type: "custom" as const,
      label: "Page Background",
      render: ({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) => {
        const strValue = typeof value === "string" ? value : "";
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={strValue !== "" ? strValue : "#f5f5f5"}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
              aria-label="Page background color"
            />
            <input
              type="text"
              value={strValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#f5f5f5"
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
        );
      },
    },
  },
  render: ({
    children,
    title,
    pageBackground,
  }: {
    children: React.ReactNode;
    title?: string;
    pageBackground?: string;
  }) => (
    <div>
      {title && <title>{title}</title>}
      <div
        className="min-h-screen bg-background"
        style={pageBackground ? { backgroundColor: pageBackground } : undefined}
      >
        {children}
      </div>
    </div>
  ),
};

export const puckConfig: Config = {
  root: Root,
  categories: {
    layout: {
      title: "Layout",
      components: ["Container", "Grid", "Spacer"],
    },
    content: {
      title: "Content",
      components: ["Text", "Image", "Button"],
    },
    ecommerce: {
      title: "E-commerce",
      components: [
        "Hero",
        "ProductGrid",
        "ProductCardV2Block",
        "CategorySection",
        "OfferBanner",
        "BrandShowcase",
      ],
    },
    marketing: {
      title: "Marketing",
      components: ["FeatureSection", "TestimonialSection", "NewsletterSection"],
    },
  },
  components: {
    // Layout Components
    Container,
    Grid,
    Spacer,
    
    // Content Components
    Text,
    Image,
    Button,
    
    // E-commerce Components
    Hero,
    ProductGrid,
    ProductCardV2Block,
    CategorySection,
    OfferBanner,
    BrandShowcase,
    
    // Marketing Components
    FeatureSection,
    TestimonialSection,
    NewsletterSection,
  },
};

export default puckConfig;
