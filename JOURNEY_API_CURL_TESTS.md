# 🧪 Customer Journey API - cURL Test Commands

## 📍 API Endpoints

**Base URL:** `http://localhost:3001`

**Available Endpoints:**
1. `POST /api/webhook/customer-journey` - Send journey events
2. `GET /api/customer-journey/data` - Get all journey data
3. `GET /api/customer-journey/customer/:id` - Get specific customer
4. `GET /api/customer-journey/health` - Health check

---

## 🚀 Quick Test Commands

### **1. Health Check** (Test if API is running)

```bash
curl http://localhost:3001/api/customer-journey/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-11-25T09:36:44.000Z",
  "events_count": 0,
  "customers_count": 0
}
```

---

### **2. Send Page View Event**

```bash
curl -X POST http://localhost:3001/api/webhook/customer-journey \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "user_123",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "event": "stage_entered",
    "stage": "awareness",
    "timestamp": "2025-11-25T09:30:00.000Z",
    "metadata": {
      "source": "homepage",
      "page": "/",
      "referrer": "google.com"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Event processed successfully",
  "event_id": "abc-123-def-456",
  "customer_stage": "awareness",
  "timestamp": "2025-11-25T09:30:00.000Z"
}
```

---

### **3. Send Product View Event**

```bash
curl -X POST http://localhost:3001/api/webhook/customer-journey \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "user_123",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "event": "stage_entered",
    "stage": "consideration",
    "timestamp": "2025-11-25T09:35:00.000Z",
    "metadata": {
      "source": "product_page",
      "product_id": "prod_456",
      "product_name": "Premium Widget",
      "price": 1999
    }
  }'
```

---

### **4. Send Add to Cart Event**

```bash
curl -X POST http://localhost:3001/api/webhook/customer-journey \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "user_123",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "event": "stage_entered",
    "stage": "consideration",
    "timestamp": "2025-11-25T09:40:00.000Z",
    "metadata": {
      "source": "add_to_cart",
      "product_id": "prod_456",
      "quantity": 1,
      "cart_total": 1999
    }
  }'
```

---

### **5. Send Purchase Event**

```bash
curl -X POST http://localhost:3001/api/webhook/customer-journey \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "user_123",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "event": "purchase_made",
    "stage": "purchase",
    "timestamp": "2025-11-25T09:45:00.000Z",
    "metadata": {
      "source": "checkout",
      "order_id": "order_789",
      "value": 1999,
      "payment_method": "razorpay"
    }
  }'
```

---

### **6. Get All Journey Data**

```bash
curl http://localhost:3001/api/customer-journey/data
```

**Expected Response:**
```json
{
  "success": true,
  "customers": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "currentStage": "purchase",
      "totalValue": 1999,
      "firstSeen": "2025-11-25T09:30:00.000Z",
      "lastActivity": "2025-11-25T09:45:00.000Z",
      "events": [...]
    }
  ],
  "events": [...]
}
```

---

### **7. Get Specific Customer**

```bash
curl http://localhost:3001/api/customer-journey/customer/user_123
```

---

## 🎯 Complete Test Sequence

Run these commands in order to simulate a complete customer journey:

