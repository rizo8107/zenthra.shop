import { ComponentConfig } from "@measured/puck";
import { cn } from "@/lib/utils";
import { ImageSelector } from "@/puck/fields/ImageSelector";

export interface TestimonialSectionProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  testimonials: {
    name: string;
    role?: string;
    company?: string;
    content: string;
    avatar?: string;
    rating?: number;
  }[];
  columns?: 1 | 2 | 3;
  showRating?: boolean;
}

export const TestimonialSection: ComponentConfig<TestimonialSectionProps> = {
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
        { label: "1 Column", value: 1 },
        { label: "2 Columns", value: 2 },
        { label: "3 Columns", value: 3 },
      ],
    },
    showRating: {
      type: "radio",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
    testimonials: {
      type: "array",
      arrayFields: {
        name: { type: "text" },
        role: { type: "text" },
        company: { type: "text" },
        content: { type: "textarea" },
        avatar: ImageSelector,
        rating: { type: "number", min: 1, max: 5 },
      },
      defaultItemProps: {
        name: "Customer Name",
        role: "Customer",
        company: "",
        content: "This is an amazing product! I highly recommend it.",
        avatar: "https://via.placeholder.com/64x64",
        rating: 5,
      },
      getItemSummary: (item) => item.name || "Testimonial",
    },
  },
  defaultProps: {
    title: "What Our Customers Say",
    subtitle: "Don't just take our word for it - hear from our satisfied customers",
    columns: 3,
    showRating: true,
    testimonials: [
      {
        name: "Sarah Johnson",
        role: "Marketing Manager",
        company: "Tech Corp",
        content: "Excellent service and quality products. Will definitely order again!",
        avatar: "https://via.placeholder.com/64x64",
        rating: 5,
      },
      {
        name: "Mike Chen",
        role: "Designer",
        company: "Creative Studio",
        content: "Fast delivery and great customer support. Highly recommended!",
        avatar: "https://via.placeholder.com/64x64",
        rating: 5,
      },
      {
        name: "Emily Davis",
        role: "Entrepreneur",
        company: "",
        content: "Amazing products at great prices. The quality exceeded my expectations.",
        avatar: "https://via.placeholder.com/64x64",
        rating: 5,
      },
    ],
  },
  render: ({ title, subtitle, backgroundColor, paddingTop, paddingRight, paddingBottom, paddingLeft, testimonials, columns, showRating }) => {
    const columnClasses = {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    };

    const renderStars = (rating: number) => {
      return Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "text-lg",
            index < rating ? "text-yellow-400" : "text-muted-foreground/30"
          )}
        >
          ★
        </span>
      ));
    };

    return (
      <section
        className="py-12 md:py-14"
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
            {(testimonials || []).map((testimonial, index) => (
              <div
                key={index}
                className="bg-card rounded-lg p-6 shadow-sm border border-border"
              >
                {showRating && testimonial.rating && (
                  <div className="flex mb-4">
                    {renderStars(testimonial.rating)}
                  </div>
                )}
                
                <blockquote className="text-foreground mb-6">
                  "{testimonial.content}"
                </blockquote>
                
                <div className="flex items-center">
                  {testimonial.avatar && (
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full mr-4 object-cover"
                    />
                  )}
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    {(testimonial.role || testimonial.company) && (
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}
                        {testimonial.role && testimonial.company && " at "}
                        {testimonial.company}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  },
};
