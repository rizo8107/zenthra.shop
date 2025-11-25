# 🗺️ Customer Journey Tracking - Frontend Integration Guide

## ✅ What's Already Done

1. ✅ **Journey Tracking Utility Created**
   - File: `Frontend/src/utils/journeyTracking.ts`
   - Functions for all journey events
   - Auto-tracking for cart abandonment
   - Session and user ID management

2. ✅ **Journey Trigger Node Added**
   - Available in automation builder
   - Listens to journey events
   - Triggers flows based on customer behavior

---

## 📝 Environment Variables to Add

### **Frontend `.env` File**

Add this to your **root `.env` file** (same location as `VITE_POCKETBASE_URL`):

```env
# Customer Journey API Endpoint
VITE_CUSTOMER_JOURNEY_API=/api/customer-journey
```

**Note:** The `/api/customer-journey` endpoint is already proxied through Vite to your API server on port 3001.

---

## 🔧 How to Integrate Journey Tracking

### **Step 1: Import the Tracking Functions**

In any component where you want to track events:

```typescript
import {
  trackJourneyPageView,
  trackJourneyProductView,
  trackJourneyAddToCart,
  trackJourneyCheckoutStart,
  trackJourneyPurchase,
  trackJourneyCartAbandon,
  trackJourneyMilestone,
  startCartAbandonTracking,
  cancelCartAbandonTracking,
} from '@/utils/journeyTracking';
```

---

### **Step 2: Add Tracking to Your Components**

#### **A) Track Page Views** (Auto-track in routes.tsx)

Add to `Frontend/src/routes.tsx` in the `useEffect`:

```typescript
// Around line 110, after trackPageView
useEffect(() => {
  // ... existing code ...
  
  // Track page view in Google Analytics
  trackPageView(pathname, document.title);
  
  // 🆕 ADD THIS: Track journey page view
  trackJourneyPageView(pathname);
  
}, [pathname]);
```

---

#### **B) Track Product Views**

In your **Product Detail Page** component:

```typescript
import { trackJourneyProductView } from '@/utils/journeyTracking';

function ProductDetailPage() {
  const { productId } = useParams();
  const { data: product } = useQuery(...);

  useEffect(() => {
    if (product) {
      // Track product view
      trackJourneyProductView(product.id, {
        name: product.name,
        price: product.price,
        category: product.category,
        brand: product.brand,
      });
    }
  }, [product]);

  return (
    // ... your component
  );
}
```

---

#### **C) Track Add to Cart**

In your **Add to Cart** button handler:

```typescript
import { trackJourneyAddToCart, startCartAbandonTracking } from '@/utils/journeyTracking';

function AddToCartButton({ product }) {
  const handleAddToCart = () => {
    // Add to cart logic
    addToCart(product);
    
    // Track add to cart event
    trackJourneyAddToCart(product.id, 1, {
      name: product.name,
      price: product.price,
      category: product.category,
    });
    
    // Start cart abandon tracking (5 minutes)
    startCartAbandonTracking({
      cart_total: getCartTotal(),
      items_count: getCartItemsCount(),
    });
  };

  return <button onClick={handleAddToCart}>Add to Cart</button>;
}
```

---

#### **D) Track Checkout Start**

In your **Checkout Page** component:

```typescript
import { trackJourneyCheckoutStart, cancelCartAbandonTracking } from '@/utils/journeyTracking';

function CheckoutPage() {
  const cart = useCart();

  useEffect(() => {
    // Cancel cart abandon tracking (user is checking out)
    cancelCartAbandonTracking();
    
    // Track checkout start
    trackJourneyCheckoutStart({
      cart_total: cart.total,
      items_count: cart.items.length,
      items: cart.items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
    });
  }, []);

  return (
    // ... your checkout component
  );
}
```

---

#### **E) Track Purchase**

In your **Order Confirmation** page:

```typescript
import { trackJourneyPurchase } from '@/utils/journeyTracking';

function OrderConfirmationPage() {
  const { orderId } = useParams();
  const { data: order } = useQuery(...);

  useEffect(() => {
    if (order) {
      trackJourneyPurchase(order.id, {
        total: order.total,
        items_count: order.items.length,
        payment_method: order.payment_method,
        shipping_method: order.shipping_method,
      });
    }
  }, [order]);

  return (
    // ... your confirmation page
  );
}
```

---

#### **F) Track Custom Milestones**

For any custom events:

```typescript
import { trackJourneyMilestone } from '@/utils/journeyTracking';

// Example: User viewed wishlist
trackJourneyMilestone('wishlist_viewed', {
  items_count: wishlist.length,
});

// Example: User applied coupon
trackJourneyMilestone('coupon_applied', {
  coupon_code: 'SAVE20',
  discount_amount: 100,
});

// Example: User shared product
trackJourneyMilestone('product_shared', {
  product_id: product.id,
  share_method: 'whatsapp',
});
```

---

## 📊 Example Integration in Existing Files

### **1. Update `routes.tsx`**

