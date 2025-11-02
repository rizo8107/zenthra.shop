# Product Variants Management Guide

This guide explains how product variants work in the unified e-commerce system and how changes sync between Frontend and Backend CMS.

## 🎯 Overview

Product variants (colors, sizes, etc.) are stored in PocketBase and automatically sync between both applications. When you add or modify a variant in the Backend CMS, it immediately becomes available on the Frontend without any manual intervention.

## 📊 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PocketBase Database                      │
│                    (Single Source of Truth)                  │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               │                          │
    ┌──────────▼─────────┐    ┌──────────▼──────────┐
    │   Backend CMS      │    │     Frontend        │
    │  (Admin Panel)     │    │  (Customer Store)   │
    │                    │    │                     │
    │  • Add Products    │    │  • View Products    │
    │  • Edit Variants   │    │  • Select Variants  │
    │  • Update Stock    │    │  • Place Orders     │
    │  • Set Prices      │    │  • See Live Updates │
    └────────────────────┘    └─────────────────────┘
```

## 🔄 How Synchronization Works

### 1. Adding a Product Variant in Backend CMS

**Step 1: Login to Backend CMS**
```
http://localhost:5174
```

**Step 2: Navigate to Products**
- Click on "Products" in the sidebar
- Click "Add Product" or edit an existing product

**Step 3: Add Variant Information**

The product form includes a `colors` field (JSON format):

```json
[
  {
    "name": "Crimson Red",
    "value": "crimson-red",
    "hex": "#DC143C"
  },
  {
    "name": "Ocean Blue",
    "value": "ocean-blue",
    "hex": "#0077BE"
  },
  {
    "name": "Forest Green",
    "value": "forest-green",
    "hex": "#228B22"
  }
]
```

**Step 4: Save the Product**
- Click "Save" or "Update"
- Changes are immediately committed to PocketBase

### 2. Automatic Frontend Update

**What Happens Behind the Scenes:**

1. **Backend CMS** → Saves product data to PocketBase
   ```typescript
   await pb.collection('products').create({
     name: "Canvas Tote Bag",
     colors: [
       { name: "Red", value: "red", hex: "#FF0000" },
       { name: "Blue", value: "blue", hex: "#0000FF" }
     ],
     // ... other fields
   });
   ```

2. **PocketBase** → Stores the data in the database

3. **Frontend** → Fetches updated data automatically
   ```typescript
   // Frontend automatically refetches products
   const { data: products } = useQuery({
     queryKey: ['products'],
     queryFn: () => pocketbase.collection('products').getFullList()
   });
   ```

4. **Customer** → Sees new variants immediately upon page refresh or navigation

## 🛍️ Product Variant Schema

### Core Product Fields

```typescript
interface Product {
  id: string;                    // Auto-generated
  name: string;                  // Product name
  description: string;           // Product description
  price: number;                 // Base price
  original_price?: number;       // Optional: Original price for discounts
  
  // Variant-related fields
  colors: ProductColor[];        // Array of color variants
  images: string[];              // Product images
  
  // Inventory
  inStock: boolean;              // Availability
  
  // Additional details
  features: string[];            // Product features
  dimensions: string;            // Size information
  material: string;              // Material type
  care: string[];                // Care instructions
  
  // Categorization
  category: string;              // Product category
  tags: string[];                // Search tags
  
  // Marketing
  bestseller: boolean;           // Featured as bestseller
  new: boolean;                  // Mark as new arrival
  
  // Metadata
  created: string;               // Creation timestamp
  updated: string;               // Last update timestamp
}

interface ProductColor {
  name: string;      // Display name (e.g., "Crimson Red")
  value: string;     // URL-safe value (e.g., "crimson-red")
  hex: string;       // Color code (e.g., "#DC143C")
}
```

## 💡 Example: Adding a New Color Variant

### Backend CMS - Admin View

```typescript
// In the Backend CMS product form
{
  "name": "Eco-Friendly Tote Bag",
  "price": 25.99,
  "colors": [
    {
      "name": "Natural Beige",
      "value": "natural-beige",
      "hex": "#F5F5DC"
    },
    {
      "name": "Charcoal Gray",
      "value": "charcoal-gray",
      "hex": "#36454F"
    }
  ]
}
```

### Frontend - Customer View

The frontend automatically renders color options:

```jsx
// Rendered in the product detail page
<div className="color-selector">
  {product.colors.map((color) => (
    <button
      key={color.value}
      style={{ backgroundColor: color.hex }}
      title={color.name}
      onClick={() => selectColor(color.value)}
    >
      {color.name}
    </button>
  ))}
