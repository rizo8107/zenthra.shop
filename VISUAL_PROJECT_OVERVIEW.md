# 🎨 Zenthra.shop - Visual Project Overview

> **Complete Visual Guide to Features, Architecture & Component Usage**

---

## 📊 Project Summary

**Zenthra.shop** is a comprehensive full-stack e-commerce platform with:
- **Frontend**: Customer-facing store with visual page builder
- **Backend**: Admin CMS with automation workflows
- **Database**: Shared PocketBase for real-time data synchronization
- **Integrations**: Razorpay, WhatsApp, Email, Analytics

---

## 🏗️ System Architecture

### **Three-Layer Architecture**

```
┌─────────────────────────────────────────┐
│   FRONTEND (Customer Store)             │
│   Port: 5173                            │
│   Tech: React + Vite + TailwindCSS      │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│   POCKETBASE (Shared Database)          │
│   Port: 8090                            │
│   Real-time Sync + Authentication       │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│   BACKEND (Admin CMS)                   │
│   Port: 5174                            │
│   Tech: React + Flow Builder + Puck CMS │
└─────────────────────────────────────────┘
```

### **Key Architecture Features**

#### **Frontend Layer** (Port 5173)
- 🏠 **Home Page** - Dynamic content via Puck CMS
- 🛍️ **Product Catalog** - Grid/List views with filters
- 🛒 **Shopping Cart** - Real-time cart management
- 💳 **Checkout Flow** - Razorpay integration
- 📦 **Order Tracking** - Customer order management
- 📊 **Journey Tracking** - Event tracking & analytics

#### **Database Layer** (Port 8090 - PocketBase)
**Collections:**
- `products` - Product catalog with variants
- `orders` - Order management & tracking
- `users` - Customer accounts & authentication
- `carts` - Shopping cart state
- `pages` - Puck CMS page data
- `flows` - Automation workflow definitions
- `runs` - Automation execution logs
- `events` - Customer journey events
- `addresses` - Shipping addresses
- `reviews` - Product reviews

#### **Backend Layer** (Port 5174)
- 📦 **Product Management** - CRUD operations with variants
- 🛒 **Order Processing** - Status updates & fulfillment
- 📄 **Puck Page Builder** - Visual page creation
- ⚙️ **Automation Flow Builder** - n8n-style workflow creator
- 💬 **WhatsApp Campaigns** - Evolution API integration
- 📧 **Email Templates** - SMTP automation
- 📊 **Analytics Dashboard** - Business intelligence

#### **External Integrations**
- 💰 **Razorpay** - Payment gateway (test & live modes)
- 💬 **WhatsApp Business API** - Via Evolution API
- 📧 **SMTP Email** - Order confirmations & campaigns
- 📊 **Google Analytics** - User behavior tracking
- 📈 **Meta Pixel** - Facebook ads tracking
- 🗺️ **Customer Journey API** - Event tracking system

---

## 🎨 Frontend Components & Features

### **Component Hierarchy**

```
App.tsx (Root)
├── Router (React Router v6)
├── ThemeProvider (Dynamic theming)
├── AuthContext (User authentication)
└── PluginProvider (Custom plugins)
    │
    ├── Layout Components
    │   ├── Navbar (Desktop navigation)
    │   ├── MobileBrandBar (Mobile header)
    │   ├── MobileBottomNav (Mobile nav)
    │   └── Footer (Site footer)
    │
    ├── Page Components
    │   ├── Home (Puck-rendered)
    │   ├── Shop (Product listing)
    │   ├── ProductDetail (Single product)
    │   ├── Cart (Shopping cart)
    │   ├── Checkout (Payment flow)
    │   ├── Orders (Customer orders)
    │   ├── OrderTracking (Track shipment)
    │   └── Profile (User account)
    │
    ├── Auth Components
    │   ├── Login
    │   ├── Signup
    │   ├── ForgotPassword
    │   └── ResetPassword
    │
    └── Puck CMS Pages
        ├── PuckHome (Dynamic homepage)
        ├── PuckEditor (Visual editor)
        ├── PuckRenderer (Page renderer)
        └── PagesManager (Admin page list)
```

