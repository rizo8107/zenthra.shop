# Integration Guide: Using the Webhook Server

This guide shows you how to integrate the standalone webhook/payment server with your Frontend and Backend applications.

## 📋 Prerequisites

1. ✅ Webhook server is running (see `WebhookServer/README.md`)
2. ✅ Environment variable `VITE_WEBHOOK_SERVER_URL` is configured in your root `.env` file

## 🎯 Step 1: Update Your .env File

Add to your root `.env` file:

```env
# Local development
VITE_WEBHOOK_SERVER_URL=http://localhost:3001

# Production (after deploying webhook server)
# VITE_WEBHOOK_SERVER_URL=https://webhooks.viruthigold.in
```

## 📝 Step 2: Frontend Integration

### Update Checkout Page

**Before (Direct Razorpay API):**

```typescript
// ❌ OLD WAY - Direct API call
const response = await fetch('https://api.razorpay.com/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount, currency })
});
```

**After (Using Webhook Server):**

```typescript
// ✅ NEW WAY - Via webhook server
import { createRazorpayOrder, verifyRazorpayPayment } from '@/lib/webhook-server';

// Create order
const order = await createRazorpayOrder({
  amount: totalAmount, // in rupees (e.g., 100 for ₹100)
  currency: 'INR',
  receipt: `order_${Date.now()}`,
  notes: {
    order_id: orderId,
    customer_email: customerEmail
  }
});

// Use order.id with Razorpay checkout
const options = {
  key: order.key_id, // Razorpay key from server
  amount: order.amount,
  currency: order.currency,
  order_id: order.id,
  name: 'Viruthi Gold',
  handler: async function(response) {
    // Verify payment after success
    const verification = await verifyRazorpayPayment({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    });
    
    if (verification.verified) {
      console.log('Payment verified successfully!');
      // Proceed with order confirmation
    }
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

### Complete Checkout Example

Update your `Frontend/src/pages/Checkout.tsx` or wherever you handle payments:

```typescript
import { createRazorpayOrder, verifyRazorpayPayment, emitWebhookEvent } from '@/lib/webhook-server';
import { toast } from '@/components/ui/use-toast';

