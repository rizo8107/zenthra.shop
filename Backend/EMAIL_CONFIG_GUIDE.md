# Email Configuration Page - Setup Guide

## Overview
The Email Configuration page provides a comprehensive interface for managing SMTP email settings, creating templates, testing emails, and viewing activity logs - similar to the WhatsApp Configuration page.

## Access
Navigate to: **`/admin/email`**

## Features

### 1. **Connection Tab** 
Monitor and verify your SMTP server connection.

**Features:**
- ✅ Connection status badge (Connected/Disconnected/Checking)
- ✅ Test connection button
- ✅ Quick setup guide with numbered steps
- ✅ Current configuration display
- ✅ Popular SMTP provider examples (Gmail, Outlook, SendGrid, Mailgun)

### 2. **Templates Tab**
Create and manage email templates for automated notifications.

**Template Management:**
- ✅ Create templates for 12 order events:
  - Order Confirmation
  - Payment Success/Failed
  - Order Shipped/Delivered/Cancelled
  - Out for Delivery
  - Refund Confirmation
  - Abandoned Cart
  - Welcome Email
  - Password Reset
  - Review Request

**Template Editor Features:**
- ✅ HTML content editor with syntax highlighting
- ✅ Subject line editor
- ✅ Variable insertion dropdowns (Customer, Order, Shipping, Store info)
- ✅ Image attachment support
- ✅ Live preview pane
- ✅ Active/inactive toggle
- ✅ Description field

**Available Variables:**
```
{{customerName}}
{{customerEmail}}
{{orderId}}
{{amount}}
{{firstProductName}}
{{productList}}
{{itemsCount}}
{{firstProductImageUrl}}
{{shippingAddress}}
{{trackingLink}}
{{carrier}}
{{estimatedDelivery}}
{{feedbackLink}}
{{retryUrl}}
{{refundAmount}}
{{cartUrl}}
{{storeName}}
{{supportEmail}}
{{currentYear}}
```

### 3. **Test Tab**
Send test emails to verify configuration.

**Test Features:**
- ✅ Recipient email input
- ✅ Subject line input
- ✅ HTML message editor
- ✅ Quick test templates (Order Confirmation, Welcome Email)
- ✅ Send test button with loading state

### 4. **Activity Tab**
View sent email logs and delivery status.

**Activity Features:**
- ✅ Table view with timestamps
- ✅ Recipient, subject, template name display
- ✅ Status badges (Sent/Failed)
- ✅ Error messages for failed emails
- ✅ Filter by status (All/Sent Only/Failed Only)
- ✅ Refresh button
- ✅ ScrollArea for many logs

### 5. **Settings Tab**
Configure SMTP server credentials.

**SMTP Configuration:**
- ✅ Host (e.g., smtp.gmail.com)
- ✅ Port (587 for TLS, 465 for SSL)
- ✅ Username/Email
- ✅ Password/App Password
- ✅ From Email
- ✅ From Name
- ✅ SSL/TLS toggle switch
- ✅ Save configuration button
- ✅ Test connection button
- ℹ️ Gmail app password help text

## Setup Instructions

### Step 1: Configure SMTP Settings

1. Go to **Settings** tab
2. Fill in your SMTP details:

**Example for Gmail:**
```
Host: smtp.gmail.com
Port: 587
Secure: false (uncheck SSL/TLS)
Username: your-email@gmail.com
Password: your-app-password (not regular password!)
From Email: noreply@zenthra.shop
From Name: Zenthra Shop
```

**Getting Gmail App Password:**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Generate a new app password
5. Use this password in the SMTP config

3. Click **Save Configuration**

### Step 2: Test Connection

1. Click **Test Connection** button
2. Wait for status badge to update
3. If successful: Green "Connected" badge appears
4. If failed: Red error with message shown

### Step 3: Create Email Templates

1. Go to **Templates** tab
2. Click **Add Template**
3. Select event type (e.g., "Order Confirmation")
4. Write subject line (use variables like `{{orderId}}`)
5. Write HTML content (use variables for personalization)
6. Optionally add an image attachment
7. Preview on right side
8. Click **Save Template**

**Example Template:**

**Name:** ORDER_CONFIRMATION

**Subject:** 
```
Order {{orderId}} Confirmed - Thank You {{customerName}}!
```

**HTML Content:**
```html
<h1>Hi {{customerName}},</h1>

<p>Thank you for your order! We've received your order <strong>#{{orderId}}</strong> and are processing it now.</p>

<h2>Order Details:</h2>
<ul>
  <li>Products: {{productList}}</li>
  <li>Items: {{itemsCount}}</li>
  <li>Total: ₹{{amount}}</li>
</ul>

<p>We'll send you a shipping confirmation email once your order ships.</p>

<p>Track your order: <a href="{{trackingLink}}">Click here</a></p>

<p>Thanks,<br>
The {{storeName}} Team<br>
{{supportEmail}}</p>
```

