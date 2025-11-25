# 🗺️ Customer Journey Trigger Node - Added!

## ✅ New Node Added

Successfully added a **Customer Journey Trigger** node to the automation system that listens to your customer journey API server and outputs journey events.

---

## 📍 Node Details

### **Type:** `trigger.journey`
### **Category:** Trigger
### **Icon:** 🗺️ (Map)
### **Color:** Green (#10B981)

---

## 🎯 What It Does

The Customer Journey node listens to events from your customer journey API and triggers automation flows based on customer behavior:

- **Page Views** - When customers view pages
- **Product Views** - When customers view products
- **Add to Cart** - When items are added to cart
- **Checkout Started** - When checkout process begins
- **Purchase Completed** - When orders are placed
- **Cart Abandoned** - When carts are left without purchase
- **Custom Milestones** - Any custom journey events
- **Any Event** - Listen to all journey events

---

## 🔧 Configuration Options

### 1. **Event Type** (Required)
- **Type:** Select dropdown
- **Default:** "Any Event"
- **Options:**
  - Page View
  - Product View
  - Add to Cart
  - Checkout Started
  - Purchase Completed
  - Cart Abandoned
  - Custom Milestone
  - Any Event

### 2. **Event Filter** (Optional)
- **Type:** Text input
- **Example:** `event.product_id="123" || event.category="electronics"`
- **Purpose:** Filter which journey events trigger the flow

### 3. **Include Customer Data** (Optional)
- **Type:** Boolean toggle
- **Default:** `true`
- **Purpose:** Fetch and include full customer profile data with the event

### 4. **Debounce (ms)** (Optional)
- **Type:** Number
- **Default:** `0`
- **Example:** `5000` (5 seconds)
- **Purpose:** Delay before triggering to prevent duplicate events

---

## 📤 Outputs

The node provides **two output ports**:

### 1. **Journey Event** (Main Output)
Contains the journey event data:
```json
{
  "event_type": "product_view",
  "product_id": "abc123",
  "category": "electronics",
  "timestamp": "2025-11-25T14:55:00Z",
  "session_id": "sess_xyz",
  "user_id": "user_123"
}
```

### 2. **Customer Data** (Secondary Output)
Contains full customer profile (if enabled):
```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "total_orders": 5,
  "lifetime_value": 1250.00
}
```

---

## 💡 Use Cases

### 1. **Abandoned Cart Recovery**
```
Journey Trigger (cart_abandon)
  → Wait 1 hour
  → Send WhatsApp reminder
```

### 2. **Product View Follow-up**
```
Journey Trigger (product_view)
  → Check if user added to cart
  → If not → Send product details via email
```

### 3. **Purchase Thank You**
```
Journey Trigger (purchase)
  → Get Order Details
  → Send WhatsApp confirmation
  → Create loyalty points
```

### 4. **Browse Behavior Tracking**
```
Journey Trigger (page_view, filter: category="premium")
  → Tag customer as "premium_browser"
  → Add to VIP segment
```

---

## 🔗 Integration with Customer Journey API

The node connects to your customer journey API endpoint:
- **Endpoint:** `/api/customer-journey` (proxied through Vite)
- **Method:** Listens for POST events
- **Real-time:** Events trigger flows immediately
- **Filtering:** Server-side filtering for efficiency

---

## 🎨 How to Use

1. **Drag the node** from the Node Palette (Trigger section)
2. **Configure event type** - Choose which events to listen for
3. **Add optional filter** - Narrow down which events trigger
4. **Enable customer data** - Get full customer profile
5. **Set debounce** - Prevent duplicate triggers
6. **Connect to actions** - Add WhatsApp, Email, or data nodes

---

## 📊 Example Flow

```
🗺️ Customer Journey (product_view)
  ↓
🔍 Get Product Details (pb.getOne)
  ↓
🔀 If Condition (price > 1000)
  ↓ TRUE
💬 Send WhatsApp (Premium product alert)
  ↓ FALSE
📧 Send Email (Product information)
```

---

## ✨ Benefits

✅ **Real-time Triggers** - Instant response to customer actions  
✅ **Rich Context** - Full customer and event data available  
✅ **Flexible Filtering** - Target specific behaviors  
✅ **Debounce Support** - Prevent spam from rapid events  
✅ **Multiple Outputs** - Separate event and customer data  
✅ **Easy Integration** - Works with existing journey tracking  

---

## 🚀 Next Steps

1. ✅ **Node is ready to use** - Refresh your automation builder
2. 📝 **Create your first journey flow** - Try abandoned cart recovery
3. 🧪 **Test with real events** - Send test journey events to your API
4. 📊 **Monitor results** - Check flow run history

---

## 📝 Technical Details

**File Modified:** `Backend/src/features/automation/nodes/nodeDefinitions.ts`

**Node Definition:**
- Added to triggers section (after `trigger.pbChange`)
- Full TypeScript type safety
- Integrated with existing node system
- Compatible with all action nodes

**Status:** ✅ **Ready to Use**

The Customer Journey node is now available in your automation builder's node palette under the "Trigger" category!
