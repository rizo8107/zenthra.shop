# 📊 Zenthra.shop - Features & Visual Summary

> **Quick Visual Overview of All Major Features & Components**

---

## 🎯 Project Overview

**Zenthra.shop** is a full-stack e-commerce platform with advanced features:
- 🛍️ **Customer Store** - Modern shopping experience
- 🎨 **Visual Page Builder** - Puck CMS for custom pages
- ⚙️ **Automation System** - n8n-style workflow builder
- 📊 **Analytics** - Customer journey tracking
- 💬 **Marketing Automation** - WhatsApp & Email campaigns

---

## 📐 Architecture Diagrams

### **1. System Architecture Overview**

![Zenthra Architecture](./artifacts/zenthra_architecture_overview.png)

**Three-Layer System:**

```
┌─────────────────────────────────────────────────┐
│          FRONTEND (Customer Store)              │
│                Port: 5173                       │
├─────────────────────────────────────────────────┤
│ • Product Catalog      • Shopping Cart          │
│ • Checkout Flow        • Order Tracking         │
│ • User Accounts        • Reviews & Ratings      │
│ • Journey Tracking     • Dynamic Pages (Puck)   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│       POCKETBASE (Shared Database)              │
│                Port: 8090                       │
├─────────────────────────────────────────────────┤
│ Collections:                                    │
│ • products        • orders        • users       │
│ • carts           • pages         • flows       │
│ • runs            • events        • reviews     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│        BACKEND CMS (Admin Panel)                │
│                Port: 5174                       │
├─────────────────────────────────────────────────┤
│ • Product Management    • Order Processing      │
│ • Puck Page Builder     • Automation Flows      │
│ • WhatsApp Campaigns    • Email Marketing       │
│ • Customer Analytics    • Journey Insights      │
└─────────────────────────────────────────────────┘
```

**External Integrations:**
- 💳 **Razorpay** - Payment processing
- 💬 **WhatsApp** - Customer messaging (Evolution API)
- 📧 **Email** - SMTP notifications
- 📊 **Analytics** - Google Analytics, Meta Pixel

---

## 🎨 Visual Page Builder (Puck CMS)

### **2. Portfolio Creation Interface**

![Puck Portfolio Builder](./artifacts/puck_portfolio_builder.png)

**Three-Panel Interface:**

```
┌──────────┬─────────────────────────────┬──────────────┐
│          │                             │              │
│  COMPO-  │      VISUAL CANVAS          │  PROPER-     │
│  NENTS   │                             │  TIES        │
│          │  [Drag & Drop Here]         │              │
│  Hero    │                             │  Layout:     │
│  Product │  ┌──────┬──────┬──────┐    │  Masonry ▼   │
│  Gallery │  │ Proj │ Proj │ Proj │    │              │
│  Text    │  │  1   │  2   │  3   │    │  Columns: 3  │
│  Button  │  ├──────┼──────┼──────┤    │              │
│ ►Portfolio│  │ Proj │ Proj │ Proj │    │  Gap: Med ▼  │
│  Contain │  │  4   │  5   │  6   │    │              │
│  Categry │  └──────┴──────┴──────┘    │  Style:      │
│  News    │                             │  Modern ▼    │
│          │  Hover for Edit             │              │
│          │                             │  Animate:    │
│          │                             │  Fade In ▼   │
└──────────┴─────────────────────────────┴──────────────┘
```

**Available Components:**
- 📐 **Layout**: Container, Grid, Spacer
- 📝 **Content**: Text, Image, Button, Video
- 🛍️ **E-commerce**: Product Grid, Category, Offers
- 🎨 **Portfolio**: Project Showcase (Masonry/Grid/List)
- 📧 **Marketing**: Newsletter, Testimonials, Features

---

## ⚙️ Automation Flow Builder

### **3. Workflow Builder Interface**

![Automation Flow Builder](./artifacts/automation_flow_builder.png)

