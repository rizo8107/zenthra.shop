import { ComponentConfig } from "@measured/puck";
import { Button as UIButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageSelector } from "@/puck/fields/ImageSelector";

export interface OfferBannerProps {
  title: string;
  subtitle?: string;
  description?: string;
  discount?: string;
  buttonText?: string;
  buttonHref?: string;
  backgroundColor?: "primary" | "secondary" | "accent" | "red" | "green" | "blue";
  textColor?: "white" | "black" | "primary";
  backgroundImage?: string;
  overlay?: boolean;
  centered?: boolean;
  layout?: "banner" | "single"; // banner = stacked hero, single = compact one-line bar
  size?: "sm" | "md" | "lg";   // visual size preset
  align?: "left" | "center" | "right";
  rounded?: boolean;
  shadow?: boolean;
  maxWidth?: "full" | "container" | "narrow"; // width constraint
}

export const OfferBanner: ComponentConfig<OfferBannerProps> = {
  fields: {
    title: {
      type: "text",
      label: "Offer Title",
    },
    subtitle: {
      type: "text",
      label: "Subtitle (optional)",
    },
    description: {
      type: "textarea",
      label: "Description (optional)",
    },
    discount: {
      type: "text",
      label: "Discount Text (e.g., '50% OFF')",
    },
    buttonText: {
      type: "text",
      label: "Button Text",
    },
    buttonHref: {
      type: "text",
      label: "Button Link",
    },
    backgroundColor: {
      type: "select",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Accent", value: "accent" },
        { label: "Red", value: "red" },
        { label: "Green", value: "green" },
        { label: "Blue", value: "blue" },
      ],
    },
    textColor: {
      type: "select",
      options: [
        { label: "White", value: "white" },
        { label: "Black", value: "black" },
        { label: "Primary", value: "primary" },
      ],
    },
    backgroundImage: ImageSelector,
    overlay: {
      type: "radio",
      options: [
        { label: "No", value: false },
        { label: "Yes", value: true },
      ],
    },
    centered: {
      type: "radio",
      options: [
        { label: "No", value: false },
        { label: "Yes", value: true },
      ],
    },
    layout: {
      type: "select",
      label: "Layout",
      options: [
        { label: "Banner (stacked)", value: "banner" },
        { label: "Single Line (compact)", value: "single" },
      ],
    },
    size: {
      type: "select",
      label: "Size",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    align: {
      type: "select",
      label: "Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    rounded: {
      type: "radio",
      label: "Rounded Corners",
      options: [
        { label: "No", value: false },
        { label: "Yes", value: true },
      ],
    },
    shadow: {
      type: "radio",
      label: "Shadow",
      options: [
        { label: "No", value: false },
        { label: "Yes", value: true },
      ],
    },
    maxWidth: {
      type: "select",
      label: "Width",
      options: [
        { label: "Full Width", value: "full" },
        { label: "Container (1200px)", value: "container" },
        { label: "Narrow (900px)", value: "narrow" },
      ],
    },
  },
  defaultProps: {
    title: "Special Offer",
    subtitle: "Limited Time Only",
    description: "Don't miss out on this amazing deal",
    discount: "50% OFF",
    buttonText: "Shop Now",
    buttonHref: "/shop",
    backgroundColor: "primary",
    textColor: "white",
    centered: true,
    overlay: false,
    layout: "banner",
    size: "lg",
    align: "center",
    rounded: true,
    shadow: false,
    maxWidth: "container",
  },
  render: ({
    title,
    subtitle,
    description,
    discount,
    buttonText,
    buttonHref,
    backgroundColor,
    textColor,
    backgroundImage,
    overlay,
    centered,
    layout,
    size,
    align,
    rounded,
    shadow,
    maxWidth,
    puck,
  }) => {
    const backgroundClasses = {
      primary: "bg-primary",
      secondary: "bg-secondary",
      accent: "bg-accent",
      red: "bg-red-600",
      green: "bg-green-600",
      blue: "bg-blue-600",
    };

    const textColorClasses = {
      white: "text-white",
      black: "text-black",
      primary: "text-primary",
    };

    // sizing presets
    const padY = size === "sm" ? "py-4" : size === "md" ? "py-10" : "py-16";
    const containerWidth = maxWidth === "full" ? "w-full" : maxWidth === "narrow" ? "max-w-4xl" : "max-w-7xl";
    const justify = align === "left" ? "justify-start text-left" : align === "right" ? "justify-end text-right" : "justify-center text-center";

    // compact single-line layout
    if (layout === "single") {
      return (
        <section
          className={cn(
            "relative px-4 sm:px-6 lg:px-8 overflow-hidden mx-auto",
            padY,
            containerWidth,
            !backgroundImage && backgroundClasses[backgroundColor || "primary"],
            textColorClasses[textColor || "white"],
            rounded && "rounded-xl",
            shadow && "shadow-md"
          )}
          style={{
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {overlay && backgroundImage && (
            <div className="absolute inset-0 bg-black/40" />
          )}
          <div className={cn("relative z-10")}> 
            <div className={cn("w-full flex items-center gap-4", justify)}>
              {discount && (
                <span className="font-extrabold tracking-tight text-xl sm:text-2xl">
                  {discount}
                </span>
              )}
              <div className="hidden sm:block opacity-60">|</div>
              <div className="text-sm sm:text-base line-clamp-1">
                {[subtitle, title, description].filter(Boolean).join(" • ")}
              </div>
              {buttonText && buttonHref && (
                <UIButton
                  size="sm"
                  variant="secondary"
                  asChild={!puck?.isEditing}
                  disabled={puck?.isEditing}
                  className="ml-2 whitespace-nowrap bg-white text-black hover:bg-gray-100"
                >
                  {puck?.isEditing ? buttonText : <a href={buttonHref}>{buttonText}</a>}
                </UIButton>
              )}
            </div>
          </div>
        </section>
      );
    }

    // default banner layout
    return (
      <section
        className={cn(
          "relative px-4 sm:px-6 lg:px-8 overflow-hidden mx-auto",
          padY,
          containerWidth,
          !backgroundImage && backgroundClasses[backgroundColor || "primary"],
          textColorClasses[textColor || "white"],
          rounded && "rounded-xl",
          shadow && "shadow-md"
        )}
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {overlay && backgroundImage && (
          <div className="absolute inset-0 bg-black/50" />
        )}

        <div className={cn("relative z-10")}> 
          <div className={cn("space-y-6", (centered || align === "center") && "text-center", align === "right" && "text-right")}> 
            {discount && (
              <div className="inline-block">
                <span className="text-4xl md:text-6xl font-bold opacity-90">
                  {discount}
                </span>
              </div>
            )}

            {subtitle && (
              <p className="text-lg md:text-xl font-medium opacity-90">
                {subtitle}
              </p>
            )}

            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              {title}
            </h2>

            {description && (
              <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto">
                {description}
              </p>
            )}

            {buttonText && buttonHref && (
              <div className="pt-4">
                <UIButton
                  size={size === "sm" ? "sm" : size === "md" ? "default" : "lg"}
                  variant="secondary"
                  asChild={!puck?.isEditing}
                  disabled={puck?.isEditing}
                  className="bg-white text-black hover:bg-gray-100"
                >
                  {puck?.isEditing ? (
                    buttonText
                  ) : (
                    <a href={buttonHref}>{buttonText}</a>
                  )}
                </UIButton>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  },
};
