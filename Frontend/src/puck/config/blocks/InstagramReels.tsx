import { ComponentConfig } from "@measured/puck";
import { useState, type TouchEvent } from "react";
import { cn } from "@/lib/utils";

export interface InstagramReelsProps {
  title?: string;
  subtitle?: string;
  accountHandle?: string; // for display only
  reels?: { url?: string; label?: string }[];
}

const normalizeEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const trimmed = url.split("?")[0].replace(/\/$/, "");
    if (trimmed.includes("/reel/")) {
      return `${trimmed}/embed`;
    }
    if (trimmed.includes("/p/")) {
      return `${trimmed}/embed`;
    }
    return null;
  } catch {
    return null;
  }
};

export const InstagramReels: ComponentConfig<InstagramReelsProps> = {
  label: "Instagram Reels Carousel",
  fields: {
    title: { type: "text", label: "Section title" },
    subtitle: { type: "textarea", label: "Subtitle (optional)" },
    accountHandle: { type: "text", label: "Instagram account handle (for label only)" },
    reels: {
      type: "array",
      label: "Reels",
      arrayFields: {
        url: { type: "text", label: "Reel URL" },
        label: { type: "text", label: "Label (optional)" },
      },
      defaultItemProps: {
        url: "https://www.instagram.com/reel/XXXXXXXXXXX/",
        label: "Sample reel",
      },
      getItemSummary: (item) => item.label || item.url || "Reel",
    },
  },
  defaultProps: {
    title: "Latest Reels",
    subtitle: "Showcase your recent Instagram content.",
    reels: [],
  },
  render: ({ title, subtitle, accountHandle, reels = [] }) => {
    const validReels = (reels || []).map((r) => ({
      ...r,
      embedUrl: normalizeEmbedUrl(r.url || ""),
    })).filter((r) => r.embedUrl);

    const [index, setIndex] = useState(0);
    const total = validReels.length;

    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const go = (dir: -1 | 1) => {
      if (!total) return;
      setIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return total - 1;
        if (next >= total) return 0;
        return next;
      });
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
      setTouchEnd(null);
      setTouchStart(e.touches[0]?.clientX ?? null);
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
      setTouchEnd(e.touches[0]?.clientX ?? null);
    };

    const handleTouchEnd = () => {
      if (touchStart == null || touchEnd == null) return;
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 30;
      const isRightSwipe = distance < -30;

      if (isLeftSwipe) go(1);
      if (isRightSwipe) go(-1);

      setTouchStart(null);
      setTouchEnd(null);
    };

    if (!total) {
      return (
        <section className="py-8 md:py-10">
          <div className="konipai-container">
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-6 md:p-8 text-center text-sm text-muted-foreground">
              Add at least one Instagram reel URL in the block settings to preview the carousel.
            </div>
          </div>
        </section>
      );
    }

    const current = validReels[index];

    return (
      <section className="py-8 md:py-10">
        <div className="konipai-container">
          {(title || subtitle || accountHandle) && (
            <header className="mb-4 md:mb-6 flex flex-col gap-1">
              {title && (
                <h2 className="text-lg md:text-xl font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {(subtitle || accountHandle) && (
                <p className="text-xs md:text-sm text-muted-foreground">
                  {subtitle}
                  {accountHandle && (
                    <span className={cn(subtitle ? "ml-2" : "")}>@{accountHandle}</span>
                  )}
                </p>
              )}
            </header>
          )}

          <div className="relative flex flex-col items-center gap-3">
            <div
              className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg rounded-3xl bg-black overflow-hidden shadow-lg"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative pt-[177.78%]">{/* 9:16 aspect ratio */}
                <iframe
                  src={current.embedUrl!}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  title={current.label || "Instagram reel"}
                />
              </div>
            </div>

            {total > 1 && (
              <div className="flex items-center justify-between w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg gap-2 text-[11px] sm:text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="h-3 w-3 rounded-full border border-border flex items-center justify-center bg-background hover:bg-muted"
                    aria-label="Previous reel"
                  >
                    
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="h-7 w-7 rounded-full border border-border flex items-center justify-center bg-background hover:bg-muted"
                    aria-label="Next reel"
                  >
                    
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[11px] text-muted-foreground">
                    {index + 1}/{total}
                  </span>
                  <span className="sm:hidden text-[10px] text-muted-foreground">
                    {index + 1} of {total}
                  </span>
                  <div className="flex items-center gap-1">
                  {validReels.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Go to reel ${i + 1}`}
                      className={cn(
                        "h-3 w-3 min-h-0 min-w-0 p-0 rounded-full transition-colors inline-flex items-center justify-center",
                        i === index ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/60",
                      )}
                    />
                  ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  },
};
