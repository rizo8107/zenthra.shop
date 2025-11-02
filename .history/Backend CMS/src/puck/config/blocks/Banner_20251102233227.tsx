// src/puck/config/blocks/Banner.tsx
import { ComponentConfig } from "@measured/puck";
import { cn } from "@/lib/utils";

// Tailwind palettes (tweak to your brand)
const baseBox =
  "overflow-hidden px-4 sm:px-6 lg:px-8 py-4 rounded-2xl bg-white shadow-sm border border-border";
const iconWrap =
  "h-10 w-10 flex items-center justify-center rounded-full";
const xBtn =
  "ml-2 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/40";

type Variant = "info-cta" | "permission" | "text-link" | "subscribe";
type Align = "left" | "center" | "right";

export interface BannerProps {
  variant?: Variant;
  align?: Align;

  // Shared content
  iconEmoji?: string;          // quick icon (e.g. "🔔") — swap to your ImageSelector if you want
  title?: string;
  description?: string;

  // CTA variant
  ctaLabel?: string;
  ctaHref?: string;

  // Permission variant
  allowLabel?: string;
  declineLabel?: string;

  // Text-link variant
  linkLabel?: string;
  linkHref?: string;

  // Subscribe variant
  placeholder?: string;
  subscribeLabel?: string;

  // Decor / behavior
  tone?: "neutral" | "brand";
  rounded?: boolean;
  shadow?: boolean;
  dismissible?: boolean;

  // Optional editing guard (if you expose puck?.isEditing in your app)
  puck?: { isEditing?: boolean };
}

function AlignWrap({
  align,
  children,
}: { align?: Align; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-7xl mx-auto",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right"
      )}
    >
      {children}
    </div>
  );
}

export const Banner: ComponentConfig<BannerProps> = {
  label: "Banner",
  fields: {
    variant: {
      type: "select",
      label: "Variant",
      options: [
        { label: "Info + CTA", value: "info-cta" },
        { label: "Permission (Allow / Decline)", value: "permission" },
        { label: "Text with Link", value: "text-link" },
        { label: "Subscribe (email)", value: "subscribe" },
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

    // Shared
    iconEmoji: { type: "text", label: "Icon (emoji or short text)" },
    title: { type: "text", label: "Title" },
    description: { type: "textarea", label: "Description" },

    // CTA
    ctaLabel: { type: "text", label: "CTA Label" },
    ctaHref: { type: "text", label: "CTA Link" },

    // Permission
    allowLabel: { type: "text", label: "Allow Label" },
    declineLabel: { type: "text", label: "Decline Label" },

    // Text-link
    linkLabel: { type: "text", label: "Link Label" },
    linkHref: { type: "text", label: "Link URL" },

    // Subscribe
    placeholder: { type: "text", label: "Input Placeholder" },
    subscribeLabel: { type: "text", label: "Subscribe Button" },

    // Decor
    tone: {
      type: "select",
      label: "Tone",
      options: [
        { label: "Neutral", value: "neutral" },
        { label: "Brand (purple)", value: "brand" },
      ],
    },
    rounded: { type: "switch", label: "Rounded corners" },
    shadow: { type: "switch", label: "Shadow" },
    dismissible: { type: "switch", label: "Dismiss (X) button" },
  },

  defaultProps: {
    variant: "info-cta",
    align: "left",
    iconEmoji: "📣",
    title: "Lorem ipsum dolor sit amet consectetur adipiscing elit.",
    description: "Elitdipisicing elit.",
    ctaLabel: "Read update",
    ctaHref: "#",
    allowLabel: "Allow",
    declineLabel: "Decline",
    linkLabel: "Elitdipisicing elit!",
    linkHref: "#",
    placeholder: "Enter your email",
    subscribeLabel: "Subscribe",
    tone: "brand",
    rounded: true,
    shadow: true,
    dismissible: true,
  },

  render: (p) => {
    const isEditing = !!p.puck?.isEditing;

    const tone = p.tone === "brand"
      ? {
          icon: "bg-violet-100 text-violet-700",
          primaryBtn:
            "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50",
          ghostBtn:
            "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium bg-transparent hover:bg-muted",
          link: "text-violet-600 hover:underline",
          input:
            "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300",
        }
      : {
          icon: "bg-muted text-foreground",
          primaryBtn:
            "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50",
          ghostBtn:
            "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium bg-transparent hover:bg-muted",
          link: "underline",
          input:
            "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40",
        };

    const frame = cn(
      baseBox,
      p.rounded === false && "rounded-md",
      p.shadow === false && "shadow-none",
    );

    const Left = (
      <div className="flex items-start gap-3">
        <span className={cn(iconWrap, tone.icon)}>
          <span className="text-base leading-none">{p.iconEmoji}</span>
        </span>
        <div className="min-w-0">
          {p.title && (
            <p className="text-sm font-medium leading-6">{p.title}</p>
          )}
          {p.description && (
            <p className="text-xs text-muted-foreground leading-6">
              {p.description}
            </p>
          )}
        </div>
      </div>
    );

    const Dismiss = p.dismissible ? (
      <button
        type="button"
        className={xBtn}
        disabled={isEditing}
        aria-label="Dismiss"
      >
        ×
      </button>
    ) : null;

    return (
      <section className={cn("overflow-hidden px-4 sm:px-6 lg:px-8 py-4")}>
        <AlignWrap align={p.align}>
          {/* CONTENT */}
          <div className={frame}>
            {/* VARIANTS */}
            {p.variant === "info-cta" && (
              <div className="flex items-center justify-between gap-4">
                {Left}
                <div className="flex items-center gap-2">
                  {p.ctaLabel && (
                    <a
                      href={p.ctaHref || "#"}
                      aria-label={p.ctaLabel}
                      className={tone.primaryBtn}
                      onClick={(e) => isEditing && e.preventDefault()}
                    >
                      {p.ctaLabel}
                    </a>
                  )}
                  {Dismiss}
                </div>
              </div>
            )}

            {p.variant === "permission" && (
              <div className="flex items-center justify-between gap-4">
                {Left}
                <div className="flex items-center gap-2">
                  {p.declineLabel && (
                    <button
                      className={tone.ghostBtn}
                      disabled={isEditing}
                      type="button"
                    >
                      {p.declineLabel}
                    </button>
                  )}
                  {p.allowLabel && (
                    <button
                      className={tone.primaryBtn}
                      disabled={isEditing}
                      type="button"
                    >
                      {p.allowLabel}
                    </button>
                  )}
                  {Dismiss}
                </div>
              </div>
            )}

            {p.variant === "text-link" && (
              <div className="flex items-center justify-between gap-4">
                <div className="mx-auto">
                  <p className="text-sm">
                    {p.title}
                    {p.linkLabel && (
                      <>
                        {" "}
                        <a
                          href={p.linkHref || "#"}
                          className={tone.link}
                          onClick={(e) => isEditing && e.preventDefault()}
                        >
                          {p.linkLabel}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                {Dismiss}
              </div>
            )}

            {p.variant === "subscribe" && (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {Left}
                <div className="flex w-full max-w-md items-center gap-2">
                  <input
                    type="email"
                    placeholder={p.placeholder || "Enter your email"}
                    className={tone.input}
                    disabled={isEditing}
                  />
                  {p.subscribeLabel && (
                    <button
                      className={tone.primaryBtn}
                      disabled={isEditing}
                      type="button"
                    >
                      {p.subscribeLabel}
                    </button>
                  )}
                  {Dismiss}
                </div>
              </div>
            )}
          </div>
        </AlignWrap>
      </section>
    );
  },
};
