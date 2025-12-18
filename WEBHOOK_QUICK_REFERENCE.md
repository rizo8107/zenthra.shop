# ⚡ Razorpay Webhook Quick Reference

## 🔗 Webhook Endpoint
```
POST /api/razorpay-webhook
```

## 🌐 URLs

### Local Development (with ngrok)
```
https://your-ngrok-url.ngrok.io/api/razorpay-webhook
```

### Production
```
https://your-backend-domain.com/api/razorpay-webhook
```

---

## ⚙️ Environment Variables

Add to `.env`:
```bash
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxx
```

Get this from: Razorpay Dashboard → Settings → Webhooks → (your webhook) → Secret

---

## 📝 Razorpay Dashboard Setup

1. **Login**: https://dashboard.razorpay.com/
2. **Go to**: Settings → Webhooks
3. **Add Webhook**:
   - URL: `https://your-url.com/api/razorpay-webhook`
   - Events: `payment.captured`, `payment.failed`, `payment.authorized`, `order.paid`
   - Secret: Copy this to `.env`

---

## 🧪 Quick Test Commands

### Test 1: Check Endpoint is Running
```bash
curl http://localhost:3001/api/razorpay-webhook
# Should return: {"error":"Missing signature"}
```

### Test 2: Manual Order Update
```bash
curl -X POST http://localhost:3001/api/test-payment-update \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "YOUR_ORDER_ID_HERE",
    "paymentId": "pay_test_123",
    "amount": 290,
    "status": "captured"
  }'
```

### Test 3: Start ngrok
```bash
ngrok http 3001
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

---

## 📊 Events Handled

| Event | Description | Order Status After |
|-------|-------------|-------------------|
| `payment.captured` | Payment successful | `payment_status: "paid"`, `status: "processing"` |
| `payment.failed` | Payment failed | `payment_status: "failed"`, `status: "payment_failed"` |
| `payment.authorized` | Payment authorized | `payment_status: "authorized"` |
| `order.paid` | Order fully paid | `payment_status: "paid"` |

---

## 🔐 Security

✅ Signature verification (HMAC-SHA256)  
✅ Rejects invalid signatures  
✅ Always returns 200 to Razorpay  
✅ Logs all errors for debugging

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Invalid signature | Check `RAZORPAY_WEBHOOK_SECRET` in `.env`, restart server |
| Order not found | Ensure order has `razorpay_order_id` or notes with `pocketbase_order_id` |
| ngrok expired | Restart ngrok, update Razorpay webhook URL |
| Webhook not triggered | Check Razorpay webhook logs for errors |

---

## ✅ Setup Checklist

- [ ] Create `.env` variable `RAZORPAY_WEBHOOK_SECRET`
- [ ] Restart backend: `npm run dev`
- [ ] Start ngrok: `ngrok http 3001`
- [ ] Add webhook in Razorpay dashboard
- [ ] Test with manual endpoint
- [ ] Test with real payment
- [ ] Verify in PocketBase

---

## 📋 What Gets Updated in PocketBase

When `payment.captured` webhook is received:

```javascript
{
  payment_status: "paid",
  status: "processing",
  payment_id: "pay_xxx",
  razorpay_payment_id: "pay_xxx",
  payment_date: "2024-12-18T...",
  totalAmount: 290,
  total: 290,
  notes: "Payment captured via Razorpay webhook...",
  updated: "2024-12-18T..."
}
```

---

## 🔍 Backend Console Logs

### Success:
```
📨 Razorpay webhook received
✅ Webhook signature verified
📋 Event type: payment.captured
💰 Processing payment.captured event
Payment ID: pay_xxx
Amount: 290 INR
📝 PocketBase Order ID: order_xxx
📝 Updating order...
✅ Order updated successfully
🔍 Verification - Order after update: { payment_status: "paid" }
✅✅ Verified: Order status updated correctly
```

### Failure:
```
❌ Invalid webhook signature
❌ No PocketBase order ID in payment notes
💥 Error updating order in PocketBase: ...
```

---

## 🚀 Production Deployment

1. Deploy backend to production
2. Get production URL (e.g., `https://api.yoursite.com`)
3. Update Razorpay webhook URL:
   ```
   https://api.yoursite.com/api/razorpay-webhook
   ```
4. No ngrok needed in production!

---

## 📞 Support

- **Webhook not working?** Check Razorpay webhook logs
- **Order not updating?** Check backend console logs
- **Signature invalid?** Verify secret matches Razorpay dashboard

---

**For full setup instructions, see `RAZORPAY_WEBHOOK_SETUP.md`**