```bash
# 1. Health check
curl http://localhost:3001/api/customer-journey/health

# 2. Customer visits homepage (Awareness)
curl -X POST http://localhost:3001/api/webhook/customer-journey \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"user_123","customer_name":"John Doe","customer_email":"john@example.com","event":"stage_entered","stage":"awareness","timestamp":"2025-11-25T09:30:00.000Z","metadata":{"source":"homepage"}}'

# 3. Customer views product (Consideration)
curl -X POST http://localhost:3001/api/webhook/customer-journey \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"user_123","customer_name":"John Doe","customer_email":"john@example.com","event":"stage_entered","stage":"consideration","timestamp":"2025-11-25T09:35:00.000Z","metadata":{"source":"product_page","product_id":"prod_456","price":1999}}'

# 4. Customer adds to cart
curl -X POST http://localhost:3001/api/webhook/customer-journey \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"user_123","customer_name":"John Doe","customer_email":"john@example.com","event":"stage_entered","stage":"consideration","timestamp":"2025-11-25T09:40:00.000Z","metadata":{"source":"add_to_cart","product_id":"prod_456","quantity":1}}'

# 5. Customer completes purchase
curl -X POST http://localhost:3001/api/webhook/customer-journey \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"user_123","customer_name":"John Doe","customer_email":"john@example.com","event":"purchase_made","stage":"purchase","timestamp":"2025-11-25T09:45:00.000Z","metadata":{"order_id":"order_789","value":1999}}'

# 6. View all data
curl http://localhost:3001/api/customer-journey/data
```

---

## 📋 Event Types

Valid event types:
- `stage_entered` - Customer entered a new stage
- `stage_completed` - Customer completed a stage
- `purchase_made` - Customer made a purchase
- `email_opened` - Customer opened an email
- `link_clicked` - Customer clicked a link
- `form_submitted` - Customer submitted a form

---

## 📋 Stage Types

Valid stages:
- `awareness` - Customer is aware of product
- `consideration` - Customer is considering purchase
- `purchase` - Customer made a purchase
- `retention` - Customer is retained
- `advocacy` - Customer is advocating

---

## 🔒 Webhook Signature (Optional)

For production, include webhook signature:

```bash
curl -X POST http://localhost:3001/api/webhook/customer-journey \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=your_signature_here" \
  -d '{...}'
```

**Note:** Signature verification is skipped in development mode.

---

## 🧪 Test with PowerShell (Windows)

### **Health Check:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/customer-journey/health" -Method GET
```

### **Send Event:**
```powershell
$body = @{
    customer_id = "user_123"
    customer_name = "John Doe"
    customer_email = "john@example.com"
    event = "stage_entered"
    stage = "awareness"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    metadata = @{
        source = "homepage"
        page = "/"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/webhook/customer-journey" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### **Get Data:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/customer-journey/data" -Method GET
```

---

## 🎯 Quick Copy-Paste Commands

### **Test 1: Health Check**
```bash
curl http://localhost:3001/api/customer-journey/health
```

### **Test 2: Send Event**
```bash
curl -X POST http://localhost:3001/api/webhook/customer-journey -H "Content-Type: application/json" -d '{"customer_id":"test_user","customer_name":"Test User","customer_email":"test@example.com","event":"stage_entered","stage":"awareness","timestamp":"2025-11-25T09:30:00.000Z","metadata":{"source":"test"}}'
```

### **Test 3: View Data**
```bash
curl http://localhost:3001/api/customer-journey/data
```

---

## ✅ Expected Results

After sending events, you should see:

1. **Console logs** in your terminal showing event processing
2. **Success responses** with event IDs
3. **Data endpoint** returning customer and event data
4. **PocketBase collection** `customer_journey_events` created (if PocketBase is available)

---

## 🔍 Troubleshooting

### **Error: Connection refused**
- Check if API server is running on port 3001
- Run: `npm run dev` in the root directory

### **Error: Invalid payload**
- Ensure all required fields are present:
  - `customer_id`
  - `event`
  - `stage`
  - `timestamp`

### **Error: Invalid stage/event**
- Use only valid stage/event types listed above

---

## 🎉 Success Indicators

✅ Health check returns `"status": "healthy"`  
✅ POST requests return `"success": true`  
✅ Events appear in `/data` endpoint  
✅ Console shows "Event processed successfully"  
✅ Customer data is tracked correctly  

---

## 📝 Notes

- Events are stored in-memory by default
- PocketBase storage is attempted if available
- Signature verification is disabled in development
- Timestamps must be in ISO 8601 format
- All endpoints support CORS for frontend access

---

**Ready to test!** Start with the health check, then send some events! 🚀
