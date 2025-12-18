# 🔐 Razorpay Webhook Setup Guide

## Overview
This webhook handler receives payment notifications directly from Razorpay and updates orders in PocketBase automatically. This is **more reliable** than frontend updates because:

✅ Works even if user closes browser  
✅ No authentication issues  
✅ Guaranteed delivery (Razorpay retries)  
✅ Secure signature verification  
✅ Handles all payment states

---

## 📁 Files Created

### 1. `Backend/src/server/razorpay-webhook.ts`
Complete webhook handler with:
- Signature verification (security)
- Event handling (captured, failed, authorized)
- PocketBase order updates
- Comprehensive logging
- Error handling

### 2. `Backend/src/server/index.ts` (Updated)
Added webhook route: `/api/razorpay-webhook`

---

## 🚀 Quick Setup

### Step 1: Add Webhook Secret to `.env`

```bash
# Add to your .env file
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

You'll get this secret from Razorpay dashboard in Step 4.

### Step 2: Restart Backend Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

###Step 3: Test Locally with ngrok (Required)

Razorpay needs a public URL to send webhooks. Use ngrok:

**Install ngrok:**
```bash
# Download from https://ngrok.com/download
# Or use npm:
npm install -g ngrok
```

**Start ngrok:**
```bash
# In a new terminal, run:
ngrok http 3001

# You'll see output like:
# Forwarding: https://abc123.ngrok.io -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 4: Configure Razorpay Webhook

1. **Go to Razorpay Dashboard**: https://dashboard.razorpay.com/
2. **Navigate to**: Settings → Webhooks
3. **Click**: "+ Add New Webhook"
4. **Configure:**

```
Webhook URL: https://abc123.ngrok.io/api/razorpay-webhook
(Replace abc123.ngrok.io with your ngrok URL)

Active Events (Select these):
✅ payment.authorized
✅ payment.captured  ← MOST IMPORTANT
✅ payment.failed
✅ order.paid

Alert Email: your-email@example.com
```

5. **Click**: "Create Webhook"
6. **Copy the Secret**: You'll see a "Secret" field - copy this value
7. **Add to .env**:
```bash
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

8. **Restart backend** to load the new secret

---

## 🧪 Testing

### Test 1: Check Webhook is Running

```bash
# Test the endpoint is accessible:
curl http://localhost:3001/api/razorpay-webhook

# Should return: {"error":"Missing signature"}
# This means endpoint is working!
```

### Test 2: Manual Test (Without Razorpay)

Use the test endpoint to simulate a webhook:

```bash
curl -X POST http://localhost:3001/api/test-payment-update \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_ReKsqjjQWMOPJv",
    "paymentId": "pay_test_123",
    "amount": 290,
    "status": "captured"
  }'
```

**Check PocketBase:**
- Order should now have `payment_status: "paid"`
- `status: "processing"`
- `totalAmount: 290`

### Test 3: Real Payment Test

1. **Make a small test purchase** (₹1 or lowest amount)
2. **Use Razorpay test card**:
   ```
   Card: 4111 1111 1111 1111
   Expiry: 12/25
   CVV: 123
   ```
3. **Complete payment**
4. **Check backend console** - you should see:
   ```
   📨 Razorpay webhook received
   ✅ Webhook signature verified
   💰 Processing payment.captured event
   📝 Updating order...
   ✅ Order updated successfully
   ✅✅ Verified: Order status updated correctly
   ```
5. **Check PocketBase** - order should be marked as paid

---

## 📊 Webhook Events Handled

### 1. `payment.captured` (Main Event)
**When:** Payment successfully captured by Razorpay  
**Action:** 
- Sets `payment_status: "paid"`
- Sets `status: "processing"`
- Sets `totalAmount` from payment amount
- Adds payment ID and date

**Console Log:**
```
💰 Processing payment.captured event
Payment ID: pay_xxx
Amount: 290 INR
Status: captured
✅ Order updated successfully
```

### 2. `payment.failed`
**When:** Payment attempt failed  
**Action:**
- Sets `payment_status: "failed"`
- Sets `status: "payment_failed"`
- Records error message

**Console Log:**
```
❌ Processing payment.failed event
Error: insufficient_funds
```

### 3. `payment.authorized`
**When:** Payment authorized but not captured  
**Action:**
- Sets `payment_status: "authorized"`
- Sets `status: "payment_authorized"`

**Console Log:**
```
🔐 Processing payment.authorized event
Payment ID: pay_xxx
```

### 4. `order.paid`
**When:** Entire Razorpay order is paid  
**Action:**
- Finds order by `razorpay_order_id`
- Marks as paid

---

## 🔐 Security Features

### 1. Signature Verification
Every webhook is verified using HMAC-SHA256:

```typescript
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
  .update(webhookBody)
  .digest('hex');
