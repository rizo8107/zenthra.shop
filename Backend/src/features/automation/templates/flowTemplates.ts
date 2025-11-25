import type { FlowCanvas } from '../types';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ecommerce' | 'marketing' | 'support' | 'general';
  tags: string[];
  canvas: FlowCanvas;
  requiredConnections: string[];
  estimatedSetupTime: string;
  icon: string;
}

export const flowTemplates: FlowTemplate[] = [
  // 1. ABANDONED CART RECOVERY
  {
    id: 'abandoned-cart-recovery',
    name: 'Abandoned Cart Recovery',
    description: 'Automatically send WhatsApp reminders to customers who abandon their carts after 1 hour and 24 hours',
    category: 'ecommerce',
    tags: ['cart', 'recovery', 'whatsapp', 'sales'],
    requiredConnections: ['evolution-api'],
    estimatedSetupTime: '5 minutes',
    icon: '🛒',
    canvas: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'customNode',
          position: { x: 50, y: 100 },
          data: {
            label: 'Check Every Hour',
            type: 'trigger.cron',
            config: {
              cron: '0 * * * *' // Every hour
            }
          }
        },
        {
          id: 'find-abandoned-1',
          type: 'customNode',
          position: { x: 300, y: 100 },
          data: {
            label: 'Find 1h Abandoned Carts',
            type: 'pb.find',
            config: {
              collection: 'orders',
              filter: 'status="pending" && payment_status!="paid" && created >= @now-"1h" && created <= @now-"1h5m"',
              expand: 'user_id',
              limit: 50
            }
          }
        },
        {
          id: 'iterate-1',
          type: 'iterate.each',
          position: { x: 550, y: 100 },
          data: {
            label: 'For Each Cart',
            type: 'iterate.each',
            config: {
              path: 'items'
            }
          }
        },
        {
          id: 'whatsapp-1h',
          type: 'whatsapp.send',
          position: { x: 800, y: 100 },
          data: {
            label: '1 Hour Reminder',
            type: 'whatsapp.send',
            config: {
              connectionId: 'evolution-api-1',
              template: '🛒 Hi {{input.customer_name}}! You left some items in your cart. Complete your order now and get FREE delivery! 🚚\n\nOrder Total: ₹{{input.total}}\nComplete here: {{input.checkout_url}}',
              toPath: 'input.customer_phone'
            }
          }
        },
        {
          id: 'find-abandoned-24',
          type: 'customNode',
          position: { x: 300, y: 300 },
          data: {
            label: 'Find 24h Abandoned Carts',
            type: 'pb.find',
            config: {
              collection: 'orders',
              filter: 'status="pending" && payment_status!="paid" && created >= @now-"24h" && created <= @now-"23h55m"',
              expand: 'user_id',
              limit: 50
            }
          }
        },
        {
          id: 'iterate-24',
          type: 'iterate.each',
          position: { x: 550, y: 300 },
          data: {
            label: 'For Each Cart',
            type: 'iterate.each',
            config: {
              path: 'items'
            }
          }
        },
        {
          id: 'whatsapp-24h',
          type: 'whatsapp.send',
          position: { x: 800, y: 300 },
          data: {
            label: '24 Hour Final Reminder',
            type: 'whatsapp.send',
            config: {
              connectionId: 'evolution-api-1',
              template: '⏰ Last chance! Your cart expires soon.\n\n🎁 Use code SAVE10 for 10% OFF\nOrder Total: ₹{{input.total}}\n\nDon\'t miss out: {{input.checkout_url}}',
              toPath: 'input.customer_phone'
            }
          }
        },
        {
          id: 'log-sent',
          type: 'log',
          position: { x: 1050, y: 200 },
          data: {
            label: 'Log Reminder Sent',
            type: 'log',
            config: {
              level: 'info',
              message: 'Abandoned cart reminder sent to {{input.customer_phone}} for order {{input.id}}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'find-abandoned-1' },
        { id: 'e2', source: 'find-abandoned-1', target: 'iterate-1' },
        { id: 'e3', source: 'iterate-1', target: 'whatsapp-1h' },
        { id: 'e4', source: 'trigger-1', target: 'find-abandoned-24' },
        { id: 'e5', source: 'find-abandoned-24', target: 'iterate-24' },
        { id: 'e6', source: 'iterate-24', target: 'whatsapp-24h' },
        { id: 'e7', source: 'whatsapp-1h', target: 'log-sent' },
        { id: 'e8', source: 'whatsapp-24h', target: 'log-sent' }
      ]
    }
  },

  // 2. ORDER CONFIRMATION
  {
    id: 'order-confirmation',
    name: 'Order Confirmation Messages',
    description: 'Send instant WhatsApp and email confirmations when orders are paid via Razorpay webhook',
    category: 'ecommerce',
    tags: ['order', 'confirmation', 'payment', 'whatsapp', 'email'],
    requiredConnections: ['evolution-api', 'smtp'],
    estimatedSetupTime: '3 minutes',
    icon: '✅',
    canvas: {
      nodes: [
        {
          id: 'webhook-trigger',
          type: 'trigger.webhook',
          position: { x: 50, y: 200 },
          data: {
            label: 'Razorpay Webhook',
            type: 'trigger.webhook',
            config: {
              path: '/hooks/razorpay-payment',
              secret: '', // Configure in node settings
              forwardPayload: true
            }
          }
        },
        {
          id: 'verify-payment',
          type: 'razorpay.verify',
          position: { x: 300, y: 200 },
          data: {
            label: 'Verify Payment',
            type: 'razorpay.verify',
            config: {
              keyId: '', // Configure with your Razorpay key
              secret: '', // Configure with your Razorpay secret
              signatureHeader: 'x-razorpay-signature'
            }
          }
        },
        {
          id: 'get-order',
          type: 'pb.getOne',
          position: { x: 550, y: 150 },
          data: {
            label: 'Get Order Details',
            type: 'pb.getOne',
            config: {
              collection: 'orders',
              id: '{{input.payload.order_id}}',
              expand: 'user_id,items'
            }
          }
        },
        {
          id: 'confirm-order',
          type: 'orders.confirm',
          position: { x: 800, y: 150 },
          data: {
            label: 'Mark Order Paid',
            type: 'orders.confirm',
            config: {
              orderIdPath: 'input.id',
              status: 'confirmed'
            }
          }
        },
        {
          id: 'whatsapp-confirm',
          type: 'whatsapp.send',
          position: { x: 1050, y: 100 },
          data: {
            label: 'WhatsApp Confirmation',
            type: 'whatsapp.send',
            config: {
              connectionId: 'evolution-api-1',
              template: '🎉 Order Confirmed!\n\nHi {{input.customer_name}},\nYour order #{{input.id}} has been confirmed!\n\n💰 Amount: ₹{{input.total}}\n📦 Items: {{input.items_count}}\n🚚 Expected delivery: 3-5 business days\n\nTrack your order: {{input.tracking_url}}\n\nThank you for shopping with us! 🙏',
              toPath: 'input.customer_phone'
            }
          }
        },
        {
          id: 'email-confirm',
          type: 'email.send',
          position: { x: 1050, y: 200 },
          data: {
            label: 'Email Confirmation',
            type: 'email.send',
            config: {
              connectionId: 'smtp-gmail',
              to: '{{input.customer_email}}',
              subject: 'Order Confirmed - #{{input.id}}',
              html: '<h2>🎉 Your Order is Confirmed!</h2><p>Hi {{input.customer_name}},</p><p>Thank you for your order! Here are the details:</p><ul><li><strong>Order ID:</strong> #{{input.id}}</li><li><strong>Total:</strong> ₹{{input.total}}</li><li><strong>Items:</strong> {{input.items_count}}</li></ul><p>We\'ll send you tracking information once your order ships.</p><p>Thank you for choosing us!</p>'
            }
          }
        },
        {
          id: 'log-confirmation',
          type: 'log',
          position: { x: 1300, y: 150 },
          data: {
            label: 'Log Confirmation',
            type: 'log',
            config: {
              level: 'info',
              message: 'Order confirmation sent for order {{input.id}} to {{input.customer_email}}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'webhook-trigger', target: 'verify-payment' },
        { id: 'e2', source: 'verify-payment', target: 'get-order', sourceHandle: 'verified' },
        { id: 'e3', source: 'get-order', target: 'confirm-order' },
        { id: 'e4', source: 'confirm-order', target: 'whatsapp-confirm' },
        { id: 'e5', source: 'confirm-order', target: 'email-confirm' },
        { id: 'e6', source: 'whatsapp-confirm', target: 'log-confirmation' },
        { id: 'e7', source: 'email-confirm', target: 'log-confirmation' }
      ]
    }
  },

  // 3. DELIVERY CONFIRMATION
  {
    id: 'delivery-confirmation',
    name: 'Delivery Confirmation & Feedback',
    description: 'Notify customers when orders are delivered and request feedback after 2 hours',
    category: 'ecommerce',
    tags: ['delivery', 'shipping', 'feedback', 'whatsapp'],
    requiredConnections: ['evolution-api'],
    estimatedSetupTime: '4 minutes',
    icon: '🚚',
    canvas: {
      nodes: [
        {
          id: 'delivery-trigger',
          type: 'trigger.pbChange',
          position: { x: 50, y: 200 },
          data: {
            label: 'Order Delivered',
            type: 'trigger.pbChange',
            config: {
              collection: 'orders',
              filter: 'status="delivered"',
              action: 'update'
            }
          }
        },
        {
          id: 'delivery-notification',
          type: 'whatsapp.send',
          position: { x: 300, y: 200 },
          data: {
            label: 'Delivery Notification',
            type: 'whatsapp.send',
            config: {
              connectionId: 'evolution-api-1',
              template: '📦 Delivered Successfully!\n\nHi {{input.customer_name}},\nYour order #{{input.id}} has been delivered! 🎉\n\n📍 Delivered to: {{input.delivery_address}}\n⏰ Delivered at: {{input.delivered_at}}\n\nWe hope you love your purchase! 💝\n\nHave questions? Reply to this message.',
              toPath: 'input.customer_phone'
            }
          }
        },
        {
          id: 'delay-2h',
          type: 'util.delay',
          position: { x: 550, y: 200 },
          data: {
            label: 'Wait 2 Hours',
            type: 'util.delay',
            config: {
              ms: 7200000 // 2 hours in milliseconds
            }
          }
        },
        {
          id: 'feedback-request',
          type: 'whatsapp.send',
          position: { x: 800, y: 200 },
          data: {
            label: 'Request Feedback',
            type: 'whatsapp.send',
            config: {
              connectionId: 'evolution-api-1',
              template: '⭐ How was your experience?\n\nHi {{input.customer_name}},\nWe hope you\'re enjoying your recent purchase!\n\n🌟 Please rate your experience:\n⭐⭐⭐⭐⭐ Excellent\n⭐⭐⭐⭐ Good  \n⭐⭐⭐ Average\n⭐⭐ Poor\n⭐ Very Poor\n\nYour feedback helps us improve! 🙏\n\nReply with your rating or any comments.',
              toPath: 'input.customer_phone'
            }
          }
        },
        {
          id: 'create-feedback-record',
          type: 'pb.create',
          position: { x: 1050, y: 200 },
          data: {
            label: 'Create Feedback Record',
            type: 'pb.create',
            config: {
              collection: 'feedback_requests',
              data: {
                order_id: '{{input.id}}',
                customer_phone: '{{input.customer_phone}}',
                status: 'sent',
                sent_at: '{{now}}',
                type: 'delivery_feedback'
              }
            }
          }
        },
        {
          id: 'log-delivery',
          type: 'log',
          position: { x: 550, y: 350 },
          data: {
            label: 'Log Delivery',
            type: 'log',
            config: {
              level: 'info',
              message: 'Delivery notification sent for order {{input.id}} to {{input.customer_phone}}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'delivery-trigger', target: 'delivery-notification' },
        { id: 'e2', source: 'delivery-notification', target: 'delay-2h' },
        { id: 'e3', source: 'delivery-notification', target: 'log-delivery' },
        { id: 'e4', source: 'delay-2h', target: 'feedback-request' },
        { id: 'e5', source: 'feedback-request', target: 'create-feedback-record' }
      ]
    }
  },

  // 4. COD ORDER FOLLOW-UP
  {
    id: 'cod-order-followup',
    name: 'COD Order Follow-up',
    description: 'Send reminders for Cash on Delivery orders and handle confirmations',
    category: 'ecommerce',
    tags: ['cod', 'cash-on-delivery', 'confirmation', 'whatsapp'],
    requiredConnections: ['evolution-api'],
    estimatedSetupTime: '3 minutes',
    icon: '💰',
    canvas: {
      nodes: [
        {
          id: 'cod-trigger',
          type: 'trigger.pbChange',
          position: { x: 50, y: 200 },
          data: {
            label: 'COD Order Created',
            type: 'trigger.pbChange',
            config: {
              collection: 'orders',
              filter: 'payment_method="cod" && status="pending"',
              action: 'create'
            }
          }
        },
        {
          id: 'cod-confirmation',
          type: 'whatsapp.send',
          position: { x: 300, y: 200 },
          data: {
            label: 'COD Confirmation',
            type: 'whatsapp.send',
            config: {
              connectionId: 'evolution-api-1',
              template: '💰 COD Order Received!\n\nHi {{input.customer_name}},\nYour Cash on Delivery order has been confirmed!\n\n📦 Order #{{input.id}}\n💵 Amount to pay: ₹{{input.total}}\n📍 Delivery address: {{input.delivery_address}}\n\n🚚 Expected delivery: 3-5 business days\n\nPlease keep exact change ready. Thank you! 🙏',
              toPath: 'input.customer_phone'
            }
          }
        },
        {
          id: 'delay-24h',
          type: 'util.delay',
          position: { x: 550, y: 200 },
          data: {
            label: 'Wait 24 Hours',
            type: 'util.delay',
            config: {
              ms: 86400000 // 24 hours
            }
          }
        },
        {
          id: 'check-status',
          type: 'pb.getOne',
          position: { x: 800, y: 200 },
          data: {
            label: 'Check Order Status',
            type: 'pb.getOne',
            config: {
              collection: 'orders',
              id: '{{input.id}}'
            }
          }
        },
        {
          id: 'status-check',
          type: 'logic.if',
          position: { x: 1050, y: 200 },
          data: {
            label: 'Still Pending?',
            type: 'logic.if',
            config: {
              condition: 'input.status === "pending"'
            }
          }
        },
        {
          id: 'cod-reminder',
          type: 'whatsapp.send',
          position: { x: 1300, y: 150 },
          data: {
            label: 'COD Reminder',
            type: 'whatsapp.send',
            config: {
              connectionId: 'evolution-api-1',
              template: '📞 Order Update Required\n\nHi {{input.customer_name}},\nYour COD order #{{input.id}} is being prepared for dispatch.\n\n✅ Please confirm:\n- You still want this order\n- Delivery address is correct\n- You\'ll be available to receive\n\nReply YES to confirm or CANCEL to cancel.\n\nAmount: ₹{{input.total}}',
              toPath: 'input.customer_phone'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'cod-trigger', target: 'cod-confirmation' },
        { id: 'e2', source: 'cod-confirmation', target: 'delay-24h' },
        { id: 'e3', source: 'delay-24h', target: 'check-status' },
        { id: 'e4', source: 'check-status', target: 'status-check' },
        { id: 'e5', source: 'status-check', target: 'cod-reminder', sourceHandle: 'true' }
      ]
    }
  },

  // 5. WELCOME SERIES FOR NEW CUSTOMERS
  {
    id: 'welcome-series',
    name: 'New Customer Welcome Series',
    description: 'Send a series of welcome messages to new customers over their first week',
    category: 'marketing',
    tags: ['welcome', 'onboarding', 'new-customer', 'series'],
    requiredConnections: ['evolution-api', 'smtp'],
    estimatedSetupTime: '6 minutes',
    icon: '👋',
    canvas: {
      nodes: [
        {
          id: 'new-customer-trigger',
          type: 'trigger.pbChange',
          position: { x: 50, y: 200 },
          data: {
            label: 'New Customer',
            type: 'trigger.pbChange',
            config: {
              collection: 'users',
              action: 'create'
            }
          }
        },
        {
          id: 'welcome-immediate',
          type: 'whatsapp.send',
          position: { x: 300, y: 100 },
          data: {
            label: 'Immediate Welcome',
            type: 'whatsapp.send',
            config: {
              connectionId: 'evolution-api-1',
              template: '🎉 Welcome to our store!\n\nHi {{input.name}},\nThank you for joining us! We\'re excited to have you.\n\n🎁 Here\'s a special welcome gift:\nUse code WELCOME10 for 10% OFF your first order!\n\n🛍️ Start shopping: {{shop_url}}\n\nNeed help? Just reply to this message! 💬',
              toPath: 'input.phone'
            }
          }
        },
        {
          id: 'welcome-email',
          type: 'email.send',
          position: { x: 300, y: 250 },
          data: {
            label: 'Welcome Email',
            type: 'email.send',
            config: {
              connectionId: 'smtp-gmail',
              to: '{{input.email}}',
              subject: '🎉 Welcome to Our Store - 10% OFF Inside!',
              html: '<h1>Welcome {{input.name}}!</h1><p>We\'re thrilled you\'ve joined our community!</p><h2>🎁 Your Welcome Gift</h2><p>Use code <strong>WELCOME10</strong> for 10% OFF your first order.</p><p><a href="{{shop_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Shopping</a></p>'
            }
          }
        },
        {
          id: 'delay-3days',
          type: 'util.delay',
          position: { x: 550, y: 200 },
          data: {
            label: 'Wait 3 Days',
            type: 'util.delay',
            config: {
              ms: 259200000 // 3 days
            }
          }
        },
        {
          id: 'tips-message',
          type: 'whatsapp.send',
          position: { x: 800, y: 200 },
          data: {
            label: 'Shopping Tips',
            type: 'whatsapp.send',
            config: {
              connectionId: 'evolution-api-1',
              template: '💡 Shopping Tips for You!\n\nHi {{input.name}},\nHere are some tips to get the most out of your shopping:\n\n✅ Save items to wishlist\n✅ Check our daily deals\n✅ Follow us for exclusive offers\n✅ Refer friends for rewards\n\n🔥 Today\'s special: Free shipping on orders above ₹499!\n\nHappy shopping! 🛍️',
              toPath: 'input.phone'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'new-customer-trigger', target: 'welcome-immediate' },
        { id: 'e2', source: 'new-customer-trigger', target: 'welcome-email' },
        { id: 'e3', source: 'welcome-immediate', target: 'delay-3days' },
        { id: 'e4', source: 'delay-3days', target: 'tips-message' }
      ]
    }
  },

  // 6. SIMPLE TEST FLOW
  {
    id: 'test-flow',
    name: 'Simple Test Flow',
    description: 'Basic test flow with manual trigger for testing automation functionality',
    category: 'general',
    tags: ['test', 'manual', 'demo', 'simple'],
    requiredConnections: [],
    estimatedSetupTime: '1 minute',
    icon: '🧪',
    canvas: {
      nodes: [
        {
          id: 'manual-trigger',
          type: 'customNode',
          position: { x: 50, y: 200 },
          data: {
            label: 'Manual Test Trigger',
            type: 'trigger.manual',
            config: {
              testData: '{"user_id": "test123", "email": "test@example.com", "name": "Test User"}',
              description: 'Test trigger with sample user data'
            }
          }
        },
        {
          id: 'log-data',
          type: 'customNode',
          position: { x: 300, y: 200 },
          data: {
            label: 'Log Test Data',
            type: 'log',
            config: {
              level: 'info',
              message: 'Test flow executed with data: {{JSON.stringify(input)}}'
            }
          }
        },
        {
          id: 'delay-test',
          type: 'customNode',
          position: { x: 550, y: 200 },
          data: {
            label: 'Wait 2 Seconds',
            type: 'util.delay',
            config: {
              ms: 2000
            }
          }
        },
        {
          id: 'final-log',
          type: 'customNode',
          position: { x: 800, y: 200 },
          data: {
            label: 'Test Complete',
            type: 'log',
            config: {
              level: 'info',
              message: 'Test flow completed successfully for user: {{input.name || "Unknown"}}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'manual-trigger', target: 'log-data' },
        { id: 'e2', source: 'log-data', target: 'delay-test' },
        { id: 'e3', source: 'delay-test', target: 'final-log' }
      ]
    }
  }
];

// Helper function to get template by ID
export const getFlowTemplate = (templateId: string): FlowTemplate | undefined => {
  return flowTemplates.find(template => template.id === templateId);
};

// Get templates by category
export const getTemplatesByCategory = (category: string): FlowTemplate[] => {
  return flowTemplates.filter(template => template.category === category);
};

// Get all categories
export const getTemplateCategories = (): string[] => {
  return [...new Set(flowTemplates.map(template => template.category))];
};

// Normalize template canvas for ReactFlow
export const normalizeTemplateCanvas = (canvas: FlowCanvas): FlowCanvas => {
  return {
    ...canvas,
    nodes: canvas.nodes.map(node => ({
      ...node,
      type: 'customNode', // Ensure all nodes use our custom component
    })),
  };
};