</div>
```

## 📦 Complete Workflow Example

### Scenario: Adding a New Tote Bag with Multiple Colors

**1. Admin Action (Backend CMS)**
```
1. Login to http://localhost:5174
2. Click "Products" → "Add Product"
3. Fill in details:
   - Name: "Premium Canvas Tote"
   - Description: "Durable and stylish..."
   - Price: 29.99
   - Colors: Add 3 variants (Red, Blue, Green)
   - Upload 5 product images
   - Set inStock: true
   - Mark as "new": true
4. Click "Save"
```

**2. Database Storage (PocketBase)**
```sql
-- PocketBase stores the record
INSERT INTO products (
  name, 
  description, 
  price, 
  colors, 
  images, 
  inStock, 
  new
) VALUES (
  'Premium Canvas Tote',
  'Durable and stylish...',
  29.99,
  '[{"name":"Red","value":"red","hex":"#FF0000"}...]',
  '["img1.jpg","img2.jpg",...]',
  true,
  true
);
```

**3. Frontend Display (Automatic)**
```
1. Customer visits http://localhost:5173
2. Homepage shows "New Arrivals" section
3. "Premium Canvas Tote" appears automatically
4. Product page shows all 3 color variants
5. Customer can select color and add to cart
```

**4. Order Processing**
```
1. Customer selects "Blue" variant and orders
2. Order is created in PocketBase with:
   - productId: "xyz123"
   - selectedColor: "blue"
   - quantity: 1
3. Backend CMS shows new order immediately
4. Admin can process order and update status
```

## 🔧 Advanced: Custom Variant Types

You can extend the system to support other variant types:

### Size Variants

```typescript
interface Product {
  // ... existing fields
  sizes?: ProductSize[];
}

interface ProductSize {
  name: string;      // "Small", "Medium", "Large"
  value: string;     // "sm", "md", "lg"
  stock: number;     // Available quantity
  priceModifier?: number;  // Additional price
}
```

### Material Variants

```typescript
interface Product {
  // ... existing fields
  materials?: ProductMaterial[];
}

interface ProductMaterial {
  name: string;      // "Cotton", "Canvas", "Leather"
  value: string;     // "cotton", "canvas", "leather"
  priceModifier: number;  // Price difference
}
```

## 🔍 Troubleshooting

### Issue: Variants not showing on Frontend

**Checklist:**
1. ✅ PocketBase is running
2. ✅ Both `.env` files have the same PocketBase URL
3. ✅ Colors field is valid JSON in Backend CMS
4. ✅ Product has `inStock: true`
5. ✅ Frontend page is refreshed

**Solution:**
```bash
# Check PocketBase is running
curl http://127.0.0.1:8090/api/health

# Verify product data in PocketBase
# Go to: http://127.0.0.1:8090/_/
# Collections → products → View records
```

### Issue: Colors not displaying correctly

**Check JSON Format:**
```json
// ✅ Correct
[
  {"name": "Red", "value": "red", "hex": "#FF0000"}
]

// ❌ Incorrect
[
  {"name": "Red", "value": "red"}  // Missing hex
]

// ❌ Incorrect
"Red, Blue, Green"  // Should be JSON array
```

### Issue: Changes not syncing

**Force Refresh:**
1. Clear browser cache
2. Refresh Frontend page (Ctrl+F5 or Cmd+Shift+R)
3. Check browser console for errors
4. Verify PocketBase URL in both `.env` files

## 📈 Best Practices

### 1. Consistent Naming
```typescript
// ✅ Good
{ name: "Crimson Red", value: "crimson-red", hex: "#DC143C" }

// ❌ Avoid
{ name: "Red!", value: "RED", hex: "red" }
```

### 2. Valid Hex Colors
```typescript
// ✅ Valid
"#FF0000"
"#F00"
"#ff0000"

// ❌ Invalid
"red"
"FF0000" (missing #)
"#GG0000" (invalid hex)
```

### 3. URL-Safe Values
```typescript
// ✅ Good
"ocean-blue"
"light-gray"

// ❌ Avoid
"Ocean Blue" (spaces)
"light_gray!" (special chars)
```

### 4. Stock Management
Always update inventory when:
- Adding new variants
- Processing orders
- Receiving shipments
- Handling returns

## 🚀 Quick Reference

### Adding a Variant
```
Backend CMS → Products → Edit → Add to colors array → Save
```

### Removing a Variant
```
Backend CMS → Products → Edit → Remove from colors array → Save
```

### Updating Stock
```
Backend CMS → Products → Edit → Toggle inStock → Save
```

### Viewing Orders by Variant
```
Backend CMS → Orders → View Details → See selected color
```

---

**Need Help?** Check the main [README.md](./README.md) or [SETUP.md](./SETUP.md) for more information.
