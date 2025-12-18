# 🔧 Webhook 500 Error - Quick Fix

## Problem
You're getting **500 Internal Server Error** when calling `/api/test-payment-update`.

This means:
- ✅ Route EXISTS (not 404)  
- ❌ Runtime ERROR in the handler

---

## Solution: Restart Backend Server

The backend server needs to be **fully restarted** to load the new webhook routes.

### Steps:

1. **Stop current backend server**
   - In your terminal running `npm run dev`
   - Press `Ctrl + C`

2. **Restart**
   ```bash
   npm run dev
   ```

3. **Wait for console to show:**
   ```
   [API] Server running on port 3001
   ```

4. **Test again:**
   ```bash
   powershell -ExecutionPolicy Bypass -File test-webhook.ps1
   ```

   Should now show:
   ```
   ✅ SUCCESS!
   {
     "success": true,
     "message": "Order updated successfully",
     "orderId": "order_ReKsqjjQWMOPJv",
     "status": "captured"
   }
   ```

---

## Alternative: Check Backend Console

If error persists after restart, check the backend console output for errors like:

```
Error: Cannot find module './razorpay-webhook.js'
OR
TypeError: updateOrderStatus is not a function
OR
Error connecting to PocketBase
```

Share the error message and I'll help fix it!

---

## Quick Test Script

I created `test-webhook.ps1` for you. Run it anytime:

```bash
powershell -ExecutionPolicy Bypass -File test-webhook.ps1
```

This tests the `/api/test-payment-update` endpoint without needing Razorpay!

---

## What the Test Does

```powershell
POST http://localhost:3001/api/test-payment-update
Body: {
  "orderId": "order_ReKsqjjQWMOPJv",
  "paymentId": "pay_test_123",
  "amount": 290,
  "status": "captured"
}
```

If successful, it will:
1. Update order in PocketBase
2. Set `payment_status: "paid"`
3. Set `totalAmount: 290`
4. Return success response

---

## After Restart Works

Once the test works:

1. ✅ `/api/test-payment-update` works
2. ✅ `/api/razorpay-webhook` also works
3. ✅ Ready to configure Razorpay Dashboard
4. ✅ Start ngrok and add webhook URL

---

**The route is correct, just needs a server restart!** 🚀