### **Key Frontend Features**

#### **1. Lazy Loading & Code Splitting**
```typescript
// Optimized imports for performance
const Shop = lazy(() => import("./pages/Shop"))
const ProductDetail = lazy(() => import("./pages/ProductDetail"))
const Cart = lazy(() => import("./pages/Cart"))
```

#### **2. Analytics Integration**
- **Google Analytics** - Page views & conversions
- **Meta Pixel** - Facebook ad tracking
- **UTM Parameters** - Campaign source tracking
- **Customer Journey** - Event-based tracking

#### **3. Route Protection**
```typescript
<PrivateRoute>
  <ProfilePage />
</PrivateRoute>
```

#### **4. Mobile-First Design**
- Responsive Navbar (hides on mobile)
- MobileBrandBar (mobile header)
- MobileBottomNav (fixed bottom navigation)
- Touch-friendly interactions

#### **5. SEO Optimization**
- Meta tags per route
- Semantic HTML
- Structured data
- Social media preview cards

---

## 📄 Puck Page Builder - Portfolio Creation

### **Visual Page Builder System**

Puck is a drag-and-drop visual editor that allows non-technical users to create custom pages without coding.

### **Component Library**

#### **Layout Components**
- **Container** - Responsive wrapper with max-width
- **Grid** - 1-6 column responsive grid
- **Spacer** - Vertical/horizontal spacing control

#### **Content Components**
- **Text** - Rich text with typography controls
- **Image** - Image with styling & effects
- **Button** - CTA buttons with variants
- **Video** - Embedded video player

#### **E-commerce Components**
- **Hero** - Full-width hero sections with CTAs
- **Product Grid** - Product showcase (2-5 columns)
- **Category Section** - Category cards with images
- **Offer Banner** - Promotional banners
- **Brand Showcase** - Partner logos display

#### **Marketing Components**
- **Feature Section** - Feature highlights with icons
- **Testimonial Section** - Customer reviews
- **Newsletter Section** - Email subscription
- **FAQ Accordion** - Collapsible Q&A
- **Stats Counter** - Animated statistics

#### **Portfolio Components** 🎯
- **Portfolio Showcase** - Masonry grid for projects
  - Grid Layouts: Masonry, Grid, List
  - Filter by tags/categories
  - Hover effects & animations
  - Lightbox integration
  - Project detail modals

### **Portfolio Creation Workflow**

1. **Access Pages Manager**
   ```
   Navigate to: /admin/pages
   Click: "New Page"
   ```

2. **Select Template**
   - Choose "Portfolio Showcase" template
   - Or start with blank page

3. **Drag Components**
   - Portfolio Showcase (main grid)
   - Hero (page header)
   - Text (introduction)
   - Newsletter (capture leads)

4. **Configure Portfolio**
   ```json
   {
     "layout": "masonry",
     "columns": 3,
     "gap": "medium",
     "cardStyle": "modern",
     "showOverlay": true,
     "animation": "fadeIn",
     "filterTags": ["Design", "Development", "Branding"]
   }
   ```

5. **Add Projects**
   - Image thumbnails
   - Project titles
   - Category tags
   - External links

6. **Publish Page**
   - Preview on desktop/tablet/mobile
   - Set page slug: `/portfolio`
   - Click "Publish"

### **Portfolio Features**
- ✅ Masonry/Grid/List layouts
- ✅ Category filtering
- ✅ Smooth animations
- ✅ Responsive design
- ✅ Lightbox gallery
- ✅ SEO optimized
- ✅ Social sharing

---

## ⚙️ Backend Automation Flow Builder

### **n8n-Style Visual Workflow System**

The automation system uses xyflow (React Flow) to create visual node-based workflows.

### **Node Types**

#### **🔔 Trigger Nodes** (Start workflows)
1. **Cron Schedule**
   ```json
   {
     "type": "trigger.cron",
     "config": { "cron": "*/30 * * * *" }
   }
   ```