**Node-Based Workflow (Order Confirmation Example):**

```
[START]
   ↓
┌─────────────────┐
│ ⚡ TRIGGER      │
│ Order Paid      │ ← Razorpay webhook
│ (webhook)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 🔐 VERIFY       │
│ Payment         │ ← Signature check
│ (razorpay)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 💾 UPDATE DB    │
│ Set: confirmed  │ ← PocketBase query
│ (database)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│💬 WA   │ │📧 Email│
│Message │ │Invoice │
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────┐
│ 🗺️ TRACK       │
│ Journey Event   │
│ (analytics)     │
└─────────────────┘
         │
         ▼
      [END]
```

**Node Categories:**

1. **Triggers** (Start workflows)
   - ⏰ Cron Schedule
   - 🔔 Webhook
   - 🗺️ Customer Journey
   - 💾 Database Change

2. **Logic** (Control flow)
   - ❓ If/Else Condition
   - 🔀 Switch/Case
   - 🔄 Loop
   - 🗺️ Map/Transform

3. **Actions** (Perform tasks)
   - 💬 WhatsApp Message
   - 📧 Send Email
   - 🌐 HTTP Request
   - 💾 Database Query
   - ⏱️ Delay
   - 🔐 Verify Payment

---

## 🗺️ Customer Journey Tracking

### **Visual Journey Flow**

```
DISCOVERY → BROWSE → ENGAGE → CONVERT → POST-PURCHASE

┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ 🌐 Land  │ → │ 🔍 View  │ → │ 🛒 Add   │ → │ 💳 Pay   │ → │ ✅ Track │
│ Page     │   │ Products │   │ to Cart  │   │ Checkout │   │ Order    │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
    │              │              │              │              │
    ▼              ▼              ▼              ▼              ▼
 page_view    product_view    add_to_cart     purchase    order_shipped

Automation Triggers:
                                   ↓              ↓              ↓
                              Cart Email    Confirm WA     Review Email
                              (30m delay)   (instant)      (7d delay)
```

**Tracked Events:**
- 🌐 **Discovery**: Page views, UTM tracking, referrer
- 🔍 **Browse**: Product views, search queries, filters
- 🛒 **Engage**: Add/remove cart, wishlist, compare
- 💳 **Convert**: Checkout start, payment, order complete
- ✅ **Post**: Shipping updates, delivery, reviews

**Analytics Data:**
```javascript
{
  session_id: "sess_123",
  user_id: "user_456",
  events: [
    {
      name: "page_view",
      timestamp: "2025-12-06T10:00:00Z",
      page: "/",
      utm_source: "google",
      utm_campaign: "winter_sale"
    },
    {
      name: "product_view",
      timestamp: "2025-12-06T10:02:00Z",
      product_id: "prod_789",
      product_name: "Canvas Tote Bag",
      category: "Bags",
      price: 1999
    },
    {
      name: "add_to_cart",
      timestamp: "2025-12-06T10:05:00Z",
      product_id: "prod_789",
      quantity: 2,
      variant: "Blue",
      cart_value: 3998
    },
    {
      name: "purchase",
      timestamp: "2025-12-06T10:15:00Z",
      order_id: "ORD-5678",
      total: 3998,
      payment_method: "razorpay",
      items_count: 2
    }
  ],
  conversion_funnel: {
    page_view: 1,
    product_view: 1,
    add_to_cart: 1,
    checkout: 1,
    purchase: 1,
    conversion_rate: 100
  }
}
```

---

## 📦 Frontend Component Structure

### **Component Hierarchy**

