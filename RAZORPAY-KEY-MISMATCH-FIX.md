# 🔥 URGENT: Razorpay Key Mismatch Fix

## The Problem

You're getting this error:
```
"The id provided does not exist"
Status: 400 Bad Request
```

**Root Cause**: Your **frontend is using LIVE keys** (`rzp_live_...`) but your **backend is creating orders with TEST keys** (`rzp_test_...`), or vice versa.

Razorpay orders created with TEST keys CANNOT be used with LIVE keys, and vice versa.

---

## ✅ Quick Fix (Choose ONE option)

### Option 1: Use TEST Mode Everywhere (Recommended for Development)

**Frontend (.env in ROOT directory):**
```env
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
VITE_RAZORPAY_KEY_SECRET=XXXXXXXXXXXXX
```

**Backend (Your CRM Supabase Function):**
```env
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXX
```

**Where to get TEST keys:**
1. Go to: https://dashboard.razorpay.com/app/keys
2. Switch to "Test Mode" (toggle at top)
3. Copy both Key ID and Key Secret
4. Update BOTH frontend and backend .env files
5. Restart servers

### Option 2: Use LIVE Mode Everywhere (For Production Only)

**Frontend (.env in ROOT directory):**
```env
VITE_RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXX
VITE_RAZORPAY_KEY_SECRET=XXXXXXXXXXXXX
```

**Backend (Your CRM Supabase Function):**
```env
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXX
```

**Where to get LIVE keys:**
1. Go to: https://dashboard.razorpay.com/app/keys
2. Switch to "Live Mode" (toggle at top)
3. Complete KYC if not done
4. Copy both Key ID and Key Secret
5. Update BOTH frontend and backend .env files
6. Restart servers

⚠️ **NEVER mix TEST and LIVE keys!**

---

## 🔍 How to Verify the Issue

### Step 1: Check Your Frontend Keys

Open browser console and look for:
```
🔑 Using Razorpay Key Mode: LIVE (rzp_live_...)
```
or
```
🔑 Using Razorpay Key Mode: TEST (rzp_test_...)
```

### Step 2: Check Your Backend Keys

Check your CRM endpoint logs or environment variables:
```bash
# SSH into your backend server
echo $RAZORPAY_KEY_ID

# Should match frontend mode:
# If frontend is LIVE → Backend must be rzp_live_...
# If frontend is TEST → Backend must be rzp_test_...
```

### Step 3: Check the Order Created

In browser console, find:
```
Order ID received: order_XXXXX
```

Then check in Razorpay Dashboard:
1. Go to: https://dashboard.razorpay.com
2. Switch to TEST or LIVE mode (try both)
3. Go to Payments → Orders
4. Search for the order ID
5. If you find it in TEST mode → Backend used TEST keys
6. If you find it in LIVE mode → Backend used LIVE keys

---

## 🛠️ Detailed Fix Steps

### For CRM Supabase Function

Your backend endpoint is:
```
https://crm-supabase.7za6uc.easypanel.host/functions/v1/create-order-karigai
```

**Update the function:**

1. **Check current environment variables:**
   ```bash
   # In Supabase dashboard or server
   printenv | grep RAZORPAY
   ```

2. **Update to match frontend mode:**
   ```bash
   # If frontend uses TEST:
   RAZORPAY_KEY_ID=rzp_test_XXXXX
   RAZORPAY_KEY_SECRET=XXXXX
   
   # If frontend uses LIVE:
   RAZORPAY_KEY_ID=rzp_live_XXXXX
   RAZORPAY_KEY_SECRET=XXXXX
   ```

3. **Verify the code uses these variables:**
   ```typescript
   // In your create-order-karigai function:
   const razorpay = new Razorpay({
     key_id: process.env.RAZORPAY_KEY_ID,     // Must match frontend
     key_secret: process.env.RAZORPAY_KEY_SECRET
   });
   ```

4. **Restart the function/server**

5. **Test again**

---

## 🧪 Testing After Fix

### Step 1: Clear Everything
```bash
# Clear browser cache
# In DevTools: Application → Clear storage → Clear site data

# Or just hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### Step 2: Check Console Logs

When you try checkout, you should see:
```
🔑 Using Razorpay Key Mode: TEST (rzp_test_...)
⚠️ CRITICAL: Backend MUST use the SAME TEST keys to create the order!
Creating order with CRM endpoint: https://...
Order created successfully: { id: "order_...", ... }
✅ Order verification successful - keys match!
🔑 Opening checkout with TEST key: rzp_test_...
📋 Using order_id: order_XXXXX
Razorpay checkout opened successfully
```

### Step 3: Test Payment

**For TEST mode:**
- Use test card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date
- Test cards: https://razorpay.com/docs/payments/payments/test-card-details/

**For LIVE mode:**
- Use real card (⚠️ real money will be charged!)

---

## ❌ Common Mistakes

### Mistake 1: Only Updated Frontend
```
Frontend: rzp_live_... ✅
Backend:  rzp_test_... ❌ WRONG!
```
**Result**: "The id provided does not exist"

### Mistake 2: Only Updated Backend
```
Frontend: rzp_test_... ❌ WRONG!
Backend:  rzp_live_... ✅
```
**Result**: "The id provided does not exist"

### Mistake 3: Mixed Keys in .env
```env
# WRONG - Don't do this:
VITE_RAZORPAY_KEY_ID=rzp_live_XXXXX
RAZORPAY_KEY_ID=rzp_test_XXXXX  # Different mode!
```

### Mistake 4: Forgot to Restart
After changing .env, you MUST:
```bash
# Stop servers
Ctrl+C

