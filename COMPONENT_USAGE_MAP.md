# 🗺️ Component Usage Map - Zenthra.shop

> **Detailed map of all components, their usage, and interconnections**

---

## 📋 Table of Contents

1. [Frontend Components](#frontend-components)
2. [Backend Components](#backend-components)
3. [Shared Components](#shared-components)
4. [Puck CMS Components](#puck-cms-components)
5. [Data Flow & Props](#data-flow--props)
6. [Integration Points](#integration-points)

---

## 🎨 Frontend Components

### **Directory Structure**
```
Frontend/src/
├── components/        # Reusable UI components
├── pages/            # Page-level components
├── puck/             # Puck CMS components
├── contexts/         # React contexts
├── hooks/            # Custom hooks
└── lib/              # Utilities & helpers
```

---

### **Navigation Components**

#### **Navbar.tsx**
```typescript
// Desktop navigation header
Location: src/components/Navbar.tsx
Used in: routes.tsx (conditionally on desktop)

Props: None (uses hooks internally)

Features:
- Logo/Brand
- Navigation menu (Shop, About, Contact)
- Search bar
- Cart icon with badge
- User menu (Login/Profile)
- Mobile menu toggle

Dependencies:
- useAuth() - Authentication state
- useCart() - Cart item count
- SearchBar component
- CartIcon component
- UserMenu component

State Management:
- isMenuOpen: boolean
- searchQuery: string

Example Usage:
<Navbar />
```

#### **MobileBrandBar.tsx**
```typescript
// Mobile-only header
Location: src/components/MobileBrandBar.tsx
Used in: routes.tsx (mobile screens only)

Props: None

Features:
- Compact logo
- Menu toggle button
- Cart icon

CSS Classes:
- md:hidden (show only on mobile)
- sticky top-0 (fixed position)

Example Usage:
<MobileBrandBar />
```

#### **MobileBottomNav.tsx**
```typescript
// Fixed bottom mobile navigation
Location: src/components/MobileBottomNav.tsx
Used in: routes.tsx (mobile screens only)

Props: None

Features:
- Home icon
- Shop icon
- Cart icon (with badge)
- Profile icon

Active state: Highlights current route

Example Usage:
<MobileBottomNav />
```

#### **Footer.tsx**
```typescript
// Site footer
Location: src/components/Footer.tsx
Used in: routes.tsx (all pages except admin)

Props: None

Sections:
- About links
- Customer service
- Policies
- Social media
- Newsletter signup

Example Usage:
<Footer />
```

---

### **E-commerce Components**

#### **ProductCard.tsx**
```typescript
// Product display card
Location: src/components/ProductCard.tsx
Used in: Shop.tsx, ProductGrid.tsx, Bestsellers.tsx

Props:
interface ProductCardProps {
  product: Product;
  layout?: 'grid' | 'list';
  showQuickAdd?: boolean;
}

Features:
- Product image with hover zoom
- Title & price
- Rating stars
- Category badge
- Add to cart button
- Quick view button
- Variant selector (colors)

State:
- selectedVariant: string
- isHovered: boolean

Example Usage:
<ProductCard 
  product={product}
  layout="grid"
  showQuickAdd={true}
/>
```

#### **ProductImages.tsx**
```typescript
// Product image gallery
Location: src/components/ProductImages.tsx
Used in: ProductDetail.tsx

Props:
interface ProductImagesProps {
  images: string[];
  productName: string;
  variant?: string;
}

Features:
- Main image display
- Thumbnail navigation
- Zoom on click
- Swipe on mobile
- Variant image switching

Example Usage:
<ProductImages 
  images={product.images}
  productName={product.name}
  variant={selectedVariant}
/>
```

#### **AddToCartButton.tsx**
```typescript
// Add to cart action
Location: src/components/AddToCartButton.tsx
Used in: ProductCard.tsx, ProductDetail.tsx

Props:
interface AddToCartProps {
  product: Product;
  variant?: ProductVariant;
  quantity?: number;
  onSuccess?: () => void;
}

Features:
- Click to add item
- Loading state
- Success animation
- Error handling
- Quantity selector integration

Mutations:
- useAddToCart() - TanStack Query mutation

Example Usage:
<AddToCartButton 
  product={product}
  variant={selectedVariant}
  quantity={quantity}
  onSuccess={() => toast.success('Added to cart!')}
/>
```

#### **CartSidebar.tsx**
```typescript
// Slide-in cart preview
Location: src/components/CartSidebar.tsx
Used in: App-wide (triggered by cart icon)

Props:
interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

Features:
- Cart items list
- Quantity adjust
- Remove items
- Subtotal display
- Checkout button
- Continue shopping

State:
- cart items from useCart()

Example Usage:
<CartSidebar 
  isOpen={isCartOpen}
  onClose={() => setIsCartOpen(false)}
/>
```

#### **VariantSelector.tsx**
```typescript
// Product variant picker
Location: src/components/VariantSelector.tsx
Used in: ProductDetail.tsx

Props:
interface VariantSelectorProps {
  variants: ProductVariant[];
  attributes: ProductAttributes;
  onSelect: (variant: ProductVariant) => void;
  selected?: ProductVariant;
}

Features:
- Color swatches
- Size buttons
- Stock indicators
- Price changes
- Disabled states for out-of-stock

Example Usage:
<VariantSelector 
  variants={product.variants}
  attributes={product.attributes}
  onSelect={setSelectedVariant}
  selected={selectedVariant}
/>
```

---

### **Page Components**

#### **Shop.tsx**
```typescript
// Main product catalog
Location: src/pages/Shop.tsx
Route: /shop

Components Used:
- ProductCard (multiple)
- FiltersSidebar
- SortDropdown
- Pagination
- LoadingSpinner

Features:
- Product grid/list view
- Category filters
- Price range filter
- Search integration
- Sort options
- Pagination

Data Fetching:
const { data: products } = useQuery({
  queryKey: ['products', filters, page],
  queryFn: () => getProducts({ filters, page })
});

State:
- filters: FilterState
- sortBy: string
- viewMode: 'grid' | 'list'
- currentPage: number
```

#### **ProductDetail.tsx**
```typescript
// Single product page
Location: src/pages/ProductDetail.tsx
Route: /product/:id

Components Used:
- ProductImages
- ProductInfo
- VariantSelector
- AddToCartButton
- ProductReviews
- RelatedProducts

Features:
- Image gallery
- Variant selection
- Add to cart
- Product description
- Specifications
- Reviews & ratings
- Related products

Data Fetching:
const { data: product } = useQuery({
  queryKey: ['product', id],
  queryFn: () => getProduct(id)
});

Analytics:
useEffect(() => {
  trackProductView(product.id);
}, [product]);
```

#### **Cart.tsx**
```typescript
// Shopping cart page
Location: src/pages/Cart.tsx
Route: /cart

Components Used:
- CartItem (multiple)
- CartSummary
- CouponInput
- EmptyCart

Features:
- Item list with images
- Quantity adjustment
- Remove items
- Apply coupon
- Subtotal calculation
- Proceed to checkout

State Management:
const { cart, updateQuantity, removeItem } = useCart();

Computed Values:
- subtotal
- discount
- shipping
- tax
- total
```

#### **Checkout.tsx**
```typescript
// Checkout & payment
Location: src/pages/Checkout.tsx
Route: /checkout

Components Used:
- CheckoutSteps
- AddressForm
- PaymentMethod
- OrderSummary
- RazorpayButton

Features:
- Multi-step form
- Address management
- Payment gateway integration
- Order review
- Apply coupon

Steps:
1. Shipping address
2. Payment method
3. Order review
4. Payment

Integration:
- Razorpay payment gateway
- PocketBase orders collection
- Order confirmation email
```

---

### **Authentication Components**

#### **LoginPage.tsx**
```typescript
// User login
Location: src/pages/auth/login.tsx
Route: /auth/login

Components Used:
- LoginForm
- SocialLogin
- ForgotPasswordLink

Features:
- Email/password login
- Remember me checkbox
- Google/Facebook login (optional)
- Forgot password link
- Signup redirect

Form Handling:
const { login, isLoading } = useAuth();

const onSubmit = async (data) => {
  await login(data.email, data.password);
  navigate(from || '/profile');
};
```

#### **SignupPage.tsx**
```typescript
// User registration
Location: src/pages/auth/signup.tsx
Route: /auth/signup

Features:
- Name, email, password fields
- Terms & conditions checkbox
- Password strength indicator
- Email verification
- Auto-login after signup
```

#### **ProfilePage.tsx**
```typescript
// User account dashboard
Location: src/pages/profile.tsx
Route: /profile (protected)

Components Used:
- ProfileHeader
- OrderHistory
- AddressList
- AccountSettings

Features:
- User info display
- Recent orders
- Saved addresses
- Account settings
- Logout button
```

---

### **Puck CMS Integration**

#### **PuckHome.tsx**
```typescript
// Dynamic homepage
Location: src/pages/PuckHome.tsx
Route: / (root)

Features:
- Renders page from PocketBase
- Loads Puck components dynamically
- SEO meta tags
- Analytics tracking

Data Flow:
1. Fetch page data: `/api/pages/home`
2. Parse Puck JSON structure
3. Render components from config
4. Apply theme styles
```

#### **PuckEditor.tsx**
```typescript
// Visual page editor
Location: src/pages/PuckEditor.tsx
Route: /admin/pages/:pageId/edit

Components Used:
- Puck (from @measured/puck)
- ComponentLibrary
- PropertiesPanel
- PreviewModes

Features:
- Drag & drop interface
- Component configuration
- Live preview
- Device preview modes
- Save/publish actions
```

#### **PagesManager.tsx**
```typescript
// Page management dashboard
Location: src/pages/PagesManager.tsx
Route: /admin/pages

Features:
- List all pages
- Create new page
- Edit existing pages
- Delete pages
- Page status toggle
- Template selection
```

---

## 🔧 Backend Components

### **Directory Structure**
```
Backend/src/
├── components/       # Admin UI components
├── pages/           # Admin pages
├── features/        # Feature modules
│   ├── automation/  # Flow builder
│   └── campaigns/   # Marketing
├── grapesjs/        # Email builder
└── puck/            # Puck config
```

---

### **Admin Dashboard Components**

#### **DashboardOverview.tsx**
```typescript
// Main dashboard
Location: src/pages/admin/Dashboard.tsx

Components Used:
- KPICards (Revenue, Orders, Customers)
- RecentOrdersList
- ActiveAutomations
- CustomerJourneyFunnel
- QuickActions

Features:
- Key metrics display
- Recent activity
- Quick action buttons
- Data visualization

Data Sources:
- Orders collection
- Products collection
- Users collection
- Runs collection (automation)
```

---

### **Order Management**

#### **OrderList.tsx**
```typescript
// Order management page
Location: src/pages/admin/OrderList.tsx

Props:
interface OrderListProps {
  status?: OrderStatus;
  searchQuery?: string;
}

Features:
- Order table with sorting
- Status filter tabs
- Search by order number/customer
- Bulk actions
- Export to CSV

Columns:
- Order number
- Customer name
- Date
- Total amount
- Status badge
- Actions (view, process, cancel)

State:
- selectedOrders: string[]
- filters: OrderFilters
- sortBy: SortOption
```

#### **OrderDetail.tsx**
```typescript
// Single order view
Location: src/pages/admin/OrderDetail.tsx
Route: /admin/orders/:orderId

Components Used:
- OrderHeader
- OrderItems
- CustomerInfo
- ShippingAddress
- PaymentInfo
- OrderTimeline
- StatusActions

Features:
- Full order details
- Status update actions
- Print invoice
- Send tracking link
- Cancel/refund options
- Order timeline view
```

---

### **Automation System**

#### **AutomationFlowBuilderPage.tsx**
```typescript
// Visual flow builder
Location: src/pages/admin/AutomationFlowBuilderPage.tsx
Route: /admin/automations/:flowId

Components Used:
- ReactFlow (canvas)
- NodeLibrary (sidebar)
- NodeConfigPanel (right panel)
- FlowToolbar (top)

Features:
- Drag & drop nodes
- Connect nodes with edges
- Configure node properties
- Test flow execution
- Activate/deactivate flow
- View execution logs

Node Types:
- Triggers (Cron, Webhook, Journey, DB Change)
- Logic (If/Else, Switch, Loop, Transform)
- Actions (WhatsApp, Email, HTTP, DB Query)

State Management:
const [nodes, setNodes] = useState<Node[]>([]);
const [edges, setEdges] = useState<Edge[]>([]);
const [selectedNode, setSelectedNode] = useState<Node | null>(null);

Save Flow:
const saveFlow = async () => {
  await pb.collection('flows').update(flowId, {
    canvas_json: { nodes, edges },
    version: flow.version + 1
  });
};
```

#### **NodeDefinitions.ts**
```typescript
// Node type definitions
Location: src/features/automation/nodes/nodeDefinitions.ts

Node Registry:
export const nodeTypes: Record<string, NodeDefinition> = {
  'trigger.cron': {
    type: 'trigger',
    label: 'Cron Schedule',
    icon: '⏰',
    color: '#10B981',
    fields: {
      cron: { type: 'text', label: 'Cron Expression' }
    },
    defaultConfig: {
      cron: '0 0 * * *'
    }
  },
  
  'trigger.webhook': {
    type: 'trigger',
    label: 'Webhook',
    icon: '🔔',
    color: '#3B82F6',
    fields: {
      path: { type: 'text', label: 'Webhook Path' },
      secret: { type: 'password', label: 'Secret Key' }
    }
  },
  
  'trigger.journey': {
    type: 'trigger',
    label: 'Customer Journey',
    icon: '🗺️',
    color: '#8B5CF6',
    fields: {
      event: {
        type: 'select',
        label: 'Event Type',
        options: [
          'page_view',
          'product_view',
          'add_to_cart',
          'purchase'
        ]
      }
    }
  },
  
  'action.whatsapp': {
    type: 'action',
    label: 'WhatsApp Message',
    icon: '💬',
    color: '#25D366',
    fields: {
      template: { type: 'select', label: 'Template' },
      to: { type: 'text', label: 'Phone Number' }
    },
    requiresConnection: 'evolution'
  },
  
  'action.email': {
    type: 'action',
    label: 'Send Email',
    icon: '📧',
    color: '#F59E0B',
    fields: {
      template: { type: 'select', label: 'Email Template' },
      to: { type: 'text', label: 'Recipient' },
      subject: { type: 'text', label: 'Subject' }
    },
    requiresConnection: 'smtp'
  },
  
  'logic.if': {
    type: 'logic',
    label: 'Conditional',
    icon: '❓',
    color: '#6366F1',
    fields: {
      condition: {
        type: 'code',
        label: 'Condition',
        language: 'javascript'
      }
    },
    outputs: ['true', 'false']
  }
};
```

#### **FlowExecutionList.tsx**
```typescript
// Execution history & logs
Location: src/pages/admin/FlowExecutionList.tsx

Features:
- List all flow runs
- Filter by status/date
- View step-by-step logs
- Re-run failed executions
- Export logs

Table Columns:
- Run ID
- Flow name
- Trigger
- Status (success/failed/running)
- Started at
- Duration
- Actions (view logs, re-run)

Drill-down:
Click row → Shows detailed step logs
- Each node execution
- Input/output data
- Error messages
- Retry attempts
```

---

### **Marketing Components**

#### **WhatsAppCampaignBuilder.tsx**
```typescript
// WhatsApp campaign creator
Location: src/pages/admin/WhatsAppCampaignBuilder.tsx

Features:
- Select template
- Define recipient list
- Schedule send time
- Preview message
- Track delivery

Integration:
- Evolution API
- Template management
- Contact segmentation
```

#### **EmailTemplateEditor.tsx**
```typescript
// Email template designer
Location: src/pages/admin/EmailTemplateEditor.tsx

Components Used:
- GrapesJS (email builder)
- TemplatePreview
- TestEmailSender

Features:
- Drag & drop email builder
- Template variables ({{customer_name}})
- Responsive preview
- Send test email
- Save templates
```

---

## 🧩 Puck CMS Components

### **Component Library**
Location: `Frontend/src/puck/config/`

#### **Layout Components**

**Container.tsx**
```typescript
export const Container: ComponentConfig<ContainerProps> = {
  fields: {
    maxWidth: {
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Full', value: 'full' }
      ]
    },
    padding: { type: 'select', options: ['none', 'sm', 'md', 'lg'] },
    background: { type: 'text', label: 'Background Color' }
  },
  
  defaultProps: {
    maxWidth: 'lg',
    padding: 'md',
    background: 'transparent'
  },
  
  render: ({ maxWidth, padding, background, puck }) => (
    <div 
      className={`container mx-auto px-${padding} max-w-${maxWidth}`}
      style={{ background }}
    >
      {puck.renderDropZone('container-content')}
    </div>
  )
};
```

**Grid.tsx**
```typescript
export const Grid: ComponentConfig<GridProps> = {
  fields: {
    columns: { type: 'number', min: 1, max: 6 },
    gap: { type: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    responsive: { type: 'radio', options: [
      { label: 'Mobile 1, Desktop 3', value: 'mobile-1-desktop-3' },
      { label: 'Mobile 2, Desktop 4', value: 'mobile-2-desktop-4' }
    ]}
  },
  
  render: ({ columns, gap, responsive, puck }) => (
    <div className={`grid grid-cols-${columns} gap-${gap}`}>
      {puck.renderDropZone('grid-items')}
    </div>
  )
};
```

#### **Content Components**

**Hero.tsx**
```typescript
export const Hero: ComponentConfig<HeroProps> = {
  fields: {
    title: { type: 'text', label: 'Title' },
    subtitle: { type: 'textarea', label: 'Subtitle' },
    backgroundImage: { type: 'text', label: 'Background Image URL' },
    ctaText: { type: 'text', label: 'CTA Button Text' },
    ctaLink: { type: 'text', label: 'CTA Link' },
    height: {
      type: 'select',
      options: ['small', 'medium', 'large', 'full']
    }
  },
  
  render: ({ title, subtitle, backgroundImage, ctaText, ctaLink, height }) => (
    <section 
      className={`hero h-screen-${height} bg-cover bg-center`}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="container mx-auto flex items-center justify-center h-full">
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-4">{title}</h1>
          <p className="text-xl mb-8">{subtitle}</p>
          <a href={ctaLink} className="btn btn-primary">
            {ctaText}
          </a>
        </div>
      </div>
    </section>
  )
};
```

#### **Portfolio Components**

**PortfolioShowcase.tsx**
```typescript
export const PortfolioShowcase: ComponentConfig<PortfolioProps> = {
  fields: {
    layout: {
      type: 'select',
      options: [
        { label: 'Masonry', value: 'masonry' },
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' }
      ]
    },
    columns: { type: 'number', min: 1, max: 6, default: 3 },
    gap: { type: 'select', options: ['small', 'medium', 'large'] },
    
    projects: {
      type: 'array',
      arrayFields: {
        image: { type: 'text', label: 'Image URL' },
        title: { type: 'text', label: 'Project Title' },
        category: { type: 'text', label: 'Category' },
        description: { type: 'textarea', label: 'Description' },
        link: { type: 'text', label: 'Project Link' }
      },
      getItemSummary: (item) => item.title || 'Untitled Project'
    },
    
    enableFilters: { type: 'radio', options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false }
    ]},
    
    filterTags: {
      type: 'array',
      arrayFields: {
        tag: { type: 'text' }
      }
    }
  },
  
  defaultProps: {
    layout: 'masonry',
    columns: 3,
    gap: 'medium',
    projects: [],
    enableFilters: true,
    filterTags: [
      { tag: 'All' },
      { tag: 'Design' },
      { tag: 'Development' }
    ]
  },
  
  render: ({ layout, columns, gap, projects, enableFilters, filterTags }) => {
    const [activeFilter, setActiveFilter] = useState('All');
    
    const filteredProjects = activeFilter === 'All'
      ? projects
      : projects.filter(p => p.category === activeFilter);
    
    return (
      <div className="portfolio-showcase">
        {enableFilters && (
          <div className="filters mb-8 flex gap-4 justify-center">
            {filterTags.map(({ tag }) => (
              <button
                key={tag}
                className={`filter-btn ${activeFilter === tag ? 'active' : ''}`}
                onClick={() => setActiveFilter(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        
        <div className={`portfolio-${layout} columns-${columns} gap-${gap}`}>
          {filteredProjects.map((project, i) => (
            <div key={i} className="portfolio-card">
              <img src={project.image} alt={project.title} />
              <div className="card-content">
                <h3>{project.title}</h3>
                <span className="category">{project.category}</span>
                <p>{project.description}</p>
                {project.link && (
                  <a href={project.link} className="view-project">
                    View Project
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
};
```

---

## 🔄 Data Flow & Props

### **Component Data Flow**

```
App.tsx
  ├── AuthContext.Provider
  │     └── value: { user, login, logout, isAuthenticated }
  │
  ├── ThemeContext.Provider
  │     └── value: { theme, setTheme, colors }
  │
  └── QueryClientProvider (TanStack Query)
        └── manages all async data fetching
        
Routes
  └── Page Component (e.g., ProductDetail)
        │
        ├── useQuery({ queryKey: ['product', id] })
        │     └── fetches product data
        │
        ├── useAuth()
        │     └── gets user context
        │
        └── Child Components
              ├── ProductImages
              │     └── props: { images, productName }
              │
              ├── VariantSelector
              │     └── props: { variants, onSelect }
              │
              └── AddToCartButton
                    └── props: { product, variant }
                    └── useAddToCart() mutation
                          └── updates cart in PocketBase
                                └── triggers refetch via React Query
```

### **Data Fetching Patterns**

**Server State (TanStack Query)**
```typescript
// Product data
const { data: product, isLoading, error } = useQuery({
  queryKey: ['product', productId],
  queryFn: () => pb.collection('products').getOne(productId)
});

// Cart data
const { data: cart } = useQuery({
  queryKey: ['cart', userId],
  queryFn: () => pb.collection('carts').getFirstListItem(`user="${userId}"`)
});

// Orders data
const { data: orders } = useQuery({
  queryKey: ['orders', userId],
  queryFn: () => pb.collection('orders').getFullList({ filter: `user="${userId}"` })
});
```

**Mutations**
```typescript
// Add to cart
const addToCart = useMutation({
  mutationFn: (item: CartItem) => {
    return pb.collection('carts').update(cartId, {
      items: [...cart.items, item]
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['cart']);
    toast.success('Added to cart!');
  }
});

// Update order status
const updateOrderStatus = useMutation({
  mutationFn: ({ orderId, status }: { orderId: string, status: string }) => {
    return pb.collection('orders').update(orderId, { status });
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['orders']);
  }
});
```

---

## 🔌 Integration Points

### **PocketBase Integration**

**Data Collections & Relations**

```
products
  ├── id: string
  ├── name: string
  ├── price: number
  ├── images: string[]
  ├── variants: Variant[]
  └── category: relation → categories

orders
  ├── id: string
  ├── user: relation → users
  ├── items: OrderItem[]
  ├── total: number
  ├── status: string
  └── shipping_address: relation → addresses

carts
  ├── id: string
  ├── user: relation → users
  └── items: CartItem[]

flows (automation)
  ├── id: string
  ├── name: string
  ├── status: 'draft' | 'active'
  ├── canvas_json: { nodes, edges }
  └── version: number

runs (execution logs)
  ├── id: string
  ├── flow_id: relation → flows
  ├── status: string
  ├── input_event: JSON
  └── output: JSON
```

### **External API Integrations**

**Razorpay**
```typescript
// Create order
const createRazorpayOrder = async (amount: number) => {
  const response = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    body: JSON.stringify({ amount })
  });
  return response.json();
};

// Verify payment
const verifyPayment = async (paymentData) => {
  const response = await fetch('/api/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
  return response.json();
};
```

**Evolution API (WhatsApp)**
```typescript
// Send message
const sendWhatsAppMessage = async (config) => {
  const response = await fetch(`${EVOLUTION_API_URL}/message`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EVOLUTION_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: config.phone,
      template: config.template,
      variables: config.variables
    })
  });
  return response.json();
};
```

**Analytics**
```typescript
// Track event
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, properties);
  }
  
  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', eventName, properties);
  }
  
  // Customer Journey API
  fetch('/api/journey/track', {
    method: 'POST',
    body: JSON.stringify({
      event: eventName,
      properties,
      timestamp: new Date().toISOString()
    })
  });
};
```

---

## 📊 Component Dependencies Graph

```
┌─────────────────────────────────────────────────┐
│                    App.tsx                      │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
   ┌────▼───┐ ┌──▼──┐ ┌────▼────┐
   │ Auth   │ │Theme│ │ Query   │
   │Context │ │ Ctx │ │ Client  │
   └────┬───┘ └──┬──┘ └────┬────┘
        │        │         │
        └────────┼─────────┘
                 │
        ┌────────▼────────┐
        │     Routes      │
        └────────┬────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
┌────▼────┐ ┌───▼───┐ ┌────▼─────┐
│ Public  │ │Private│ │  Admin   │
│ Routes  │ │Routes │ │  Routes  │
└────┬────┘ └───┬───┘ └────┬─────┘
     │          │           │
     │    ┌─────┴─────┐     │
     │    │           │     │
┌────▼────▼──┐   ┌────▼────▼──────┐
│   Pages    │   │  Admin Pages   │
├────────────┤   ├────────────────┤
│ - Home     │   │ - Dashboard    │
│ - Shop     │   │ - Orders       │
│ - Product  │   │ - Products     │
│ - Cart     │   │ - Automations  │
│ - Checkout │   │ - Pages (Puck) │
└────┬───────┘   └────┬───────────┘
     │                │
     │    ┌───────────┴───────┐
     │    │                   │
┌────▼────▼──┐        ┌──────▼──────┐
│ Components │        │   Backend   │
│            │        │  Components │
├────────────┤        ├─────────────┤
│ - Navbar   │        │ - OrderList │
│ - ProductCard│      │ - FlowBuilder│
│ - CartItem │        │ - NodeConfig│
│ - Footer   │        │ - Analytics │
└────┬───────┘        └──────┬──────┘
     │                       │
     └───────────┬───────────┘
                 │
        ┌────────▼────────┐
        │  Shared Utils   │
        ├─────────────────┤
        │ - PocketBase    │
        │ - Analytics     │
        │ - Formatting    │
        │ - Validation    │
        └─────────────────┘
```

---

## 🎯 Summary

This component map provides:

✅ **Complete component inventory** for Frontend & Backend
✅ **Usage patterns** and best practices
✅ **Data flow** understanding
✅ **Integration points** with external services
✅ **Props & state management** examples
✅ **Dependency relationships** between components

Use this guide to:
- 🔍 Find the right component for your needs
- 🔗 Understand how components connect
- 📝 Learn proper usage patterns
- 🚀 Build new features consistently

---

**Questions?** Refer to individual component files for detailed implementation!