```
App.tsx (Root)
│
├── Providers
│   ├── BrowserRouter
│   ├── DynamicThemeProvider
│   ├── PluginProvider
│   ├── AuthContext
│   └── TooltipProvider
│
├── Layout Components
│   ├── Navbar (Desktop)
│   │   ├── Logo
│   │   ├── Navigation Links
│   │   ├── Search Bar
│   │   ├── Cart Icon
│   │   └── User Menu
│   │
│   ├── MobileBrandBar
│   │   ├── Logo
│   │   ├── Menu Toggle
│   │   └── Cart Icon
│   │
│   ├── MobileBottomNav
│   │   ├── Home
│   │   ├── Shop
│   │   ├── Cart
│   │   └── Profile
│   │
│   └── Footer
│       ├── Links
│       ├── Social Media
│       └── Newsletter
│
└── Page Routes
    ├── Public Routes
    │   ├── / (Home - Puck rendered)
    │   ├── /shop (Product catalog)
    │   ├── /product/:id (Detail)
    │   ├── /cart (Shopping cart)
    │   ├── /checkout (Payment)
    │   ├── /page/:slug (Puck pages)
    │   └── /auth/* (Login/Signup)
    │
    ├── Protected Routes
    │   ├── /profile (User account)
    │   ├── /orders (Order history)
    │   └── /orders/:id (Detail)
    │
    └── Admin Routes
        ├── /admin/pages (Manager)
        ├── /admin/pages/:id/edit (Editor)
        ├── /admin/plugins (Plugins)
        └── /admin/themes (Theming)
```

---

## 🛍️ E-commerce Features

### **Product Management**

**Variants System:**
```javascript
{
  product: {
    id: "prod_123",
    name: "Canvas Tote Bag",
    base_price: 1999,
    
    variants: [
      {
        id: "var_1",
        color: "Blue",
        size: "Medium",
        sku: "TOTE-BLU-M",
        price: 1999,
        stock: 45,
        images: ["blue-1.jpg", "blue-2.jpg"]
      },
      {
        id: "var_2",
        color: "Red",
        size: "Large",
        sku: "TOTE-RED-L",
        price: 2199,
        stock: 23,
        images: ["red-1.jpg", "red-2.jpg"]
      }
    ],
    
    attributes: {
      colors: [
        { name: "Blue", value: "blue", hex: "#2563EB" },
        { name: "Red", value: "red", hex: "#DC2626" }
      ],
      sizes: ["Small", "Medium", "Large"]
    }
  }
}
```

**Shopping Cart:**
```javascript
{
  cart: {
    id: "cart_456",
    user_id: "user_789",
    items: [
      {
        product_id: "prod_123",
        variant_id: "var_1",
        quantity: 2,
        price: 1999,
        subtotal: 3998
      }
    ],
    subtotal: 3998,
    discount: 400,
    shipping: 0,
    tax: 720,
    total: 4318,
    coupon: "SAVE10"
  }
}
```

**Order Processing:**
```javascript
{
  order: {
    id: "ORD-5678",
    number: "#5678",
    status: "confirmed", // pending|confirmed|shipped|delivered|cancelled
    
    customer: {
      id: "user_789",
      name: "John Doe",
      email: "john@example.com",
      phone: "+919876543210"
    },
    
    items: [...],
    
    shipping_address: {
      line1: "123 Main St",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      country: "India"
    },
    
    payment: {
      method: "razorpay",
      gateway_order_id: "order_abc123",
      gateway_payment_id: "pay_xyz789",
      amount: 4318,
      status: "captured"
    },
    
    timeline: [
      { status: "pending", timestamp: "2025-12-06T10:15:00Z" },
      { status: "confirmed", timestamp: "2025-12-06T10:15:30Z" },
      { status: "shipped", timestamp: "2025-12-07T14:00:00Z" }
    ]
  }
}
```

---

## 💬 Marketing Automation

### **WhatsApp Campaigns**

**Integration:** Evolution API