# Restart
npm run dev

# Or for backend
pm2 restart all
# or
systemctl restart your-service
```

---

## 🎯 The Golden Rule

```
┌──────────────────────────────────────────────┐
│  FRONTEND KEY MODE = BACKEND KEY MODE        │
│                                              │
│  Both TEST  ✅ Works                         │
│  Both LIVE  ✅ Works                         │
│  Mixed      ❌ ERROR                         │
└──────────────────────────────────────────────┘
```

---

## 📱 Environment Setup Checklist

### Development Environment
- [ ] Frontend: `rzp_test_...`
- [ ] Backend: `rzp_test_...`
- [ ] Both .env files updated
- [ ] Servers restarted
- [ ] Test payment works with test cards

### Production Environment
- [ ] Frontend: `rzp_live_...`
- [ ] Backend: `rzp_live_...`
- [ ] Both .env files updated
- [ ] KYC completed in Razorpay
- [ ] Servers restarted
- [ ] Test payment works with real card (small amount)

---

## 🔐 Security Best Practices

1. **Never commit .env files**
   ```bash
   # Ensure .gitignore has:
   .env
   .env.*
   !.env.example
   ```

2. **Use different keys per environment**
   ```
   Development:  rzp_test_...
   Staging:      rzp_test_...
   Production:   rzp_live_...
   ```

3. **Rotate keys regularly**
   - Generate new keys every 3-6 months
   - Update both frontend and backend simultaneously

4. **Never log full keys**
   ```javascript
   // Good:
   console.log('Key:', key.substring(0, 8) + '...')
   
   // Bad:
   console.log('Key:', key)  // ❌ Don't do this
   ```

---

## 🆘 Still Not Working?

### Run Diagnostics
```javascript
// In browser console:
testRazorpay()
```

This will show:
- What key mode you're using
- Whether backend is accessible
- If order format is correct
- Exact error details

### Check Razorpay Dashboard

1. Go to: https://dashboard.razorpay.com
2. Switch between TEST/LIVE modes
3. Check Payments → Orders
4. Find your order ID
5. Which mode is it in? That's your backend mode
6. Make frontend match that mode

### Manual Test Backend

```bash
# Test your backend directly:
curl -X POST https://crm-supabase.7za6uc.easypanel.host/functions/v1/create-order-karigai \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "receipt": "test_receipt"
  }'

# Should return:
# {"id":"order_XXXXX","entity":"order",...}

# Check the order_id prefix in Razorpay dashboard
# to see which mode the backend is using
```

---

## 📞 Getting Help

If still stuck after all this:

1. **Collect Information:**
   - Run `testRazorpay()` and copy output
   - Check browser Network tab for failed requests
   - Check backend logs
   - Screenshot of Razorpay dashboard showing the order

2. **Common Questions to Ask:**
   - What mode (TEST/LIVE) are my frontend keys?
   - What mode are my backend keys?
   - Can I see the order in Razorpay dashboard? In which mode?
   - Did I restart both frontend and backend after changing keys?

3. **Contact:**
   - Razorpay Support: https://razorpay.com/support/
   - Include: Error message, order ID, timestamp, whether TEST or LIVE

---

## ✅ Success Indicators

You'll know it's fixed when:

1. ✅ Console shows: "Order verification successful - keys match!"
2. ✅ Razorpay checkout modal opens
3. ✅ No "id provided does not exist" error
4. ✅ Can complete test payment successfully
5. ✅ Order appears in Razorpay dashboard in correct mode

---

## 🎓 Key Takeaways

1. Razorpay has two completely separate systems: TEST and LIVE
2. Orders created in TEST cannot be used in LIVE (and vice versa)
3. Frontend and backend MUST use keys from the same mode
4. Always verify which mode your keys are in (check the prefix: `rzp_test_` or `rzp_live_`)
5. After changing keys, always restart servers
6. Use TEST mode for development, LIVE mode for production only

---

## 📚 References

- [Razorpay Keys Documentation](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/)
- [Test vs Live Mode](https://razorpay.com/docs/payments/dashboard/settings/test-live-modes/)
- [Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)
- [Standard Checkout Integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)