2. **Webhook**
   ```json
   {
     "type": "trigger.webhook",
     "config": { "path": "/hooks/order-paid" }
   }
   ```

3. **Customer Journey**
   ```json
   {
     "type": "trigger.journey",
     "config": { "event": "product_view" }
   }
   ```

4. **PocketBase Change**
   ```json
   {
     "type": "trigger.pbChange",
     "config": {
       "collection": "orders",
       "filter": "status='paid'"
     }
   }
   ```

#### **🔀 Logic Nodes** (Control flow)
1. **If/Else Condition**
   ```json
   {
     "type": "logic.if",
     "config": { "condition": "input.total >= 499" }
   }
   ```

2. **Switch**
   ```json
   {
     "type": "logic.switch",
     "config": {
       "expr": "input.status",
       "cases": { "paid": "nodeId1", "cod": "nodeId2" }
     }
   }
   ```

3. **Map/Transform**
   ```json
   {
     "type": "logic.map",
     "config": { "template": "{{item.user.name}}" }
   }
   ```

#### **⚡ Action Nodes** (Perform tasks)
1. **WhatsApp Message** (Evolution API)
   ```json
   {
     "type": "action.whatsapp",
     "config": {
       "template": "order_confirmed",
       "to": "{{customer.phone}}"
     }
   }
   ```

2. **Send Email** (SMTP)
   ```json
   {
     "type": "action.email",
     "config": {
       "template": "order_invoice",
       "to": "{{customer.email}}"
     }
   }
   ```

3. **HTTP Request**
   ```json
   {
     "type": "action.http",
     "config": {
       "method": "POST",
       "url": "https://api.example.com/webhook"
     }
   }
   ```

4. **Database Query** (PocketBase)
   ```json
   {
     "type": "action.pb.query",
     "config": {
       "collection": "orders",
       "action": "update",
       "filter": "id='{{orderId}}'"
     }
   }
   ```

5. **Delay**
   ```json
   {
     "type": "action.delay",
     "config": { "ms": 21600000 }
   }
   ```

6. **Razorpay Verify**
   ```json
   {
     "type": "action.razorpay.verify",
     "config": { "signature": "{{webhook.signature}}" }
   }
   ```

### **Example Workflows**

#### **1. Order Confirmation Flow**
```
┌──────────────────┐
│ 🔔 Trigger       │
│ Order Paid       │ (Razorpay webhook)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 🔐 Verify        │
│ Payment          │ (Razorpay signature)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 💾 Update DB     │
│ Order Status     │ (Set to 'confirmed')
└────────┬─────────┘
         │
         ├──────────┬──────────┐
         ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │ 💬 WA  │ │ 📧 Email│ │ 🗺️ Track│
    │ Confirm│ │ Invoice│ │ Journey│
    └────────┘ └────────┘ └────────┘
```

#### **2. Abandoned Cart Recovery**
```
┌──────────────────┐
│ ⏰ Cron          │
│ Every 30 min     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 🔍 Find Carts    │
│ Updated < 30m    │ (PocketBase query)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ❓ If Has Phone  │
│ Check contact    │
└────────┬─────────┘
         │
         ├──True───┬──False──┐
         ▼          ▼         ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │ 💬 WA  │ │ ⏱️ Delay│ │ 📧 Email│
    │ Remind1│ │ 6 hours│ │ Remind │
    └───┬────┘ └───┬────┘ └────────┘
        │          │
        └─────┬────┘
              ▼
         ┌────────┐
         │ 💬 WA  │
         │ Remind2│
         └────────┘
```

#### **3. Customer Journey Automation**
```
┌──────────────────┐
│ 🗺️ Journey       │
│ Product View     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ⏱️ Delay         │
│ 2 hours          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ❓ Check Cart    │
│ Item added?      │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ No      │ Yes
    ▼         ▼
┌────────┐ ┌────────┐
│ 💬 WA  │ │ ✅ End │
│ Nudge  │ │        │
└────────┘ └────────┘
```

### **Flow Execution System**

