# 🎨 Portfolio Creation Guide - Zenthra.shop

> **Complete Guide to Creating Portfolio Pages using Puck CMS**

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Accessing the Page Builder](#accessing-the-page-builder)
3. [Portfolio Component Overview](#portfolio-component-overview)
4. [Step-by-Step Portfolio Creation](#step-by-step-portfolio-creation)
5. [Component Configuration](#component-configuration)
6. [Advanced Features](#advanced-features)
7. [Best Practices](#best-practices)
8. [Examples & Templates](#examples--templates)

---

## 🎯 Introduction

The **Portfolio Showcase** component in Zenthra.shop allows you to create stunning portfolio pages using a drag-and-drop visual editor. No coding required!

### **What You Can Build**
- ✅ Design portfolios (UI/UX, Graphic Design)
- ✅ Photography galleries
- ✅ Project showcases
- ✅ Product collections
- ✅ Case studies
- ✅ Client work displays

### **Key Features**
- 📐 **3 Layout Options**: Masonry, Grid, List
- 🎨 **Customizable Styling**: Colors, spacing, cards
- 🏷️ **Category Filtering**: Tag-based filtering
- 🎬 **Animations**: Fade, slide, scale effects
- 📱 **Fully Responsive**: Mobile, tablet, desktop
- 🔍 **SEO Optimized**: Meta tags & social sharing

---

## 🚀 Accessing the Page Builder

### **Method 1: Admin Dashboard**

1. **Login to Admin Panel**
   ```
   URL: http://localhost:5174
   Navigate to: Admin → Pages
   ```

2. **Create New Page**
   - Click "New Page" button
   - Enter page details:
     - **Title**: "My Portfolio"
     - **Slug**: "portfolio"
     - **Status**: "Draft"
   - Click "Create & Edit"

### **Method 2: Direct URL**

```
http://localhost:5174/admin/pages/new/edit
```

### **Access Control**

Only authenticated admin users can access the page builder. Ensure you're logged in with admin credentials.

---

## 🧩 Portfolio Component Overview

### **Component Structure**

```
Portfolio Showcase Component
├── Layout System
│   ├── Masonry (Pinterest-style)
│   ├── Grid (Equal height cards)
│   └── List (Horizontal cards)
│
├── Project Cards
│   ├── Image/Thumbnail
│   ├── Title
│   ├── Category Tag
│   ├── Description
│   └── Link/CTA
│
├── Filtering System
│   ├── Category Pills
│   ├── Search Bar (optional)
│   └── "Show All" option
│
└── Interactions
    ├── Hover Effects
    ├── Click to Expand
    ├── Lightbox View
    └── External Links
```

### **Available Templates**

Located in: `Frontend/src/components/TemplateDialog.tsx`

```javascript
{
  id: "portfolio-showcase",
  name: "Portfolio Showcase",
  description: "Visual portfolio with masonry grid",
  thumbnail: "https://via.placeholder.com/400x300?text=Portfolio",
  components: [
    { type: "Hero", ... },
    { type: "PortfolioShowcase", ... },
    { type: "Newsletter", ... }
  ]
}
```

---

## 📝 Step-by-Step Portfolio Creation

### **Step 1: Access Pages Manager**

```bash
# Navigate to
http://localhost:5174/admin/pages

# You'll see a list of all pages
```

### **Step 2: Create New Page**

1. Click **"+ New Page"** button
2. Fill in page details:
   ```
   Title: My Portfolio
   Slug: portfolio
   Status: Draft
   ```
3. Click **"Create & Edit"**

### **Step 3: Choose Template or Start Blank**

**Option A: Use Template**
- Click "Templates" in toolbar
- Select "Portfolio Showcase"
- Template loads with pre-configured components

**Option B: Start Blank**
- You'll see an empty canvas
- Ready to add components manually

### **Step 4: Add Portfolio Component**

1. **Open Component Library** (Left sidebar)
2. **Find "Portfolio Showcase"** component
3. **Drag onto canvas** where you want it
4. Component appears with default settings

### **Step 5: Configure Portfolio Settings**

Click on the Portfolio component to open **Properties Panel** (Right sidebar):

#### **Layout Settings**
```
Grid Layout: [Masonry ▼]
  Options:
  - Masonry (Pinterest-style, varied heights)
  - Grid (Equal height cards)
  - List (Horizontal layout)

Columns: [3]
  Range: 1-6 columns
  Auto-responsive on mobile

Gap Size: [Medium ▼]
  Options:
  - Small (8px)
  - Medium (16px)
  - Large (24px)
  - Extra Large (32px)
```

#### **Card Style**
```
Card Style: [Modern ▼]
  Options:
  - Modern (Rounded corners, shadow)
  - Minimal (Clean borders)
  - Bold (Large images, accent colors)
  - Classic (Traditional card design)

Show Overlay: [✓ Yes]
  Adds gradient overlay on images

Border Radius: [12px]
  Range: 0-32px
```

#### **Animation**
```
Animation: [Fade In ▼]
  Options:
  - None
  - Fade In
  - Slide Up
  - Scale In
  - Bounce

Animation Delay: [100ms]
  Stagger effect between cards
```

#### **Filtering**
```
Enable Filters: [✓ Yes]

Filter Tags: 
  [Design] [Development] [Branding]
  (Add/remove tags as needed)

Show "All" Button: [✓ Yes]
```

### **Step 6: Add Projects**

In the Properties Panel, locate **"Projects"** section:

1. Click **"+ Add Project"**
2. Fill in project details:

```
Project #1:
-------------
Image URL: https://example.com/project1.jpg
  (Or upload via image picker)

Title: E-commerce Website Redesign

Category: Design
  (Must match one of the filter tags)

Description: Complete UI/UX overhaul for online store
  (Optional, shows on hover/click)

Link: https://example.com/project1
  (External link or page slug)

Link Text: View Project
  (Button/link text)

Featured: [✓]
  (Show in top results)
```

3. Click **"+ Add Project"** to add more
4. Repeat for all portfolio items

**Example Configuration:**
```javascript
[
  {
    image: "/images/portfolio/project1.jpg",
    title: "E-commerce Redesign",
    category: "Design",
    description: "Modern UI for online fashion store",
    link: "/case-studies/ecommerce",
    linkText: "View Case Study",
    featured: true
  },
  {
    image: "/images/portfolio/project2.jpg",
    title: "Mobile Banking App",
    category: "Development",
    description: "Cross-platform React Native app",
    link: "/case-studies/banking-app",
    linkText: "See Details",
    featured: false
  },
  {
    image: "/images/portfolio/project3.jpg",
    title: "Brand Identity",
    category: "Branding",
    description: "Complete rebrand for tech startup",
    link: "/case-studies/branding",
    linkText: "View Project",
    featured: true
  }
]
```

### **Step 7: Add Supporting Components**

#### **Add Hero Section** (Above portfolio)
1. Drag **"Hero"** component above Portfolio
2. Configure:
   ```
   Title: My Creative Portfolio
   Subtitle: Showcasing my best work in design & development
   Background: Gradient or image
   CTA Button: "Get in Touch"
   Button Link: /contact
   ```

#### **Add Text Introduction** (Between Hero and Portfolio)
1. Drag **"Text"** component
2. Write introduction:
   ```
   "I'm a designer and developer creating digital experiences 
   that blend creativity with functionality. Browse my work below."
   
   Style: Center aligned, larger font
   ```

#### **Add Newsletter Section** (Below portfolio)
1. Drag **"Newsletter"** component
2. Configure:
   ```
   Title: Stay Updated
   Description: Get my latest projects delivered to your inbox
   Button Text: Subscribe
   ```

### **Step 8: Responsive Design Preview**

Test your portfolio on different devices:

1. Click **device icons** in top toolbar:
   - 🖥️ Desktop (1920px)
   - 💻 Laptop (1440px)
   - 📱 Tablet (768px)
   - 📱 Mobile (375px)

2. Adjust components if needed:
   - Reduce columns on mobile (auto: 1-2)
   - Smaller text sizes
   - Stack layouts vertically

### **Step 9: SEO Configuration**

Click **"Settings"** in toolbar:

```
Page Title: My Portfolio - John Doe Design
  (Shows in browser tab & search results)

Meta Description:
  "Browse my portfolio of design and development projects. 
   Specializing in e-commerce, mobile apps, and branding."
  (155 characters max)

Keywords: portfolio, design, development, UI/UX, branding

Social Image: /images/portfolio-preview.jpg
  (Shows when shared on social media)

Open Graph Tags: [✓ Enable]
Twitter Cards: [✓ Enable]
```

### **Step 10: Publish Page**

1. **Preview** your page:
   - Click "Preview" button
   - Opens in new tab: `/page/portfolio`
   - Test all interactions

2. **Save as Draft** (optional):
   - Click "Save Draft"
   - Come back later to continue editing

3. **Publish**:
   - Click "Publish" button
   - Status changes to "Published"
   - Page is now live at: `yourdomain.com/portfolio`

---

## ⚙️ Component Configuration

### **Full Configuration Schema**

```typescript
interface PortfolioShowcaseProps {
  // Layout
  layout: 'masonry' | 'grid' | 'list';
  columns: number; // 1-6
  gap: 'small' | 'medium' | 'large' | 'xl';
  
  // Styling
  cardStyle: 'modern' | 'minimal' | 'bold' | 'classic';
  showOverlay: boolean;
  overlayColor: string;
  borderRadius: number;
  
  // Animation
  animation: 'none' | 'fadeIn' | 'slideUp' | 'scaleIn' | 'bounce';
  animationDelay: number; // milliseconds
  staggered: boolean;
  
  // Filtering
  enableFilters: boolean;
  filterTags: string[];
  showAllButton: boolean;
  defaultFilter: string | null;
  
  // Projects
  projects: Project[];
  
  // Interaction
  expandOnClick: boolean;
  lightboxEnabled: boolean;
  openInNewTab: boolean;
}

interface Project {
  id?: string;
  image: string;
  title: string;
  category: string;
  description?: string;
  link?: string;
  linkText?: string;
  featured?: boolean;
  tags?: string[];
}
```

### **Advanced Styling Options**

#### **Custom CSS Classes**
```javascript
{
  containerClass: "portfolio-container",
  cardClass: "portfolio-card",
  imageClass: "portfolio-image",
  overlayClass: "portfolio-overlay",
  titleClass: "portfolio-title"
}
```

#### **Color Customization**
```javascript
{
  colors: {
    primary: "#8B5CF6",      // Purple
    secondary: "#3B82F6",    // Blue
    accent: "#EF4444",       // Red
    background: "#FFFFFF",   // White
    text: "#1F2937",         // Dark gray
    overlay: "rgba(0,0,0,0.4)"
  }
}
```

---

## 🎨 Advanced Features

### **1. Category Filtering**

**Enable filtering** to let visitors filter projects:

```javascript
// Configuration
{
  enableFilters: true,
  filterTags: ["All", "Design", "Development", "Branding"],
  defaultFilter: "All"
}
```

**How it works:**
- Filter pills appear above portfolio
- Click tag to filter projects by category
- Smooth animation when filtering
- URL updates with filter: `/portfolio?filter=Design`

### **2. Lightbox Gallery**

**Enable lightbox** for fullscreen image viewing:

```javascript
{
  lightboxEnabled: true,
  lightboxOptions: {
    showNavigation: true,
    showThumbnails: false,
    showCaptions: true,
    autoPlay: false
  }
}
```

**Features:**
- Click image to open lightbox
- Navigate with arrows or keyboard
- Swipe on mobile
- Close with ESC or X button

### **3. Project Details Modal**

**Expand projects** to show more information:

```javascript
{
  expandOnClick: true,
  modalContent: {
    showFullDescription: true,
    showTechnologies: true,
    showDate: true,
    showClient: true,
    showGallery: true
  }
}
```

**Extended Project Schema:**
```javascript
{
  title: "E-commerce Platform",
  category: "Development",
  description: "Full project description here...",
  technologies: ["React", "Node.js", "PostgreSQL"],
  client: "Fashion Co.",
  date: "2024-01",
  duration: "3 months",
  team: "4 developers, 2 designers",
  gallery: [
    "image1.jpg",
    "image2.jpg",
    "image3.jpg"
  ],
  testimonial: {
    text: "Amazing work!",
    author: "Client Name",
    role: "CEO"
  }
}
```

### **4. Lazy Loading**

**Optimize performance** with lazy loading:

```javascript
{
  lazyLoad: true,
  lazyLoadOptions: {
    threshold: 0.1,      // Load when 10% visible
    rootMargin: "50px",  // Start loading 50px before
    placeholder: "blur"  // Blur effect while loading
  }
}
```

### **5. Search Functionality**

**Add search bar** to filter projects:

```javascript
{
  enableSearch: true,
  searchPlaceholder: "Search projects...",
  searchFields: ["title", "description", "tags"]
}
```

---

## ✨ Best Practices

### **Image Guidelines**

**Recommended Sizes:**
- **Masonry**: Variable heights, min 800x600px
- **Grid**: Same aspect ratio, 1200x800px
- **List**: Wide format, 1600x900px

**Optimization:**
```javascript
// Use WebP format for smaller file size
// Compress images (80-90% quality)
// Provide multiple sizes for responsive images

images: {
  thumbnail: "project1-thumb.webp",    // 400x300
  medium: "project1-medium.webp",      // 800x600
  large: "project1-large.webp",        // 1600x1200
  original: "project1-original.jpg"    // Full size
}
```

### **Content Guidelines**

**Titles:**
- Keep under 50 characters
- Use clear, descriptive names
- Avoid abbreviations

**Descriptions:**
- 100-200 characters for previews
- Full description in modal/detail page
- Highlight key achievements or technologies

**Categories:**
- Use 3-8 categories max
- Keep names short (1-2 words)
- Be consistent across projects

### **Performance Optimization**

1. **Use Lazy Loading**: Load images as user scrolls
2. **Optimize Images**: WebP format, compressed
3. **Limit Projects**: Show 12-24 per page, add pagination
4. **Cache Queries**: Use React Query for data fetching
5. **CDN**: Host images on CDN for faster loading

### **Accessibility**

```html
<!-- Ensure proper alt text -->
<img 
  src="project.jpg" 
  alt="E-commerce website homepage showing modern design with purple gradient"
/>

<!-- Use semantic HTML -->
<article class="project-card">
  <h3>Project Title</h3>
  <p>Description</p>
</article>

<!-- Keyboard navigation -->
<button 
  aria-label="View project details"
  tabindex="0"
>
  View Project
</button>
```

---

## 📚 Examples & Templates

### **Example 1: Designer Portfolio**

```javascript
{
  layout: "masonry",
  columns: 3,
  gap: "medium",
  cardStyle: "modern",
  showOverlay: true,
  animation: "fadeIn",
  filterTags: ["All", "UI Design", "Branding", "Illustration"],
  
  projects: [
    {
      image: "/images/portfolio/mobile-app-ui.jpg",
      title: "Mobile Banking App",
      category: "UI Design",
      description: "Modern banking interface with focus on usability",
      tags: ["Figma", "UI/UX", "Mobile"],
      link: "/case-studies/banking-app"
    },
    {
      image: "/images/portfolio/brand-identity.jpg",
      title: "Tech Startup Branding",
      category: "Branding",
      description: "Complete brand identity from logo to guidelines",
      tags: ["Illustrator", "Brand", "Identity"],
      link: "/case-studies/tech-branding"
    }
  ]
}
```

### **Example 2: Developer Portfolio**

```javascript
{
  layout: "grid",
  columns: 2,
  gap: "large",
  cardStyle: "bold",
  showOverlay: false,
  animation: "slideUp",
  filterTags: ["All", "Web Apps", "Mobile Apps", "Open Source"],
  
  projects: [
    {
      image: "/images/portfolio/ecommerce-platform.jpg",
      title: "E-commerce Platform",
      category: "Web Apps",
      description: "Full-stack marketplace with 10k+ products",
      technologies: ["React", "Node.js", "PostgreSQL", "Redis"],
      github: "https://github.com/user/ecommerce",
      demo: "https://demo.ecommerce.com",
      featured: true
    },
    {
      image: "/images/portfolio/fitness-tracker.jpg",
      title: "Fitness Tracking App",
      category: "Mobile Apps",
      description: "Cross-platform app with AI workout recommendations",
      technologies: ["React Native", "Firebase", "TensorFlow"],
      appStore: "https://apps.apple.com/...",
      playStore: "https://play.google.com/..."
    }
  ]
}
```

### **Example 3: Photography Portfolio**

```javascript
{
  layout: "masonry",
  columns: 4,
  gap: "small",
  cardStyle: "minimal",
  showOverlay: true,
  overlayColor: "rgba(0,0,0,0.3)",
  lightboxEnabled: true,
  animation: "scaleIn",
  filterTags: ["All", "Weddings", "Portraits", "Landscape", "Events"],
  
  projects: [
    {
      image: "/images/portfolio/wedding-sunset.jpg",
      title: "Beach Wedding",
      category: "Weddings",
      location: "Malibu, CA",
      date: "2024-06",
      camera: "Sony A7III",
      lens: "85mm f/1.4"
    },
    {
      image: "/images/portfolio/mountain-landscape.jpg",
      title: "Himalayan Vista",
      category: "Landscape",
      location: "Nepal",
      date: "2024-03",
      camera: "Canon R5",
      lens: "24-70mm f/2.8"
    }
  ]
}
```

### **Example 4: Agency Portfolio**

```javascript
{
  layout: "grid",
  columns: 3,
  gap: "large",
  cardStyle: "modern",
  showOverlay: true,
  animation: "fadeIn",
  filterTags: ["All", "Branding", "Web Design", "Marketing", "Social Media"],
  enableSearch: true,
  
  projects: [
    {
      image: "/images/portfolio/restaurant-rebrand.jpg",
      title: "Italian Restaurant Rebrand",
      category: "Branding",
      client: "Pasta Palace",
      services: ["Brand Strategy", "Logo Design", "Menu Design"],
      results: {
        metric1: "+45% Customer Recognition",
        metric2: "+30% Social Engagement"
      },
      testimonial: {
        text: "The new brand perfectly captures our heritage!",
        author: "Marco Rossi",
        role: "Owner"
      }
    }
  ]
}
```

---

## 🔧 Troubleshooting

### **Images Not Loading**

**Problem:** Portfolio images show broken image icon

**Solutions:**
1. Check image URLs are correct and accessible
2. Ensure images are uploaded to public folder
3. Verify file permissions
4. Check console for CORS errors
5. Use absolute URLs for external images

### **Filters Not Working**

**Problem:** Clicking category filters doesn't filter projects

**Solutions:**
1. Ensure `enableFilters: true`
2. Check category names match exactly (case-sensitive)
3. Verify `filterTags` array includes categories
4. Clear browser cache

### **Layout Issues**

**Problem:** Projects appearing squished or overlapping

**Solutions:**
1. Adjust `columns` value for screen size
2. Increase `gap` size
3. Check if images have proper aspect ratios
4. Test in responsive mode

### **Slow Performance**

**Problem:** Portfolio loads slowly or lags

**Solutions:**
1. Enable lazy loading
2. Reduce number of projects per page
3. Optimize and compress images
4. Use CDN for image hosting
5. Implement pagination

---

## 📖 Additional Resources

### **Related Documentation**
- [Puck CMS Setup Guide](./PUCK_SETUP.md)
- [Component Documentation](./PUCK_COMPONENTS.md)
- [Theme Customization](./THEME-README.md)

### **Video Tutorials**
- Creating Your First Portfolio Page (Coming Soon)
- Advanced Portfolio Customization (Coming Soon)
- SEO Optimization for Portfolios (Coming Soon)

### **Community**
- Join Discord: [Zenthra Community](#)
- Stack Overflow: Tag `zenthra-shop`
- GitHub Discussions: Share your portfolios!

---

## 🎉 Conclusion

You now have everything you need to create stunning portfolio pages with Zenthra.shop! 

**Next Steps:**
1. ✅ Create your first portfolio page
2. ✅ Add your best projects
3. ✅ Customize the design
4. ✅ Publish and share!

**Need Help?**
- 📧 Email: support@zenthra.shop
- 💬 Discord: Join our community
- 📖 Docs: Read more guides

---

**Happy Building! 🚀**
