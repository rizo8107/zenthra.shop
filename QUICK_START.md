# 🚀 Quick Start: Using Webhook Server

Your webhook server is running! Here's how to use it immediately.

## ✅ Step 1: Add to .env (Already done ✓)

```env
VITE_WEBHOOK_SERVER_URL=http://localhost:3001
```

## 🔥 Step 2: Use in Your Code

### Frontend: Update Checkout Page

Replace your existing Razorpay code with this:

```typescript
import { createRazorpayOrder, verifyRazorpayPayment } from '@/lib/webhook-server';

// When user clicks "Pay Now"
async function handlePayment() {
  // 1. Create order
  const order = await createRazorpayOrder({
    amount: 100, // ₹100 in rupees
    currency: 'INR'
  });

  // 2. Open Razorpay
  const rzp = new Razorpay({
    key: order.key_id,
    amount: order.amount,
    order_id: order.id,
    handler: async (response) => {
      // 3. Verify payment
      const result = await verifyRazorpayPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
      
      if (result.verified) {
        alert('Payment successful!');
        // Redirect to success page
      }
    }
  });
  rzp.open();
}
```

### Backend: Process Refunds

```typescript
import { refundPayment } from '@/lib/webhook-server';

// Refund a payment
const refund = await refundPayment(paymentId, 50); // Refund ₹50
```

## 📡 Available Functions

### Frontend/Backend (Both)

```typescript
import {
  createRazorpayOrder,      // Create payment order
  verifyRazorpayPayment,    // Verify payment signature
  capturePayment,           // Capture authorized payment
  refundPayment,            // Refund a payment
  getPaymentDetails,        // Get payment info
  emitWebhookEvent,         // Emit custom events
  triggerAutomation,        // Trigger automation flows
  checkWebhookServerHealth  // Check server status
} from '@/lib/webhook-server';
```

## 🎯 Real Examples

### Example 1: Simple Payment

```typescript
// Frontend/src/pages/Checkout.tsx
import { createRazorpayOrder, verifyRazorpayPayment } from '@/lib/webhook-server';

const handleCheckout = async () => {
  try {
    // Create order
    const order = await createRazorpayOrder({
      amount: cartTotal,
      currency: 'INR',
      receipt: `order_${orderId}`
    });

    // Open Razorpay
    const options = {
      key: order.key_id,
      amount: order.amount,
      order_id: order.id,
      handler: async (response) => {
        // Verify
        const verified = await verifyRazorpayPayment(response);
        if (verified.verified) {
          navigate('/success');
        }
      }
    };

    new Razorpay(options).open();
  } catch (error) {
    console.error('Payment failed:', error);
  }
};
```

### Example 2: Refund Order

```typescript
// Backend/src/pages/admin/Orders.tsx
import { refundPayment } from '@/lib/webhook-server';

const handleRefund = async (paymentId, amount) => {
  try {
    const result = await refundPayment(paymentId, amount, {
      reason: 'Customer request'
    });
    
    alert('Refund processed: ' + result.refund.id);
  } catch (error) {
    alert('Refund failed: ' + error.message);
  }
};
```

### Example 3: Emit Webhook Event

```typescript
import { emitWebhookEvent } from '@/lib/webhook-server';

// After order is placed
await emitWebhookEvent({
  type: 'order.placed',
  data: {
    order_id: orderId,
    amount: totalAmount,
    customer_email: email
  }
});

// After order is shipped
await emitWebhookEvent({
  type: 'order.shipped',
  data: {
    order_id: orderId,
    tracking_number: trackingNum
  }
});
```

### Example 4: Trigger Automation

```typescript
import { triggerAutomation } from '@/lib/webhook-server';

// Trigger order confirmation flow
await triggerAutomation('order_confirmation', {
  order_id: orderId,
  customer_email: email
});
```

## 🔍 Testing

### Test Health Check

```typescript
import { checkWebhookServerHealth } from '@/lib/webhook-server';

const health = await checkWebhookServerHealth();
console.log(health); // { status: 'ok', uptime: 123, ... }
```

### Test Payment Flow

1. Use Razorpay test credentials:
   - Card: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date

2. Check webhook server console for logs

## 📊 Monitor Server

```bash
# Check if server is running
curl http://localhost:3001/health

# View logs (if using npm run dev)
# Logs appear in the terminal where you ran npm run dev
```

## 🚢 Production Checklist

Before deploying to production:

1. **Deploy Webhook Server**
   ```bash
   cd WebhookServer
   # Follow DEPLOYMENT_GUIDE.md
   ```

2. **Update .env**
   ```env
   VITE_WEBHOOK_SERVER_URL=https://webhooks.viruthigold.in
   ```

3. **Set Up Razorpay Webhook**
   - Dashboard → Webhooks
   - URL: `https://webhooks.viruthigold.in/api/razorpay/webhook`
   - Events: `payment.captured`, `payment.failed`

4. **Redeploy Apps**
   ```bash
   docker compose up --build -d
   ```

## 📝 Files Created

- ✅ `Frontend/src/lib/webhook-server.ts` - Frontend service
- ✅ `Backend/src/lib/webhook-server.ts` - Backend service
- ✅ `INTEGRATION_GUIDE.md` - Detailed integration guide
- ✅ `.env.example` updated with `VITE_WEBHOOK_SERVER_URL`

## 🔗 Documentation

- **Complete Guide**: `INTEGRATION_GUIDE.md`
- **API Reference**: `WebhookServer/README.md`
- **Deployment**: `WebhookServer/DEPLOYMENT_GUIDE.md`

## 💡 Tips

1. Always verify payments before confirming orders
2. Emit webhook events for important actions (order placed, shipped, etc.)
3. Use automation triggers for email notifications
4. Monitor webhook server health in production
5. Set up proper CORS in production (`CORS_ORIGIN=https://yourdomain.com`)

---

**Server Running**: http://localhost:3001  
**Health Check**: http://localhost:3001/health  
**Status**: ✅ Ready to use!

Need help? Check `INTEGRATION_GUIDE.md` for detailed examples.