#### **PocketBase Collections**
```javascript
// flows - Workflow definitions
{
  id: "flow_123",
  name: "Order Confirmation",
  status: "active", // draft|active|archived
  canvas_json: { nodes: [], edges: [] },
  version: 1
}

// runs - Execution history
{
  id: "run_456",
  flow_id: "flow_123",
  status: "success", // queued|running|success|failed
  input_event: { orderId: "ORD-789" },
  test_mode: false,
  started_at: "2025-12-06T10:00:00Z",
  finished_at: "2025-12-06T10:00:05Z"
}

// run_steps - Step-by-step logs
{
  id: "step_789",
  run_id: "run_456",
  node_id: "wa1",
  node_type: "action.whatsapp",
  status: "success",
  input: { phone: "+919876543210" },
  output: { messageId: "msg_123" },
  retries: 0
}
```

### **Flow Activation**
```typescript
// Toggle flow status
const handleToggleStatus = async () => {
  const newStatus = flow.status === 'active' ? 'draft' : 'active';
  await updateFlow(flow.id, { status: newStatus });
};
```

**Status Behavior:**
- **Draft**: Flow saved but not executing
- **Active**: Flow live and monitoring triggers
- **Archived**: Flow disabled and hidden

---

## 🗺️ Customer Journey Tracking

### **Event Types**

#### **1. Discovery Events**
```javascript
trackJourneyPageView('/') // Landing page
trackJourneyPageView('/shop') // Catalog
```

#### **2. Engagement Events**
```javascript
trackProductView(productId) // Product detail view
trackAddToCart(product, quantity) // Add to cart
trackRemoveFromCart(productId) // Remove from cart
```

#### **3. Conversion Events**
```javascript
trackPurchase(order) // Order completed
trackCheckoutStarted(cartTotal) // Checkout initiated
```

#### **4. Post-Purchase Events**
```javascript
trackOrderShipped(orderId) // Shipping update
trackOrderDelivered(orderId) // Delivery confirmation
```

### **Journey Data Structure**
```javascript
{
  event_name: "product_view",
  user_id: "user_123",
  session_id: "session_456",
  timestamp: "2025-12-06T10:15:00Z",
  properties: {
    product_id: "prod_789",
    product_name: "Canvas Tote Bag",
    category: "Bags",
    price: 1999,
    color: "blue"
  },
  utm_params: {
    source: "google",
    medium: "cpc",
    campaign: "summer_sale"
  },
  device: {
    type: "mobile",
    os: "Android",
    browser: "Chrome"
  }
}
```

### **Journey Analytics**

#### **Conversion Funnel**
```
Page View (1000) → 100%
  ↓ 60%
Product View (600) → 60%
  ↓ 40%
Add to Cart (240) → 24%
  ↓ 50%
Checkout (120) → 12%
  ↓ 75%
Purchase (90) → 9%
```

#### **Session Insights**
- Average time to purchase
- Products viewed per session
- Cart abandonment rate
- Top exit pages
- Revenue per session

---

## 🎯 Component Usage Examples

### **Frontend: Product Detail Page**

```typescript
// ProductDetail.tsx
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { trackProductView } from '@/utils/journeyTracking';

export default function ProductDetail() {
  const { id } = useParams();
  
  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id)
  });
  
  useEffect(() => {
    if (product) {
      trackProductView(product.id);
    }
  }, [product]);
  
  return (
    <div>
      <ProductImages images={product.images} />
      <ProductInfo product={product} />
      <AddToCartButton product={product} />
      <ProductReviews productId={product.id} />
    </div>
  );
}
```

### **Backend: Order List Component**

```typescript
// OrderList.tsx
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

export default function OrderList() {
  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders
  });
  
  return (
    <div>
      {orders.map(order => (
        <OrderCard key={order.id}>
          <OrderNumber>{order.number}</OrderNumber>
          <CustomerName>{order.customer.name}</CustomerName>
          <OrderTotal>₹{order.total}</OrderTotal>
          <StatusBadge status={order.status}>
            {order.status}
          </StatusBadge>
        </OrderCard>
      ))}
    </div>
  );
}
```

### **Puck: Portfolio Component**