```typescript
// Around line 1, add import
import { trackJourneyPageView } from '@/utils/journeyTracking';

// Around line 110, in useEffect
useEffect(() => {
  window.scrollTo(0, 0);
  
  // Track page view in Google Analytics
  trackPageView(pathname, document.title);
  
  // 🆕 Track journey page view
  trackJourneyPageView(pathname);
  
}, [pathname]);
```

---

### **2. Find Your Product Page**

Look for files like:
- `pages/ProductDetail.tsx`
- `pages/Product.tsx`
- `components/ProductView.tsx`

Add:
```typescript
import { trackJourneyProductView } from '@/utils/journeyTracking';

useEffect(() => {
  if (product) {
    trackJourneyProductView(product.id, {
      name: product.name,
      price: product.price,
      category: product.category,
    });
  }
}, [product]);
```

---

### **3. Find Your Cart Functions**

Look for:
- `hooks/useCart.ts`
- `context/CartContext.tsx`
- `components/AddToCartButton.tsx`

Add to the `addToCart` function:
```typescript
import { trackJourneyAddToCart, startCartAbandonTracking } from '@/utils/journeyTracking';

function addToCart(product, quantity) {
  // ... existing cart logic ...
  
  // Track add to cart
  trackJourneyAddToCart(product.id, quantity, {
    name: product.name,
    price: product.price,
  });
  
  // Start abandon tracking
  startCartAbandonTracking({
    cart_total: calculateTotal(),
    items_count: cart.length + 1,
  });
}
```

---

## 🧪 Testing Journey Events

### **1. Open Browser Console**

The journey tracking logs all events:
```
[Journey] Event sent: page_view {session_id: "sess_...", ...}
[Journey] Event sent: product_view {product_id: "abc123", ...}
[Journey] Event sent: add_to_cart {product_id: "abc123", quantity: 1, ...}
```

### **2. Check Network Tab**

You should see POST requests to `/api/customer-journey` with payloads like:
```json
{
  "event_type": "product_view",
  "session_id": "sess_1732531083_abc123",
  "user_id": "user_xyz",
  "timestamp": "2025-11-25T09:28:03.000Z",
  "url": "http://localhost:8080/product/abc123",
  "data": {
    "product_id": "abc123",
    "name": "Premium Product",
    "price": 1999
  }
}
```

### **3. Test in Automation Builder**

1. Create a new flow
2. Add **Customer Journey** trigger node
3. Select event type (e.g., "Product View")
4. Add a **Send WhatsApp** or **Log** node
5. Save and activate
6. Visit a product page
7. Check the flow run history!

---

## 🔍 Quick Integration Checklist

- [ ] Add `VITE_CUSTOMER_JOURNEY_API=/api/customer-journey` to `.env`
- [ ] Import `trackJourneyPageView` in `routes.tsx`
- [ ] Add page view tracking to route change effect
- [ ] Find product detail page and add `trackJourneyProductView`
- [ ] Find add to cart function and add `trackJourneyAddToCart`
- [ ] Find checkout page and add `trackJourneyCheckoutStart`
- [ ] Find order confirmation and add `trackJourneyPurchase`
- [ ] Test in browser console
- [ ] Create test automation flow
- [ ] Verify events trigger flows

---

## 🎯 Priority Integration Order

**Start with these (easiest to implement):**

1. ✅ **Page Views** - Add to `routes.tsx` (1 line of code)
2. ✅ **Product Views** - Add to product detail page
3. ✅ **Add to Cart** - Add to cart button/function
4. ✅ **Checkout Start** - Add to checkout page
5. ✅ **Purchase** - Add to order confirmation

**Advanced (optional):**
- Cart abandonment (already auto-tracked!)
- Custom milestones
- Wishlist events
- Share events

---

## 📁 Files You Need to Modify

Based on typical e-commerce structure, look for:

1. **`Frontend/src/routes.tsx`** - Add page view tracking
2. **`Frontend/src/pages/ProductDetail.tsx`** (or similar) - Add product view tracking
3. **`Frontend/src/hooks/useCart.ts`** (or `CartContext.tsx`) - Add cart tracking
4. **`Frontend/src/pages/Checkout.tsx`** - Add checkout tracking
5. **`Frontend/src/pages/OrderConfirmation.tsx`** - Add purchase tracking

---

## 🚀 Next Steps

1. **Add the env variable** to `.env`
2. **Start with page views** in `routes.tsx`
3. **Find your product page** and add product view tracking
4. **Test in browser console** to see events being sent
5. **Create a test automation flow** to verify it works
6. **Gradually add more tracking** as needed

---

## ❓ Need Help Finding Files?

Run these commands to locate your files:

```bash
# Find product pages
grep -r "ProductDetail\|Product.*Page" Frontend/src/pages

# Find cart hooks/context
grep -r "useCart\|CartContext" Frontend/src

# Find checkout pages
grep -r "Checkout.*Page\|CheckoutForm" Frontend/src/pages
```

---

## ✅ Summary

**What you need to do:**

1. Add `VITE_CUSTOMER_JOURNEY_API=/api/customer-journey` to `.env`
2. Import tracking functions in your components
3. Call tracking functions at the right moments
4. Test and verify events are being sent
5. Create automation flows that respond to these events

The journey tracking is now ready - just integrate it into your frontend components! 🎉
