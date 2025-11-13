# Performance Improvements - Karigai Store

## Summary
This document outlines the performance optimizations implemented to improve Core Web Vitals based on PageSpeed Insights analysis.

## Issues Identified from PageSpeed Insights

### Critical Issues
1. **LCP (Largest Contentful Paint): 14.3s** - Target: < 2.5s
2. **CLS (Cumulative Layout Shift): 0.193** - Target: < 0.1
3. **INP (Interaction to Next Paint): 418ms** - Target: < 200ms
4. **Network Waterfall**: 90+ sequential review API requests causing 7+ second delays

### Image Optimization Issues
- Images not using modern formats (WebP/AVIF)
- Oversized images (serving 1438x1920 for 370x350 display)
- Missing explicit width/height causing layout shifts
- No fetchpriority=high on LCP images

## Implemented Solutions

### 1. Preconnect Hints (✅ Completed)
**File**: `Frontend/index.html`

Added preconnect hints for critical origins:
```html
<link rel="preconnect" href="https://backend.karigaistore.in" crossorigin />
<link rel="preconnect" href="https://rsms.me" crossorigin />
<link rel="preconnect" href="https://us-assets.i.posthog.com" crossorigin />
```

**Impact**: Reduces connection establishment time by ~300-860ms per origin.

### 2. Image Dimension Attributes (✅ Completed)
**Files**: 
- `Frontend/src/components/Logo.tsx`
- `Frontend/src/components/ProductCard.tsx`

Added explicit `width` and `height` attributes to all images:
```tsx
// Logo component
<img width={144} height={56} ... />

// Product cards
<ProductImage width={400} height={533} ... />
```

**Impact**: Prevents CLS by reserving space before images load. Target CLS reduction: 0.193 → < 0.1

### 3. FetchPriority for LCP Images (✅ Completed)
**File**: `Frontend/src/components/ProductImage.tsx`

Added `fetchPriority="high"` to priority images:
```tsx
<img
  loading={priority ? "eager" : "lazy"}
  fetchPriority={priority ? "high" : "auto"}
  ...
/>
```

**Impact**: Browser prioritizes loading of above-the-fold images. Expected LCP improvement: 14.3s → 4-6s.

### 4. Image Format Optimization (🔧 In Progress)
**Current State**: Using WebP format with quality 80-85%
**File**: `Frontend/src/utils/imageOptimizer.ts`

The `getPocketBaseImageUrl` function already defaults to AVIF format:
```typescript
format: ImageFormat = "avif"
```

However, ProductImage component uses WebP. Need to verify PocketBase supports AVIF.

**Impact**: AVIF provides ~30% better compression than WebP. Expected savings: 6,136 KiB → ~4,000 KiB

### 5. Review API Optimization (✅ Completed - CRITICAL FIX)
**File**: `Frontend/src/lib/pocketbase.ts` (lines 373-379)

**Issue**: 90+ sequential review requests causing 7+ second network waterfall blocking LCP

**Solution Implemented**:
Removed individual review count API calls in `getProducts()` function:
```typescript
// BEFORE: Made 90+ sequential requests
const reviewCounts = await Promise.all(
  records.items.map(record => 
    pocketbase.collection('reviews').getList(1, 1, {
      filter: `product = "${record.id}"`,
    })
  )
);

// AFTER: Default to 0, load on-demand
processedProducts = processedProducts.map(product => ({
  ...product,
  reviews: 0 // Actual count loaded on product detail page only
}));
```

**Expected Impact**: 
- **LCP improvement**: 10.5s → 3-4s (removes 7s waterfall)
- **Network requests**: 90+ → 0 on initial page load
- **Resource load delay**: 7,300ms → ~500ms

### 6. Font Loading Optimization (✅ Completed)
**File**: `Frontend/index.html`

Added non-blocking font loading with `font-display: swap`:
```html
<link rel="stylesheet" href="https://rsms.me/inter/inter.css" 
      media="print" onload="this.media='all'" />
<style>
  body { font-display: swap; }
</style>
```

**Impact**: 
- Prevents render-blocking CSS (saves ~770ms)
- Text visible immediately with system fonts
- Inter font loads asynchronously

## Remaining Issues to Address

### High Priority
1. **Logo Images** - Serving 1280x499 images for 144x56 display (93.8 KiB wasted per logo)
2. **Product Images** - Serving 2-4x larger than needed (3,689 KiB potential savings)
3. **Thumb Parameter** - Ensure PocketBase properly resizes images

### Medium Priority
4. **Unused JavaScript** - 244 KiB of unused code detected
5. **Unused CSS** - 28 KiB of unused styles
6. **Third-party Scripts** - Facebook Pixel and PostHog add 492 KiB

### Low Priority
7. **Legacy JavaScript** - 65 KiB of polyfills for modern browsers
8. **Cache Lifetimes** - Some resources have short cache durations

## Expected Results After All Fixes

### Core Web Vitals Targets
- **LCP**: 14.3s → < 2.5s (Good)
- **CLS**: 0.193 → < 0.1 (Good)
- **INP**: 418ms → < 200ms (Good)

### Performance Score
- **Current**: 34/100
- **Expected**: 80+/100

### Key Metrics
- **FCP**: 4.1s → < 1.8s
- **TBT**: 580ms → < 200ms
- **Speed Index**: 11.2s → < 3.4s

## Next Steps

1. **Immediate**: 
   - Fix review API waterfall issue
   - Implement image lazy loading for below-the-fold content
   - Optimize font loading with font-display: swap

2. **Short-term**:
   - Remove unused JavaScript/CSS
   - Defer third-party scripts
   - Implement service worker for caching

3. **Long-term**:
   - Consider CDN for static assets
   - Implement progressive image loading
   - Add resource hints for critical fonts

## Testing Recommendations

After implementing changes, test with:
1. PageSpeed Insights (https://pagespeed.web.dev/)
2. Chrome DevTools Lighthouse
3. WebPageTest (https://www.webpagetest.org/)

Monitor in production using:
- Chrome UX Report (CrUX)
- PostHog web vitals
- Real User Monitoring (RUM)
