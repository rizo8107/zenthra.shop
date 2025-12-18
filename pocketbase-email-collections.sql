-- PocketBase Collections Setup for Email System
-- Run these in PocketBase Admin Console or via API

-- ============================================================================
-- 1. CREATE email_templates COLLECTION
-- ============================================================================

-- Collection: email_templates
-- Description: Stores email templates for automated sending

CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  htmlContent TEXT NOT NULL,
  textContent TEXT,
  description TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  requiresAdditionalInfo BOOLEAN DEFAULT FALSE,
  additionalInfoLabel TEXT,
  additionalInfoPlaceholder TEXT,
  includeImage BOOLEAN DEFAULT FALSE,
  imageUrl TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

-- API Rules for email_templates:
-- listRule: @request.auth.id != ""
-- viewRule: @request.auth.id != ""
-- createRule: @request.auth.id != ""
-- updateRule: @request.auth.id != ""
-- deleteRule: @request.auth.id != ""

-- ============================================================================
-- 2. CREATE email_activity COLLECTION
-- ============================================================================

-- Collection: email_activity
-- Description: Logs all sent emails for tracking and debugging

CREATE TABLE email_activity (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT,
  status TEXT NOT NULL CHECK(status IN ('sent', 'failed')),
  error_message TEXT,
  order_id TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

-- API Rules for email_activity:
-- listRule: @request.auth.id != ""
-- viewRule: @request.auth.id != ""
-- createRule: @request.auth.id != ""
-- updateRule: ""
-- deleteRule: ""

-- ============================================================================
-- 3. INSERT SAMPLE EMAIL TEMPLATES
-- ============================================================================

-- Order Confirmation Template
INSERT INTO email_templates (
  id,
  name,
  subject,
  htmlContent,
  description,
  isActive,
  created,
  updated
) VALUES (
  'order_confirmation_001',
  'ORDER_CONFIRMATION',
  'Order {{orderId}} Confirmed - Thank You {{customerName}}!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4CAF50;">Hi {{customerName}},</h1>
    
    <p style="font-size: 16px;">Thank you for your order! We''ve received your order <strong>#{{orderId}}</strong> and are processing it now.</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="margin-top: 0;">Order Details:</h2>
      <ul style="line-height: 1.8;">
        <li><strong>Products:</strong> {{productList}}</li>
        <li><strong>Items:</strong> {{itemsCount}}</li>
        <li><strong>Total:</strong> ₹{{amount}}</li>
      </ul>
    </div>
    
    <p>We''ll send you a shipping confirmation email once your order ships.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{trackingLink}}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Track Your Order</a>
    </p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
    
    <p style="color: #666; font-size: 14px;">
      Thanks,<br>
      The {{storeName}} Team<br>
      {{supportEmail}}
    </p>
  </div>',
  'Sent when customer places an order',
  TRUE,
  datetime('now'),
  datetime('now')
);

-- Abandoned Cart Template
INSERT INTO email_templates (
  id,
  name,
  subject,
  htmlContent,
  description,
  isActive,
  created,
  updated
) VALUES (
  'abandoned_cart_001',
  'ABANDONED_CART',
  '{{customerName}}, you forgot something! Complete your order',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1>Don''t leave your cart behind!</h1>
    
    <p style="font-size: 16px;">Hi {{customerName}},</p>
    
    <p>You left {{itemsCount}} items in your cart worth <strong>₹{{amount}}</strong>.</p>
    
    <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
      <p style="margin: 0;"><strong>⏰ Your cart is waiting!</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px;">Complete your purchase before items sell out.</p>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{cartUrl}}" style="background: #FF5722; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Complete My Purchase</a>
    </p>
    
    <p style="color: #666; font-size: 14px;">
      Need help? Contact us at {{supportEmail}}
    </p>
  </div>',
  'Sent when customer abandons cart',
  TRUE,
  datetime('now'),
  datetime('now')
);

-- Payment Success Template
INSERT INTO email_templates (
  id,
  name,
  subject,
  htmlContent,
  description,
  isActive,
  created,
  updated
) VALUES (
  'payment_success_001',
  'PAYMENT_SUCCESS',
  'Payment Received - Order {{orderId}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 48px;">✅</div>
      <h1 style="color: #4CAF50; margin: 10px 0;">Payment Successful!</h1>
    </div>
    
    <p style="font-size: 16px;">Hi {{customerName}},</p>
    
    <p>We''ve received your payment of <strong>₹{{amount}}</strong> for order #{{orderId}}.</p>
    
    <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2e7d32;">Payment Details</h3>
      <ul style="line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Order ID: <strong>{{orderId}}</strong></li>
        <li>Amount Paid: <strong>₹{{amount}}</strong></li>
        <li>Products: {{productList}}</li>
      </ul>
    </div>
    
    <p>Your order is now being processed and will be shipped soon!</p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Best regards,<br>
      {{storeName}}<br>
      {{supportEmail}}
    </p>
  </div>',
  'Sent when payment is confirmed',
  TRUE,
  datetime('now'),
  datetime('now')
);

-- Shipping Notification Template
INSERT INTO email_templates (
  id,
  name,
  subject,
  htmlContent,
  description,
  isActive,
  created,
  updated
) VALUES (
  'order_shipped_001',
  'ORDER_SHIPPED',
  '📦 Your Order {{orderId}} Has Shipped!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 48px;">📦</div>
      <h1 style="color: #2196F3; margin: 10px 0;">Your Order is On the Way!</h1>
    </div>
    
    <p style="font-size: 16px;">Hi {{customerName}},</p>
    
    <p>Great news! Your order #{{orderId}} has been shipped and is on its way to you.</p>
    
    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1976d2;">Shipping Details</h3>
      <ul style="line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Carrier: <strong>{{carrier}}</strong></li>
        <li>Expected Delivery: <strong>{{estimatedDelivery}}</strong></li>
        <li>Shipping To: {{shippingAddress}}</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{trackingLink}}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Track Your Package</a>
    </p>
    
    <p style="color: #666; font-size: 14px;">
      Questions? Contact us at {{supportEmail}}
    </p>
  </div>',
  'Sent when order is shipped',
  TRUE,
  datetime('now'),
  datetime('now')
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if collections were created
SELECT name FROM sqlite_master WHERE type='table' AND (name='email_templates' OR name='email_activity');

-- Check sample templates
SELECT id, name, subject FROM email_templates;

-- Check if activity table is empty (should be initially)
SELECT COUNT(*) as total_activities FROM email_activity;