### Step 4: Send Test Email

1. Go to **Test** tab
2. Enter your email address
3. Enter subject and message (or use quick templates)
4. Click **Send Test Email**
5. Check your inbox

### Step 5: View Activity

1. Go to **Activity** tab
2. See all sent emails with:
   - Timestamp
   - Recipient
   - Subject
   - Template used
   - Status (Sent/Failed)
   - Error message (if failed)

## PocketBase Collections

The page uses these collections:

### 1. **plugins**
Stores SMTP configuration:
```json
{
  "key": "smtp",
  "enabled": true,
  "config": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "your-email@gmail.com",
    "password": "app-password",
    "fromEmail": "noreply@zenthra.shop",
    "fromName": "Zenthra Shop"
  }
}
```

### 2. **email_templates**
Stores email templates:
```json
{
  "name": "ORDER_CONFIRMATION",
  "subject": "Order {{orderId}} Confirmed",
  "htmlContent": "<h1>Hi {{customerName}}</h1>...",
  "textContent": "",
  "description": "Sent when order is placed",
  "isActive": true,
  "includeImage": true,
  "imageUrl": "https://...",
  "requiresAdditionalInfo": false
}
```

### 3. **email_activity**
Stores email sending logs:
```json
{
  "recipient": "customer@example.com",
  "subject": "Order #123 Confirmed",
  "template_name": "ORDER_CONFIRMATION",
  "status": "sent",
  "error_message": "",
  "order_id": "abc123"
}
```

## Backend API Endpoints Required

You need to create these API endpoints:

### 1. **POST /api/email/test-connection**
Test SMTP connection
```typescript
// Request
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "email@gmail.com",
  "password": "app-password",
  "fromEmail": "noreply@shop.com",
  "fromName": "Shop"
}

// Response
{
  "success": true,
  "message": "Connection successful"
}
```

### 2. **POST /api/email/send-test**
Send test email
```typescript
// Request
{
  "to": "test@example.com",
  "subject": "Test Email",
  "html": "<h1>Test</h1>",
  "config": { /* SMTP config */ }
}

// Response
{
  "success": true
}
```

## Common SMTP Providers

### Gmail
```
Host: smtp.gmail.com
Port: 587
Secure: false (TLS)
Note: Use App Password, not regular password
```

### Outlook/Office 365
```
Host: smtp.office365.com
Port: 587
Secure: false (TLS)
```

### SendGrid
```
Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: Your SendGrid API key
```

### Mailgun
```
Host: smtp.mailgun.org
Port: 587
User: Your Mailgun SMTP username
Password: Your Mailgun SMTP password
```

### Amazon SES
```
Host: email-smtp.us-east-1.amazonaws.com
Port: 587
User: Your SES SMTP username
Password: Your SES SMTP password
```

## Troubleshooting

### Connection Failed

**Issue:** "Connection test failed" error

**Solutions:**
1. Check host and port are correct
2. Verify username/password (use app password for Gmail)
3. Check SSL/TLS setting (587 = TLS off, 465 = TLS on)
4. Ensure firewall allows outbound SMTP
5. Try different SMTP provider

### Emails Not Sending

**Issue:** Templates created but emails not going out

**Solutions:**
1. Verify connection status is "Connected"
2. Check template is marked as "Active"
3. Review Activity tab for error messages
4. Test with simple test email first
5. Check spam folder

### Variables Not Replaced

**Issue:** `{{variableName}}` appearing in email instead of actual values

**Solution:**
This is expected in test emails. Variables are replaced when triggered by actual order events in automation workflows.

## Integration with Automation

Email templates work with the Automation Flow Builder:

1. Create automation flow
2. Add "Email" node
3. Select template from dropdown
4. Variables auto-populate from order data
5. Email sends when flow triggers

## Best Practices

1. **Always test** emails before activating templates
2. **Use app passwords** for Gmail/Outlook (not regular passwords)
3. **Add images sparingly** - many email clients block images by default
4. **Keep HTML simple** - complex CSS may not render properly
5. **Include plain text** fallback for accessibility
6. **Use clear subject lines** - avoid spam trigger words
7. **Test on mobile** - most emails are read on phones
8. **Monitor activity logs** - watch for failures and fix promptly
9. **Personalize with variables** - higher engagement rates
10. **Follow CAN-SPAM** - include unsubscribe link

## Differences from WhatsApp Config

| Feature | Email | WhatsApp |
|---------|-------|----------|
| Connection | SMTP test | QR code scanning |
| Message Type | HTML email | Text + media |
| Templates | HTML editor | Text with media picker |
| Variables | 19 variables | 17 variables |
| Activity | Email logs | WhatsApp logs |
| Test | Send test email | Send test message |

Both pages share similar structure and workflow for consistency!

---

**Created:** December 17, 2025
**Version:** 1.0
**Component:** Backend Admin Panel
**Route:** `/admin/email`
