# Razorpay Troubleshooting Guide

## Error: "The id provided does not exist"

This error occurs when Razorpay receives an invalid order ID during checkout. This guide will help you fix it.

## 🔍 Quick Diagnosis

Open your browser console and run:
```javascript
testRazorpay()
```

This will run automated diagnostics and tell you exactly what's wrong.

## 🚨 Common Causes & Solutions

### 1. CRM Endpoint Not Returning Valid Order ID

**Problem**: The CRM endpoint is not returning a properly formatted Razorpay order ID.

**Check**: 
- Look at the browser console when placing an order
- Find the log: `Order ID received: XXXXX`
- The order ID **MUST** start with `order_`
- Example valid ID: `order_MzXYZ123456789`
- Example invalid ID: `pbc_1234567890` or any PocketBase ID

**Solution**:
```javascript
// Your CRM endpoint MUST return this format:
{
  "id": "order_MzXYZ123456789",  // ✅ Correct - starts with "order_"
  "entity": "order",
  "amount": 35000,               // Amount in paise (₹350.00)
  "currency": "INR",
  "status": "created"
}

// NOT this:
{
  "id": "pbc_1234567890",        // ❌ Wrong - PocketBase ID
  "orderId": "order_XYZ"         // ❌ Wrong - wrong field name
}
```

**Fix Your Endpoint**:
1. Check `VITE_CRM_ORDER_ENDPOINT` environment variable
2. Ensure it calls Razorpay's API correctly
3. Return the EXACT response from Razorpay without modification

---

### 2. Environment Variable Not Set

**Problem**: `VITE_RAZORPAY_KEY_ID` is missing or incorrect.

**Check**:
```bash
# In your .env file:
VITE_RAZORPAY_KEY_ID=rzp_live_XXXXX  # For production
# OR
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXX  # For testing
```

**Solution**:
1. Copy `.env.example` to `.env` if not exists
2. Get your key from: https://dashboard.razorpay.com/app/keys
3. Add it to the `.env` file in the ROOT directory
4. Restart your dev server: `npm run dev`

---

### 3. CRM Endpoint Returns Wrong Response

**Problem**: Your backend is transforming the Razorpay response incorrectly.

**What to Check**:
```javascript
// Browser Console will show:
"Razorpay order created successfully:"
{
  id: "order_XXXXX",  // This is what we need
  amount: 35000,
  currency: "INR"
}
```

**If you see something else**, your backend is wrong:
```javascript
// ❌ WRONG - Missing order ID
{ success: true, orderId: "pbc_123" }

// ❌ WRONG - Wrong field name
{ razorpay_order_id: "order_XXX" }

// ❌ WRONG - Nested object
{ data: { id: "order_XXX" } }
```

**Fix**: Your backend must return Razorpay's raw response.

---

### 4. Using Wrong Endpoint

**Problem**: Pointing to wrong CRM endpoint or old server.

**Check your .env**:
```bash
# Should be:
VITE_CRM_ORDER_ENDPOINT=https://your-crm-domain.com/functions/v1/create-order-karigai

# NOT:
VITE_CRM_ORDER_ENDPOINT=/api/razorpay/create-order  # ❌ Wrong
```

**Current Default**:
```
https://crm-supabase.7za6uc.easypanel.host/functions/v1/create-order-karigai
```

If this endpoint is down or changed, update it in your `.env` file.

---

## 🔧 Step-by-Step Fix

### Step 1: Run Diagnostics
```javascript
// In browser console:
testRazorpay()
```

Look at the output. It will tell you exactly what's wrong.

### Step 2: Check CRM Endpoint Response

1. Open Network tab in browser DevTools
2. Try to place an order
3. Find the request to `create-order-karigai`
4. Check the Response tab

**Good Response**:
```json
{
  "id": "order_MzXYZ123456789",
  "entity": "order",
  "amount": 35000,
  "amount_paid": 0,
  "amount_due": 35000,
  "currency": "INR",
  "receipt": "order_pbc_xxxxx",
  "status": "created",
  "attempts": 0,
  "notes": {},
  "created_at": 1699123456
}
```

