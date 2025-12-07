import { ComponentConfig } from "@measured/puck";
import { cn } from "@/lib/utils";
import { ImageSelector } from "@/puck/fields/ImageSelector";
import { useState, useEffect, useRef } from "react";

export interface HeroCardSlide {
  brandName?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  productImage?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export interface HeroCardProps {
  slides?: HeroCardSlide[];
  textColor?: "white" | "black";
  cardRadius?: "none" | "md" | "lg" | "xl" | "2xl" | "3xl";
  autoplay?: boolean;
  autoplayDelay?: number;
}

export const HeroCard: ComponentConfig<HeroCardProps> = {
  label: "Hero Card Carousel",
  fields: {
    slides: {
      type: "array",
      label: "Slides",
      arrayFields: {
        brandName: { type: "text", label: "Brand Name" },
        title: { type: "text", label: "Title" },
        description: { type: "textarea", label: "Description" },
        buttonText: { type: "text", label: "Button Text" },
        buttonHref: { type: "text", label: "Button Link" },
        productImage: { ...ImageSelector, label: "Background Image" },
        gradientFrom: {
          type: "custom" as const,
          label: "Gradient Start",
          render: ({ value, onChange }) => {
            const strValue = typeof value === "string" && value ? value : "#4ade80";
            return (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={strValue}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                  aria-label="Gradient start color"
                />
                <input
                  type="text"
                  value={strValue}
                  onChange={(e) => onChange(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded text-xs"
                />
              </div>
            );
          },
        },
        gradientTo: {
          type: "custom" as const,
          label: "Gradient End",
          render: ({ value, onChange }) => {
            const strValue = typeof value === "string" && value ? value : "#16a34a";
            return (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={strValue}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                  aria-label="Gradient end color"
                />
                <input
                  type="text"
                  value={strValue}
                  onChange={(e) => onChange(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded text-xs"
                />
              </div>
            );
          },
        },
      },
      defaultItemProps: {
        brandName: "Brand",
        title: "Product Title",
        description: "Amazing product description here.",
        buttonText: "SHOP NOW",
        buttonHref: "/shop",
        gradientFrom: "#4ade80",
        gradientTo: "#16a34a",
      },
      getItemSummary: (item) => item.title || "Slide",
    },
    textColor: {
      type: "select",
      label: "Text Color",
      options: [
        { label: "White", value: "white" },
        { label: "Black", value: "black" },
      ],
    },
    cardRadius: {
      type: "select",
      label: "Card Border Radius",
      options: [
        { label: "None", value: "none" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
        { label: "XL", value: "xl" },
        { label: "2XL", value: "2xl" },
        { label: "3XL", value: "3xl" },
      ],
    },
    autoplay: {
      type: "radio",
      label: "Autoplay",
      options: [
        { label: "Off", value: false },
        { label: "On", value: true },
      ],
    },
    autoplayDelay: {
      type: "number",
      label: "Autoplay Delay (ms)",
    },
  },
  defaultProps: {
    slides: [
      {
        brandName: "Murad",
        title: "Retinol Youth Renewal Night Cream",
        description: "Retinol Tri-Active Technology helps fight the appearance of lines and wrinkles.",
        buttonText: "20% OFF | BUY NOW",
        buttonHref: "/shop",
        gradientFrom: "#4ade80",
        gradientTo: "#16a34a",
      },
      {
        brandName: "Brand",
        title: "Another Amazing Product",
        description: "Discover our premium collection.",
        buttonText: "SHOP NOW",
        buttonHref: "/shop",
        gradientFrom: "#8b5cf6",
        gradientTo: "#6d28d9",
      },
    ],
    textColor: "white",
    cardRadius: "2xl",
    autoplay: true,
    autoplayDelay: 5000,
  },
  render: ({
    slides = [],
    textColor,
    cardRadius,
    autoplay,
    autoplayDelay,
    puck,
  }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [animKey, setAnimKey] = useState(0);
    const total = slides.length;

    // Autoplay
    useEffect(() => {
      if (!autoplay || total <= 1) return;
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % total);
        setAnimKey((prev) => prev + 1);
      }, autoplayDelay || 5000);
      return () => clearInterval(interval);
    }, [autoplay, autoplayDelay, total]);

    const goTo = (index: number) => {
      setCurrentIndex(index);
      setAnimKey((prev) => prev + 1);
    };

    const radiusClasses: Record<string, string> = {
      none: "rounded-none",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
      "3xl": "rounded-3xl",
    };

    const textColorClass = textColor === "black" ? "text-gray-900" : "text-white";

    if (total === 0) {
      return (
        <section className="w-full px-4 py-4">
          <div className="h-[200px] md:h-[280px] rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
            Add slides to display the carousel
          </div>
        </section>
      );
    }

    return (
      <section className="w-full px-4 py-4">
        <div className="relative">
          {/* Carousel Container */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className="w-full flex-shrink-0 px-1"
                >
                  <div
                    className={cn(
                      "relative overflow-hidden min-h-[180px] md:min-h-[280px]",
                      radiusClasses[cardRadius || "2xl"]
                    )}
                    style={{
                      background: slide.productImage
                        ? `linear-gradient(135deg, ${slide.gradientFrom || "#4ade80"}cc 0%, ${slide.gradientTo || "#16a34a"}cc 100%), url(${slide.productImage})`
                        : `linear-gradient(135deg, ${slide.gradientFrom || "#4ade80"} 0%, ${slide.gradientTo || "#16a34a"} 100%)`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {/* Content */}
                    <div className={cn("relative z-10 p-5 md:p-8 h-full flex flex-col justify-center")}>
                      {/* Brand */}
                      {slide.brandName && (
                        <span className={cn("text-xs md:text-sm font-medium opacity-90 mb-1", textColorClass)}>
                          {slide.brandName}
                        </span>
                      )}

                      {/* Title */}
                      <h2 className={cn(
                        "font-bold leading-tight mb-2 text-xl md:text-2xl lg:text-3xl max-w-[70%] md:max-w-[60%]",
                        textColorClass
                      )}>
                        {slide.title}
                      </h2>

                      {/* Description */}
                      {slide.description && (
                        <p className={cn(
                          "text-xs md:text-sm opacity-80 mb-4 line-clamp-2 md:line-clamp-3 max-w-[65%] md:max-w-[50%]",
                          textColorClass
                        )}>
                          {slide.description}
                        </p>
                      )}

                      {/* Button */}
                      {slide.buttonText && (
                        <div className="mt-2">
                          {puck?.isEditing ? (
                            <button
                              className={cn(
                                "inline-flex items-center px-4 py-2 text-xs md:text-sm font-semibold rounded-full transition-all",
                                textColor === "black"
                                  ? "bg-gray-900 text-white hover:bg-gray-800"
                                  : "bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30"
                              )}
                            >
                              {slide.buttonText}
                            </button>
                          ) : (
                            <a
                              href={slide.buttonHref || "#"}
                              className={cn(
                                "inline-flex items-center px-4 py-2 text-xs md:text-sm font-semibold rounded-full transition-all",
                                textColor === "black"
                                  ? "bg-gray-900 text-white hover:bg-gray-800"
                                  : "bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30"
                              )}
                            >
                              {slide.buttonText}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    );
  },
};