```typescript
// PortfolioShowcase.tsx
import { ComponentConfig } from "@measured/puck";

export const PortfolioShowcase: ComponentConfig<Props> = {
  fields: {
    layout: {
      type: "select",
      options: [
        { label: "Masonry", value: "masonry" },
        { label: "Grid", value: "grid" },
        { label: "List", value: "list" }
      ]
    },
    columns: { type: "number", min: 1, max: 6 },
    projects: {
      type: "array",
      arrayFields: {
        image: { type: "text" },
        title: { type: "text" },
        category: { type: "text" },
        link: { type: "text" }
      }
    }
  },
  
  render: ({ layout, columns, projects }) => (
    <div className={`portfolio-${layout}`}>
      {projects.map((project, i) => (
        <ProjectCard key={i} {...project} />
      ))}
    </div>
  )
};
```

---

## 🚀 Quick Start Guide

### **1. Installation**
```bash
# Clone repository
git clone https://github.com/yourname/zenthra.shop

# Install dependencies
npm run install:all

# Setup environment
cp .env.example .env
# Edit .env with your credentials
```

### **2. Database Setup**
```bash
# Download PocketBase
# Place in PocketBase/ folder

# Start PocketBase
cd PocketBase
./pocketbase serve

# Initialize collections
cd Frontend
npm run init:pocketbase
```

### **3. Run Development**
```bash
# Terminal 1: PocketBase
cd PocketBase && ./pocketbase serve

# Terminal 2: Frontend + Backend
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5174
- PocketBase: http://localhost:8090/_/

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| `README.md` | Project overview & setup |
| `PROJECT-SUMMARY.md` | Detailed architecture guide |
| `QUICKSTART.md` | 5-minute setup guide |
| `PUCK_SETUP.md` | Page builder documentation |
| `flow builder.md` | Automation system guide |
| `JOURNEY_TRACKING_GUIDE.md` | Customer journey docs |
| `PRODUCT-VARIANTS-GUIDE.md` | Product management |

---

## 🎨 Visual Resources

### **Generated Diagrams**
1. ✅ **Architecture Overview** - System layers & integrations
2. ✅ **Puck Portfolio Builder** - Page builder UI
3. ✅ **Automation Flow Builder** - Workflow visualization

### **Additional Visuals Needed** (quota exhausted - create manually)
- [ ] Frontend Component Hierarchy
- [ ] Backend CMS Dashboard
- [ ] Customer Journey Funnel

---

## 🔧 Technology Stack

### **Frontend**
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router v6
- TanStack Query
- Shadcn UI
- Puck CMS

### **Backend**
- React 18
- TypeScript
- Vite
- React Flow (xyflow)
- PocketBase SDK
- Node.js server

### **Database**
- PocketBase
- Real-time subscriptions
- File storage
- Authentication

### **Integrations**
- Razorpay SDK
- Evolution API (WhatsApp)
- Nodemailer (Email)
- Google Analytics
- Meta Pixel

---

## 📊 Key Metrics & KPIs

### **E-commerce Metrics**
- Total Revenue
- Orders (Today, Week, Month)
- Average Order Value (AOV)
- Conversion Rate
- Cart Abandonment Rate

### **Automation Metrics**
- Active Flows
- Total Executions
- Success Rate
- Failed Runs
- Average Execution Time

### **Customer Journey Metrics**
- Session Duration
- Pages per Session
- Bounce Rate
- Funnel Drop-off Points
- Return Customer Rate

---

## 🎯 Future Enhancements

### **Planned Features**
- [ ] AI-powered product recommendations
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Inventory management
- [ ] Supplier integration
- [ ] Loyalty program
- [ ] Subscription products
- [ ] Live chat support

### **Automation Enhancements**
- [ ] A/B testing flows
- [ ] AI trigger conditions
- [ ] Parallel execution
- [ ] Flow templates marketplace
- [ ] Version control
- [ ] Flow debugging tools

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

- **Documentation**: See docs in root directory
- **Issues**: GitHub Issues
- **Email**: support@zenthra.shop
- **Discord**: Join our community

---

**Built with ❤️ by the Zenthra Team**