async function handlePayment() {
  try {
    setProcessing(true);

    // Step 1: Create order via webhook server
    const order = await createRazorpayOrder({
      amount: cartTotal, // Amount in rupees
      currency: 'INR',
      receipt: `receipt_${orderId}`,
      notes: {
        order_id: orderId,
        customer_name: customerDetails.name,
        customer_email: customerDetails.email
      }
    });

    // Step 2: Open Razorpay checkout
    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: 'Viruthi Gold',
      description: 'Order Payment',
      image: '/logo.png',
      prefill: {
        name: customerDetails.name,
        email: customerDetails.email,
        contact: customerDetails.phone
      },
      theme: {
        color: '#F59E0B'
      },
      handler: async function(response: any) {
        try {
          // Step 3: Verify payment
          const verification = await verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          if (verification.verified) {
            // Step 4: Emit webhook event for order.paid
            await emitWebhookEvent({
              type: 'order.paid',
              data: {
                order_id: orderId,
                payment_id: response.razorpay_payment_id,
                amount: cartTotal,
                customer_email: customerDetails.email
              },
              source: 'checkout'
            });

            // Step 5: Update order status in your database
            await updateOrderStatus(orderId, 'paid');

            toast({
              title: 'Payment Successful!',
              description: 'Your order has been confirmed.',
            });

            // Redirect to success page
            navigate(`/order-success/${orderId}`);
          } else {
            throw new Error('Payment verification failed');
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          toast({
            variant: 'destructive',
            title: 'Payment Verification Failed',
            description: 'Please contact support.',
          });
        }
      },
      modal: {
        ondismiss: function() {
          setProcessing(false);
          toast({
            title: 'Payment Cancelled',
            description: 'You cancelled the payment process.',
          });
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Payment initiation error:', error);
    toast({
      variant: 'destructive',
      title: 'Payment Failed',
      description: 'Could not initiate payment. Please try again.',
    });
    setProcessing(false);
  }
}
```

## 🔧 Step 3: Backend Integration

### Example: Order Management

Update your backend order management to use the webhook server:

```typescript
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment,
  capturePayment,
  refundPayment,
  emitWebhookEvent
} from '@/lib/webhook-server';

// Create order endpoint
export async function createOrder(orderData: any) {
  // Create Razorpay order via webhook server
  const razorpayOrder = await createRazorpayOrder({
    amount: orderData.total,
    currency: 'INR',
    receipt: `order_${orderData.id}`,
    notes: {
      order_id: orderData.id,
      customer_id: orderData.customer_id
    }
  });

  // Store order in PocketBase
  const order = await pb.collection('orders').create({
    ...orderData,
    razorpay_order_id: razorpayOrder.id,
    status: 'pending'
  });

  return { order, razorpay_order: razorpayOrder };
}

// Verify and confirm order
export async function confirmOrder(orderId: string, paymentData: any) {
  // Verify payment
  const verification = await verifyRazorpayPayment(paymentData);

  if (verification.verified) {
    // Update order status
    await pb.collection('orders').update(orderId, {
      status: 'paid',
      razorpay_payment_id: paymentData.razorpay_payment_id,
      payment_verified_at: new Date().toISOString()
    });

    // Emit webhook event
    await emitWebhookEvent({
      type: 'order.confirmed',
      data: {
        order_id: orderId,
        payment_id: paymentData.razorpay_payment_id
      },
      source: 'backend'
    });

    return { success: true };
  }

  throw new Error('Payment verification failed');
}

// Refund order
export async function refundOrder(orderId: string, amount?: number) {
  const order = await pb.collection('orders').getOne(orderId);

  // Process refund via webhook server
  const refund = await refundPayment(
    order.razorpay_payment_id,
    amount,
    { order_id: orderId, reason: 'Customer request' }
  );

  // Update order status
  await pb.collection('orders').update(orderId, {
    status: 'refunded',
    refund_id: refund.refund.id,
    refunded_at: new Date().toISOString()
  });

  // Emit webhook event
  await emitWebhookEvent({
    type: 'order.refunded',
    data: {
      order_id: orderId,
      refund_id: refund.refund.id,
      amount: amount || order.total
    },
    source: 'backend'
  });

  return refund;
}
```

### Example: Automation Integration

Trigger automation flows after specific events:

```typescript
import { triggerAutomation } from '@/lib/webhook-server';

// After order is paid
async function afterOrderPaid(orderId: string) {
  // Trigger order confirmation automation
  await triggerAutomation('order_confirmation', {
    order_id: orderId,
    trigger_time: new Date().toISOString()
  });
}

// After order is shipped
async function afterOrderShipped(orderId: string, trackingNumber: string) {
  // Trigger shipping notification automation
  await triggerAutomation('shipping_notification', {
    order_id: orderId,
    tracking_number: trackingNumber
  });
}
```

## 🔐 Step 4: Webhook Subscription Management

For admin features (managing webhook subscriptions):

```typescript
import { manageWebhookSubscription } from '@/lib/webhook-server';

// List all webhook subscriptions
const subscriptions = await manageWebhookSubscription('list');

// Create a new webhook subscription
await manageWebhookSubscription('create', {
  url: 'https://your-app.com/webhooks/razorpay',
  events: ['payment.captured', 'order.paid'],
  secret: 'your_webhook_secret',
  active: true,
  retries: 3,
  timeout_ms: 8000,
  description: 'Production payment webhook'
});

// Update a webhook subscription
await manageWebhookSubscription('update', {
  active: false
}, 'webhook_id');

// Delete a webhook subscription
await manageWebhookSubscription('delete', null, 'webhook_id');
```

## ✅ Step 5: Testing

### Test Health Check

```typescript
import { checkWebhookServerHealth } from '@/lib/webhook-server';

const health = await checkWebhookServerHealth();
console.log('Webhook server status:', health);
```

### Test Payment Flow

1. Start webhook server: `cd WebhookServer && npm run dev`
2. Start frontend: `cd Frontend && npm run dev`
3. Go to checkout page
4. Complete a test payment with Razorpay test credentials
5. Check webhook server logs for payment verification

## 🚀 Step 6: Production Deployment

1. **Deploy Webhook Server**
   - Follow `WebhookServer/DEPLOYMENT_GUIDE.md`
   - Deploy to Render, Railway, or your VPS
   - Note the production URL (e.g., `https://webhooks.viruthigold.in`)

2. **Update Environment Variables**
   ```env
   # In production .env
   VITE_WEBHOOK_SERVER_URL=https://webhooks.viruthigold.in
   ```

3. **Configure Razorpay Webhook**
   - Go to Razorpay Dashboard → Webhooks
   - Add webhook URL: `https://webhooks.viruthigold.in/api/razorpay/webhook`
   - Select events: `payment.captured`, `payment.failed`, etc.
   - Set webhook secret in `.env`

4. **Redeploy Frontend & Backend**
   ```bash
   # Rebuild with new environment variable
   docker compose up --build -d
   ```

## 📊 Monitoring

### Check Server Status

Add health check to your admin dashboard:

```typescript
import { checkWebhookServerHealth } from '@/lib/webhook-server';

async function ServerStatus() {
  const health = await checkWebhookServerHealth();
  
  return (
    <div>
      <h3>Webhook Server Status</h3>
      <p>Status: {health.status}</p>
      <p>Uptime: {health.uptime}s</p>
    </div>
  );
}
```

## 🐛 Troubleshooting

### CORS Issues

If you get CORS errors, update the webhook server's `.env`:

```env
CORS_ORIGIN=https://your-frontend-domain.com
```

### Server Not Reachable

```typescript
const health = await checkWebhookServerHealth();
if (health.status === 'error') {
  console.error('Webhook server is down!');
  // Fall back to alternative payment method or show maintenance message
}
```

### Payment Verification Fails

1. Check webhook server logs
2. Verify `RAZORPAY_KEY_SECRET` in webhook server `.env`
3. Ensure signature is being passed correctly from frontend

## 📝 API Reference

See `WebhookServer/README.md` for complete API documentation.

## 🔗 Quick Links

- Webhook Server Code: `WebhookServer/`
- API Documentation: `WebhookServer/README.md`
- Deployment Guide: `WebhookServer/DEPLOYMENT_GUIDE.md`
- Frontend Service: `Frontend/src/lib/webhook-server.ts`
- Backend Service: `Backend/src/lib/webhook-server.ts`

---

**Need Help?** Check the webhook server logs or create an issue in the repository.