**Bad Response** (any of these means your backend needs fixing):
```json
// Missing order ID
{ "success": true }

// Wrong ID format
{ "id": "pbc_123456" }

// Error response
{ "error": "Razorpay API key invalid" }

// HTTP 500 error
{ "message": "Internal Server Error" }
```

### Step 3: Fix Backend Endpoint

Your CRM endpoint should do this:

```typescript
// Pseudo-code for your backend
async function createOrderHandler(request) {
  const { amount, currency, receipt, notes } = await request.json();
  
  // Call Razorpay API
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  
  const order = await razorpay.orders.create({
    amount: amount,        // Already in paise from frontend
    currency: currency,
    receipt: receipt,
    notes: notes
  });
  
  // Return EXACTLY what Razorpay returns
  // DO NOT modify the response
  return new Response(JSON.stringify(order), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Step 4: Verify Environment Variables

```bash
# Root .env file must have:
VITE_RAZORPAY_KEY_ID=rzp_live_XXXXXXXXX
VITE_CRM_ORDER_ENDPOINT=https://your-endpoint.com/create-order-karigai

# Your backend .env must have:
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXX
```

### Step 5: Test the Fix

1. Restart your dev server: `Ctrl+C` then `npm run dev`
2. Clear browser cache and cookies
3. Try placing an order again
4. Check console logs - should see:
   - ✅ "Razorpay order created successfully"
   - ✅ "Order ID received: order_XXXXX"
   - ✅ "Opening Razorpay checkout..."

---

## 📝 Console Logs to Look For

### ✅ Success Logs:
```
Creating order with CRM endpoint: https://...
Converting ₹350 to 35000 paise for Razorpay
Order created successfully: { id: "order_XXX", ... }
Order ID received: order_XXX
Opening Razorpay checkout with key: rzp_live...
Razorpay checkout opened successfully
```

### ❌ Error Logs:
```
CRM endpoint error response: ...
Invalid Razorpay order ID format: pbc_XXX
The id provided does not exist
```

---

## 🆘 Still Not Working?

### Check These:

1. **Razorpay Dashboard**:
   - Go to https://dashboard.razorpay.com
   - Check if API keys are correct
   - Look at "Orders" - do you see test orders being created?

2. **Backend Logs**:
   - Check your CRM/backend server logs
   - Look for Razorpay API errors
   - Common issues:
     - Invalid API keys
     - Amount format wrong (must be in paise)
     - Network/firewall issues

3. **Test with Razorpay Directly**:
   ```bash
   # Test your backend endpoint:
   curl -X POST https://your-endpoint.com/create-order-karigai \
     -H "Content-Type: application/json" \
     -d '{"amount":10000,"currency":"INR","receipt":"test123"}'
   
   # Should return:
   # {"id":"order_XXX","entity":"order",...}
   ```

4. **Use Razorpay Test Mode**:
   - Use `rzp_test_` key instead of `rzp_live_`
   - This eliminates production issues
   - Test cards: https://razorpay.com/docs/payments/payments/test-card-details/

---

## 🔑 Key Points

1. ✅ Order ID **MUST** start with `order_`
2. ✅ Amount **MUST** be in paise (multiply rupees by 100)
3. ✅ Backend must return Razorpay's raw response
4. ✅ API keys must be correct (live for production, test for development)
5. ✅ CRM endpoint must be accessible and working

---

## 📞 Support

If you're still stuck:

1. Run `testRazorpay()` in console
2. Copy the full diagnostic output
3. Check the Network tab for the failed request
4. Look at your backend logs
5. Contact Razorpay support with:
   - The error message
   - Your diagnostic output
   - Network request/response details

---

## 📚 References

- [Razorpay Orders API](https://razorpay.com/docs/api/orders/)
- [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
- [Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)