**Message Templates:**
```javascript
{
  templates: {
    order_confirmed: {
      name: "Order Confirmation",
      language: "en",
      category: "TRANSACTIONAL",
      components: [
        {
          type: "HEADER",
          format: "TEXT",
          text: "Order Confirmed! 🎉"
        },
        {
          type: "BODY",
          text: "Hi {{1}},\n\nYour order {{2}} has been confirmed!\n\nTotal: ₹{{3}}\n\nTracking: {{4}}"
        },
        {
          type: "FOOTER",
          text: "Thank you for shopping with us!"
        },
        {
          type: "BUTTONS",
          buttons: [
            { type: "URL", text: "Track Order", url: "{{5}}" }
          ]
        }
      ]
    },
    
    cart_reminder: {
      name: "Cart Reminder",
      language: "en",
      category: "MARKETING",
      components: [
        {
          type: "BODY",
          text: "Hi {{1}},\n\nYou left {{2}} items in your cart worth ₹{{3}}.\n\nComplete your order now and get 10% off!"
        }
      ]
    }
  }
}
```

**Automation Flow:**
```
Trigger: Order Paid
  ↓
Action: Send WhatsApp
  Template: order_confirmed
  Variables:
    - customer_name
    - order_number
    - total_amount
    - tracking_link
  Retry: 3 attempts
  Delay: 5s between retries
```

### **Email Campaigns**

**SMTP Configuration:**
```javascript
{
  smtp: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "noreply@zenthra.shop",
      pass: process.env.EMAIL_PASSWORD
    }
  }
}
```

**Email Templates:**
```html
<!-- Order Confirmation Email -->
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Responsive email styles */
  </style>
</head>
<body>
  <div class="container">
    <h1>Order Confirmed!</h1>
    <p>Hi {{customer_name}},</p>
    <p>Your order <strong>{{order_number}}</strong> has been confirmed.</p>
    
    <table class="order-items">
      {{#each items}}
      <tr>
        <td>{{name}}</td>
        <td>{{quantity}}</td>
        <td>₹{{price}}</td>
      </tr>
      {{/each}}
    </table>
    
    <p class="total">Total: ₹{{total}}</p>
    
    <a href="{{tracking_url}}" class="button">Track Order</a>
  </div>
</body>
</html>
```

---

## 📊 Analytics & Insights

### **Dashboard Metrics**