```

❌ **Invalid signature** → Webhook rejected  
✅ **Valid signature** → Webhook processed

### 2. Auto-Cancel Protection
All PocketBase queries use `$autoCancel: false` to prevent race conditions.

### 3. Error Handling
Always returns 200 to Razorpay (prevents infinite retries), but logs errors.

---

## 🐛 Troubleshooting

### Issue 1: "Invalid signature" Error

**Console shows:**
```
❌ Invalid webhook signature
```

**Causes:**
1. Wrong webhook secret in `.env`
2. Webhook secret not loaded (restart needed)
3. Request not from Razorpay

**Solution:**
```bash
# 1. Verify secret in Razorpay dashboard
# 2. Update .env:
RAZORPAY_WEBHOOK_SECRET=whsec_correct_secret_here

# 3. Restart backend:
npm run dev
```

### Issue 2: "No PocketBase order ID" Error

**Console shows:**
```
❌ No PocketBase order ID in payment notes
```

**Cause:** Order wasn't created with notes

**Solution:** Ensure order creation includes notes:

```typescript
// When creating Razorpay order:
const razorpayOrder = await razorpay.orders.create({
  amount: total * 100,
  currency: 'INR',
  notes: {
    pocketbase_order_id: orderId,  // ← Must have this!
    order_id: orderId
  }
});
```

### Issue 3: Order Not Found

**Console shows:**
```
❌ Could not find order with razorpay_order_id
```

**Solution:** Webhook tries both:
1. Find by notes (`pocketbase_order_id`)
2. Find by `razorpay_order_id` field

Ensure order has `razorpay_order_id` field set.

### Issue 4: ngrok URL Expired

**Error:** Webhook stops working after some time

**Cause:** Free ngrok URLs expire after 8 hours

**Solution:**
1. Restart ngrok
2. Get new URL
3. Update Razorpay webhook URL
4. OR use ngrok paid plan for permanent URL

---

## 📋 Complete Setup Checklist

- [ ] Created `razorpay-webhook.ts` file
- [ ] Added webhook router to `server/index.ts`
- [ ] Added `RAZORPAY_WEBHOOK_SECRET` to `.env`
- [ ] Restarted backend server
- [ ] Installed ngrok
- [ ] Started ngrok on port 3001
- [ ] Copied ngrok HTTPS URL
- [ ] Created webhook in Razorpay dashboard
- [ ] Added ngrok URL + `/api/razorpay-webhook`
- [ ] Selected payment events (captured, failed, authorized, order.paid)
- [ ] Copied webhook secret from Razorpay
- [ ] Pasted secret in `.env`
- [ ] Restarted backend again
- [ ] Tested with manual endpoint
- [ ] Tested with real Razorpay payment
- [ ] Verified order updated in PocketBase

---

## 🎯 Expected Behavior After Setup

### Before Webhook:
```
User pays → Frontend tries to update → Sometimes fails → Order stuck on "pending"
```

### After Webhook:
```
User pays → Razorpay sends webhook → Backend updates order → Always works ✅
```

**Benefits:**
- ✅ Works even if user closes browser during payment
- ✅ No frontend auth issues
- ✅ Razorpay retries failed webhooks automatically
- ✅ Secure (signature verified)
- ✅ Handles all payment states (captured, failed, authorized)

---

## 🔄 Production Deployment

### Option 1: Deploy Backend to Public URL

If backend is deployed (e.g., Vercel, Railway, Render):

```
Webhook URL: https://your-backend.com/api/razorpay-webhook
```

No ngrok needed!

### Option 2: Use Cloudflare Tunnel (Alternative to ngrok)

```bash
# Install cloudflared
# Create tunnel
cloudflared tunnel --url http://localhost:3001
```

Free and doesn't expire!

---

## 📊 Monitoring

### View Webhook Logs

**In Razorpay Dashboard:**
1. Settings → Webhooks
2. Click on your webhook
3. View "Webhook Logs"
4. See all events sent and responses

**In Your Backend Console:**
Look for:
```
📨 Razorpay webhook received
✅ Webhook signature verified
💰 Processing payment.captured
✅ Order updated successfully
```

### Common Webhook Response Codes

- **200** - ✅ Webhook processed successfully
- **400** - ❌ Bad request (invalid signature, missing data)
- **500** - 💥 Server error (check logs)

Razorpay will retry failed webhooks (non-200) automatically.

---

## 🚀 Next Steps

1. ✅ **Test with real payment**
2. ✅ **Monitor backend console**
3. ✅ **Check PocketBase order updates**
4. ✅ **Verify in Razorpay webhook logs**
5. ✅ **Deploy backend to production**
6. ✅ **Update webhook URL in Razorpay**

---

**Your payment verification is now bulletproof! 🎉**

Even if frontend fails, Razorpay webhook will ensure orders are marked as paid!
