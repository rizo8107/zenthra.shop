# Email Automation Setup Guide

## Overview
This guide explains how email automation works in Zenthra.shop, similar to WhatsApp automation. Email sending is fully integrated with the automation engine and can be triggered by customer journey events, cron schedules, or manual flows.

## Architecture

### Components

1. **Email Config Page** (`/admin/email`)
   - Configure SMTP settings
   - Create templates
   - Test connection & send test emails
   - View activity logs

2. **Automation Engine** (`Backend/src/features/automation/engine.ts`)
   - `executeEmailSend()` - Sends emails from automation flows
   - Variables substitution
   - Activity logging

3. **Backend API** (`Backend/src/server/email.ts`)
   - `POST /api/email/test-connection` - Test SMTP config
   - `POST /api/email/send-test` - Send test email
   - `POST /api/email/send` - Send email (automation)
   - `POST /api/email/send-template` - Send from template

4. **PocketBase Collections**
   - `plugins` (key: 'smtp') - SMTP configuration
   - `email_templates` - Email templates
   - `email_activity` - Sent email logs

---

## Setup Instructions

### 1. Configure SMTP Settings

Go to **`/admin/email`** → **Settings** tab

**Example Gmail Configuration:**
```
Host: smtp.gmail.com
Port: 587  
Secure: false (uncheck SSL/TLS)
Username: your-email@gmail.com
Password: [Your App Password - NOT regular password!]
From Email: noreply@zenthra.shop
From Name: Zenthra Shop
```

**Getting Gmail App Password:**
1. Google Account → Security → 2-Step Verification
2. Search for "App passwords"
3. Create new app password for "Mail"
4. Use that password in SMTP config

Click **Save Configuration**

### 2. Test Connection

1. Click **Test Connection** button
2. Wait for status badge:
   - ✅ Green "Connected" = Success
   - ❌ Red "Disconnected" = Failed (check settings)

### 3. Create Email Templates

Go to **Templates** tab → Click **Add Template**

**Template Fields:**
- **Name**: Event type (ORDER_CONFIRMATION, PAYMENT_SUCCESS, etc.)
- **Description**: When this template is used
- **Subject**: Email subject with variables (e.g., `Order {{orderId}} Confirmed!`)
- **HTML Content**: Email body with HTML support
- **Include Image**: Toggle to add header image
- **Active**: Enable/disable template

**Example Template:**

```
Name: ORDER_CONFIRMATION
Subject: Your Order {{orderId}} - Thank You {{customerName}}!

HTML Content:
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Hi {{customerName}},</h1>
  
  <p>Thank you for your order! We've received order <strong>#{{orderId}}</strong>.</p>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h2 style="margin-top: 0;">Order Details:</h2>
    <ul>
      <li><strong>Products:</strong> {{productList}}</li>
      <li><strong>Items:</strong> {{itemsCount}}</li>
      <li><strong>Total:</strong> ₹{{amount}}</li>
    </ul>
  </div>
  
  <p>We'll send you shipping confirmation once your order ships.</p>
  
  <p><a href="{{trackingLink}}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Track Your Order</a></p>
  
  <hr style="margin: 30px 0;">
  
  <p style="color: #666; font-size: 14px;">
    Thanks,<br>
    The {{storeName}} Team<br>
    {{supportEmail}}
  </p>
</div>
```

---

## Creating Automation Flows

### Email Order Confirmation Flow

1. Go to **`/admin/automation`**
2. Click **Create New Flow**
3. Name: "Email Order Confirmation"

**Flow Structure:**

```
[Trigger: Order Created]
    ↓
[Email Node: Send Order Confirmation]
```

**Configuration:**

**Trigger Node:**
- Type: `trigger.journey`
- Event Type: `order_created`

**Email Send Node:**
- Type: `email.send`
- Connection: `smtp`
- To Path: `input.customer.email` (or direct email)
- Subject: `Order {{orderId}} Confirmed - Thank You!`
- Template: 
```html
<h1>Hi {{customerName}},</h1>
<p>Your order #{{orderId}} for ₹{{amount}} has been confirmed!</p>
<p>Products: {{productList}}</p>
```

### Abandoned Cart Email Flow

```
[Trigger: Cart Abandoned]
    ↓
[Delay: 30 minutes]
    ↓
[Email: Abandoned Cart Reminder]
```

**Email Node Config:**
- To Path: `input.customer.email`
- Subject: `You forgot something! Complete your order`
- Template:
```html
<h2>{{customerName}}, your cart is waiting!</h2>
<p>You left {{itemsCount}} items in your cart worth ₹{{amount}}.</p>
<a href="{{cartUrl}}">Complete Your Purchase</a>
```

### Daily Sales Report Email

```
[Trigger: Cron (Daily at 9 AM)]
    ↓
[PB Find: Get Today's Orders]
    ↓
[Sales Report Node]
    ↓
[Email: Daily Summary]
```

**Email Node:**
- To Path: `admin@zenthra.shop` (direct email)
- Subject: `Sales Report for {{report_date}}`
- Template:
```html
<h1>Daily Sales Report </h1>
<ul>
  <li>Total Sales: ₹{{total_sales}}</li>
  <li>Orders: {{order_count}}</li>
  <li>Products Sold: {{product_count}}</li>
  <li>Avg Order Value: ₹{{avg_order_value}}</li>
</ul>
```

---

## Available Template Variables

### Customer Info
```
{{customerName}}
{{customerEmail}}
```

### Order Details
```
{{orderId}}
{{amount}}
{{firstProductName}}
{{productList}}
{{itemsCount}}
{{firstProductImageUrl}}
```

### Shipping & Tracking
```
{{shippingAddress}}
{{trackingLink}}
{{carrier}}
{{estimatedDelivery}}
```

### Links & Support
```
{{feedbackLink}}
{{retryUrl}}
{{cartUrl}}
{{storeName}}
{{supportEmail}}
{{currentYear}}
```

---

## Activity Monitoring

Go to **Activity** tab to see:
- ✅ All sent emails
- ✅ Recipients
- ✅ Timestamps
- ✅ Subject lines
- ✅ Template used
- ✅ Status (Sent/Failed)
- ✅ Error messages

**Filter Options:**
- All Status
- Sent Only
- Failed Only

---

## PocketBase Schema

### 1. plugins Collection

```json
{
  "key": "smtp",
  "enabled": true,
  "config": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "your-email@gmail.com",
    "password": "your-app-password",
    "fromEmail": "noreply@zenthra.shop",
    "fromName": "Zenthra Shop"
  }
}
```

### 2. email_templates Collection

```typescript
{
  name: string;              // Template ID (e.g., ORDER_CONFIRMATION)
  subject: string;           // Email subject with variables
  htmlContent: string;       // HTML email body
  textContent?: string;      // Plain text version (optional)
  description?: string;      // Template description
  isActive: boolean;         // Enable/disable
  includeImage: boolean;     // Has header image
  imageUrl?: string;         // Image URL if includeImage=true
  requiresAdditionalInfo: boolean;
  additionalInfoLabel?: string;
  additionalInfoPlaceholder?: string;
  created: datetime;
  updated: datetime;
}
```

### 3. email_activity Collection

```typescript
{
  recipient: string;         // Email address
  subject: string;           // Email subject (after variable substitution)
  template_name?: string;    // Template used (e.g., ORDER_CONFIRMATION)
  status: 'sent' | 'failed'; // Delivery status
  error_message?: string;    // Error if failed
  order_id?: string;         // Related order ID
  created: datetime;         // Timestamp
}
```

---

## Backend API Reference

### Test SMTP Connection

<parameter name="Complexity">8