```
┌─────────────────────────────────────────────────┐
│                 KEY METRICS                     │
├──────────────┬──────────────┬──────────────────┤
│ 📈 Revenue   │ 🛍️ Orders   │ 👥 Customers    │
│ ₹45,230      │ 127          │ 1,543           │
│ +12.5% ↗     │ +8.2% ↗      │ +15.3% ↗        │
├──────────────┴──────────────┴──────────────────┤
│                                                 │
│ Recent Orders:                                  │
│ ┌─────────┬───────────┬─────────┬──────────┐   │
│ │ #5678   │ John Doe  │ ₹4,318  │ Confirmed│   │
│ │ #5677   │ Jane Smith│ ₹2,199  │ Shipped  │   │
│ │ #5676   │ Bob Wilson│ ₹1,999  │ Delivered│   │
│ └─────────┴───────────┴─────────┴──────────┘   │
│                                                 │
│ Active Automations:                             │
│ ✓ Order Confirmation (127 runs today)          │
│ ✓ Cart Abandonment (23 runs today)             │
│ ⏸️ Review Request (Paused)                      │
│                                                 │
│ Customer Journey Funnel:                        │
│ Page View (1000) ──────────► 100%              │
│   Product View (600) ─────► 60%                │
│     Add to Cart (240) ───► 24%                 │
│       Checkout (120) ───► 12%                  │
│         Purchase (90) ─► 9%                    │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Technology Stack

### **Frontend**
- ⚛️ **React 18** - UI library
- 📘 **TypeScript** - Type safety
- ⚡ **Vite** - Build tool
- 🎨 **TailwindCSS** - Styling
- 🔀 **React Router v6** - Routing
- 🔄 **TanStack Query** - Data fetching
- 🎭 **Shadcn UI** - Component library
- 📄 **Puck CMS** - Page builder

### **Backend**
- ⚛️ **React 18** - Admin UI
- 📘 **TypeScript** - Type safety
- 🌊 **React Flow** - Workflow builder
- 💾 **PocketBase SDK** - Database client
- 🖥️ **Node.js** - Server runtime

### **Database**
- 💾 **PocketBase** - Backend as a Service
- 🔄 **Real-time subscriptions**
- 📁 **File storage**
- 🔐 **Built-in authentication**

### **Integrations**
- 💳 **Razorpay** - Payments
- 💬 **Evolution API** - WhatsApp
- 📧 **Nodemailer** - Email
- 📊 **Google Analytics** - Tracking
- 📈 **Meta Pixel** - Ads

---

## 📚 Documentation Index

### **Setup & Installation**
- 📖 [README.md](./README.md) - Project overview
- 🚀 [QUICKSTART.md](./QUICKSTART.md) - 5-minute setup
- ⚙️ [SETUP.md](./SETUP.md) - Detailed installation
- 🌍 [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Environment config

### **Features**
- 🎨 [VISUAL_PROJECT_OVERVIEW.md](./VISUAL_PROJECT_OVERVIEW.md) - This document
- 🖼️ [PORTFOLIO_CREATION_GUIDE.md](./PORTFOLIO_CREATION_GUIDE.md) - Portfolio pages
- 📄 [PUCK_SETUP.md](./Frontend/PUCK_SETUP.md) - Page builder
- ⚙️ [flow builder.md](./flow%20builder.md) - Automation system
- 🗺️ [JOURNEY_TRACKING_GUIDE.md](./JOURNEY_TRACKING_GUIDE.md) - Analytics

### **Admin Guides**
- 📦 [PRODUCT-VARIANTS-GUIDE.md](./PRODUCT-VARIANTS-GUIDE.md) - Product management
- 🛒 [CHECKOUT_FLOW_GUIDE.md](./CHECKOUT_FLOW_GUIDE.md) - Checkout process
- 💳 [RAZORPAY_SETUP.md](./Frontend/RAZORPAY_SETUP.md) - Payment gateway

### **Deployment**
- 🚢 [DEPLOYMENT_v1.md](./DEPLOYMENT_v1.md) - Production deploy
- 🐳 [Docker](./docker-compose.yml) - Docker setup

---

## 🎯 Quick Links

### **Local Development**
- 🏠 Frontend: http://localhost:5173
- 🔧 Backend: http://localhost:5174
- 💾 PocketBase: http://localhost:8090/_/

### **Key Admin Pages**
- 📦 Products: `/admin/products`
- 🛒 Orders: `/admin/orders`
- 📄 Pages: `/admin/pages`
- ⚙️ Automations: `/admin/automations`
- 🎨 Themes: `/admin/themes`

### **Customer Pages**
- 🏠 Home: `/`
- 🛍️ Shop: `/shop`
- 🛒 Cart: `/cart`
- 💳 Checkout: `/checkout`
- 📦 Orders: `/orders`

---

## 🎉 Summary

**Zenthra.shop** provides:

✅ **Complete E-commerce Platform**
- Product catalog with variants
- Shopping cart & checkout
- Order management & tracking
- Customer accounts & authentication

✅ **Visual Page Builder**
- Drag-and-drop interface
- Pre-built components
- Portfolio showcase feature
- SEO optimization

✅ **Marketing Automation**
- n8n-style workflow builder
- WhatsApp & Email campaigns
- Customer journey tracking
- Analytics & insights

✅ **Modern Tech Stack**
- React + TypeScript
- PocketBase database
- Real-time updates
- Mobile responsive

---

**Need Help?**
- 📧 Email: support@zenthra.shop
- 💬 Discord: [Join Community](#)
- 📖 Docs: Browse guides above

**Happy Building! 🚀**
