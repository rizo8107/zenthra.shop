import { ComponentConfig } from "@measured/puck";
import { cn } from "@/lib/utils";
import { ImageSelector } from "@/puck/fields/ImageSelector";

export interface HeroCardProps {
  brandName?: string;
  title: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  buttonTarget?: "_self" | "_blank";
  productImage?: string;
  gradientFrom?: string;
  gradientTo?: string;
  textColor?: "white" | "black";
  cardRadius?: "none" | "md" | "lg" | "xl" | "2xl" | "3xl";
  showSecondCard?: boolean;
  // Second card props
  secondBrandName?: string;
  secondTitle?: string;
  secondDescription?: string;
  secondButtonText?: string;
  secondButtonHref?: string;
  secondProductImage?: string;
  secondGradientFrom?: string;
  secondGradientTo?: string;
}

export const HeroCard: ComponentConfig<HeroCardProps> = {
  label: "Hero Card",
  fields: {
    brandName: {
      type: "text",
      label: "Brand Name",
    },
    title: {
      type: "text",
      label: "Product Title",
    },
    description: {
      type: "textarea",
      label: "Description",
    },
    buttonText: {
      type: "text",
      label: "Button Text",
    },
    buttonHref: {
      type: "text",
      label: "Button Link",
    },
    buttonTarget: {
      type: "select",
      label: "Button Target",
      options: [
        { label: "Same Tab", value: "_self" },
        { label: "New Tab", value: "_blank" },
      ],
    },
    productImage: {
      ...ImageSelector,
      label: "Product Image",
    },
    gradientFrom: {
      type: "text",
      label: "Gradient Start Color (hex)",
    },
    gradientTo: {
      type: "text",
      label: "Gradient End Color (hex)",
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
    showSecondCard: {
      type: "radio",
      label: "Show Second Card",
      options: [
        { label: "No", value: false },
        { label: "Yes", value: true },
      ],
    },
    secondBrandName: {
      type: "text",
      label: "Second Card: Brand Name",
    },
    secondTitle: {
      type: "text",
      label: "Second Card: Title",
    },
    secondDescription: {
      type: "textarea",
      label: "Second Card: Description",
    },
    secondButtonText: {
      type: "text",
      label: "Second Card: Button Text",
    },
    secondButtonHref: {
      type: "text",
      label: "Second Card: Button Link",
    },
    secondProductImage: {
      ...ImageSelector,
      label: "Second Card: Product Image",
    },
    secondGradientFrom: {
      type: "text",
      label: "Second Card: Gradient Start",
    },
    secondGradientTo: {
      type: "text",
      label: "Second Card: Gradient End",
    },
  },
  defaultProps: {
    brandName: "Brand",
    title: "Product Name Here",
    description: "Discover our amazing product with incredible benefits for you.",
    buttonText: "20% OFF | BUY NOW",
    buttonHref: "/shop",
    buttonTarget: "_self",
    gradientFrom: "#4ade80",
    gradientTo: "#16a34a",
    textColor: "white",
    cardRadius: "2xl",
    showSecondCard: true,
    secondBrandName: "Brand",
    secondTitle: "Another Product",
    secondGradientFrom: "#e5e7eb",
    secondGradientTo: "#d1d5db",
  },
  render: ({
    brandName,
    title,
    description,
    buttonText,
    buttonHref,
    buttonTarget,
    productImage,
    gradientFrom,
    gradientTo,
    textColor,
    cardRadius,
    showSecondCard,
    secondBrandName,
    secondTitle,
    secondDescription,
    secondButtonText,
    secondButtonHref,
    secondProductImage,
    secondGradientFrom,
    secondGradientTo,
    puck,
  }) => {
    const radiusClasses = {
      none: "rounded-none",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
      "3xl": "rounded-3xl",
    };

    const textColorClass = textColor === "black" ? "text-gray-900" : "text-white";

    const CardComponent = ({
      brand,
      cardTitle,
      cardDescription,
      btnText,
      btnHref,
      image,
      fromColor,
      toColor,
      isPartial = false,
    }: {
      brand?: string;
      cardTitle: string;
      cardDescription?: string;
      btnText?: string;
      btnHref?: string;
      image?: string;
      fromColor?: string;
      toColor?: string;
      isPartial?: boolean;
    }) => (
      <div
        className={cn(
          "relative overflow-hidden flex-1 min-h-[200px] md:min-h-[280px]",
          radiusClasses[cardRadius || "2xl"],
          isPartial ? "w-[30%] hidden md:block" : "w-full md:w-[65%]"
        )}
        style={{
          background: image 
            ? `linear-gradient(135deg, ${fromColor || "#4ade80"}cc 0%, ${toColor || "#16a34a"}cc 100%), url(${image})`
            : `linear-gradient(135deg, ${fromColor || "#4ade80"} 0%, ${toColor || "#16a34a"} 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Content */}
        <div className={cn("relative z-10 p-5 md:p-6 h-full flex flex-col")}>
          {/* Brand */}
          {brand && (
            <span className={cn("text-xs md:text-sm font-medium opacity-90 mb-1", textColorClass)}>
              {brand}
            </span>
          )}
          
          {/* Title */}
          <h2 className={cn(
            "font-bold leading-tight mb-2",
            textColorClass,
            isPartial ? "text-lg md:text-xl" : "text-xl md:text-2xl lg:text-3xl"
          )}>
            {cardTitle}
          </h2>
          
          {/* Description */}
          {cardDescription && !isPartial && (
            <p className={cn(
              "text-xs md:text-sm opacity-80 mb-4 line-clamp-3",
              textColorClass
            )}>
              {cardDescription}
            </p>
          )}
          
          {/* Button */}
          {btnText && !isPartial && (
            <div className="mt-auto">
              {puck?.isEditing ? (
                <button
                  className={cn(
                    "inline-flex items-center px-4 py-2 text-xs md:text-sm font-semibold rounded-full transition-all",
                    textColor === "black" 
                      ? "bg-gray-900 text-white hover:bg-gray-800" 
                      : "bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30"
                  )}
                >
                  {btnText}
                </button>
              ) : (
                <a
                  href={btnHref || "#"}
                  target={buttonTarget || "_self"}
                  rel={buttonTarget === "_blank" ? "noopener noreferrer" : undefined}
                  className={cn(
                    "inline-flex items-center px-4 py-2 text-xs md:text-sm font-semibold rounded-full transition-all",
                    textColor === "black" 
                      ? "bg-gray-900 text-white hover:bg-gray-800" 
                      : "bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30"
                  )}
                >
                  {btnText}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );

    return (
      <section className="w-full px-4 py-4">
        <div className="flex gap-3 md:gap-4">
          {/* Main Card */}
          <CardComponent
            brand={brandName}
            cardTitle={title}
            cardDescription={description}
            btnText={buttonText}
            btnHref={buttonHref}
            image={productImage}
            fromColor={gradientFrom}
            toColor={gradientTo}
          />
          
          {/* Second Card (partial view) */}
          {showSecondCard && (
            <CardComponent
              brand={secondBrandName}
              cardTitle={secondTitle || "Product"}
              cardDescription={secondDescription}
              btnText={secondButtonText}
              btnHref={secondButtonHref}
              image={secondProductImage}
              fromColor={secondGradientFrom || "#e5e7eb"}
              toColor={secondGradientTo || "#d1d5db"}
              isPartial
            />
          )}
        </div>
      </section>
    );
  },
};
