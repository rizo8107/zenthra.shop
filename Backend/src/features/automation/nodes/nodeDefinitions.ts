export interface NodeDefinition {
  type: string;
  category: 'trigger' | 'data' | 'logic' | 'messaging' | 'payments' | 'utilities';
  label: string;
  description: string;
  icon: string;
  color: string;
  inputs?: NodePort[];
  outputs?: NodePort[];
  config: NodeConfigField[];
}

export interface NodePort {
  id: string;
  label: string;
  type: 'data' | 'control';
  required?: boolean;
}

export interface NodeConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' | 'connection';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  description?: string;
}

// MVP NODES - Phase 1
export const nodeDefinitions: NodeDefinition[] = [
  // 1) TRIGGERS
  {
    type: 'trigger.manual',
    category: 'trigger',
    label: 'Manual Trigger',
    description: 'Start flow manually for testing or on-demand execution',
    icon: '▶️',
    color: '#10B981',
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'testData',
        label: 'Test Data',
        type: 'json',
        placeholder: '{"user_id": "123", "test": true}',
        description: 'JSON data to use when manually triggering the flow',
        defaultValue: '{"test": true}'
      },
      {
        key: 'description',
        label: 'Description',
        type: 'text',
        placeholder: 'Test trigger for order processing',
        description: 'Optional description for this manual trigger'
      }
    ]
  },
  {
    type: 'trigger.cron',
    category: 'trigger',
    label: 'Cron Trigger',
    description: 'Trigger flow on a schedule using cron expression',
    icon: '⏰',
    color: '#10B981',
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'cron',
        label: 'Cron Expression',
        type: 'text',
        required: true,
        placeholder: '*/15 * * * *',
        description: 'Cron expression (e.g., */15 * * * * for every 15 minutes)',
        defaultValue: '0 9 * * *'
      }
    ]
  },
  {
    type: 'trigger.webhook',
    category: 'trigger',
    label: 'Webhook Trigger',
    description: 'Trigger flow from external webhook calls',
    icon: '🔗',
    color: '#10B981',
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'path',
        label: 'Webhook Path',
        type: 'text',
        required: true,
        placeholder: '/hooks/order-paid',
        description: 'URL path for the webhook endpoint'
      },
      {
        key: 'secret',
        label: 'Secret Key',
        type: 'text',
        placeholder: 'Optional secret for verification',
        description: 'Secret key to verify webhook authenticity'
      },
      {
        key: 'forwardPayload',
        label: 'Forward Payload',
        type: 'boolean',
        defaultValue: true,
        description: 'Forward the webhook payload to next nodes'
      }
    ]
  },
  {
    type: 'trigger.pbChange',
    category: 'trigger',
    label: 'PocketBase Change',
    description: 'Trigger on PocketBase record changes',
    icon: '🗄️',
    color: '#10B981',
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'collection',
        label: 'Collection',
        type: 'text',
        required: true,
        placeholder: 'orders',
        description: 'PocketBase collection to monitor'
      },
      {
        key: 'filter',
        label: 'Filter',
        type: 'text',
        placeholder: 'status="paid"',
        description: 'Filter condition for records to monitor'
      },
      {
        key: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'create', label: 'Create' },
          { value: 'update', label: 'Update' },
          { value: 'delete', label: 'Delete' },
          { value: 'any', label: 'Any' }
        ],
        defaultValue: 'any'
      }
    ]
  },

  // 2) DATA (PocketBase)
  {
    type: 'pb.find',
    category: 'data',
    label: 'Find Records',
    description: 'Find multiple records from PocketBase collection',
    icon: '🔍',
    color: '#3B82F6',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Records', type: 'data' },
      { id: 'count', label: 'Count', type: 'data' }
    ],
    config: [
      {
        key: 'collection',
        label: 'Collection',
        type: 'select',
        required: true,
        options: [
          { value: 'users', label: 'Users' },
          { value: 'orders', label: 'Orders' },
          { value: 'products', label: 'Products' },
          { value: 'categories', label: 'Categories' },
          { value: 'coupons', label: 'Coupons' },
          { value: 'addresses', label: 'Addresses' },
          { value: 'reviews', label: 'Reviews' },
          { value: 'wishlists', label: 'Wishlists' },
          { value: 'carts', label: 'Carts' },
          { value: 'notifications', label: 'Notifications' },
          { value: 'flows', label: 'Automation Flows' },
          { value: 'runs', label: 'Flow Runs' },
          { value: 'run_steps', label: 'Run Steps' }
        ],
        description: 'Select the PocketBase collection to query'
      },
      {
        key: 'filter',
        label: 'Filter Expression',
        type: 'textarea',
        placeholder: 'status="pending" && created >= @now-"24h"',
        description: 'PocketBase filter expression (e.g., status="active", user.id="123")'
      },
      {
        key: 'sort',
        label: 'Sort Order',
        type: 'text',
        placeholder: '-created,+name',
        description: 'Sort fields (prefix with - for desc, + for asc)'
      },
      {
        key: 'expand',
        label: 'Expand Relations',
        type: 'text',
        placeholder: 'user,products,address',
        description: 'Comma-separated list of relations to expand'
      },
      {
        key: 'fields',
        label: 'Select Fields',
        type: 'text',
        placeholder: 'id,name,email,created',
        description: 'Comma-separated list of fields to return (leave empty for all)'
      },
      {
        key: 'limit',
        label: 'Limit',
        type: 'number',
        defaultValue: 50,
        description: 'Maximum number of records to return (1-500)',
        placeholder: '50'
      },
      {
        key: 'page',
        label: 'Page',
        type: 'number',
        defaultValue: 1,
        description: 'Page number for pagination',
        placeholder: '1'
      }
    ]
  },
  {
    type: 'pb.getOne',
    category: 'data',
    label: 'Get Record',
    description: 'Get a single record by ID or filter',
    icon: '📄',
    color: '#3B82F6',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Record', type: 'data' },
      { id: 'exists', label: 'Found', type: 'control' }
    ],
    config: [
      {
        key: 'collection',
        label: 'Collection',
        type: 'select',
        required: true,
        options: [
          { value: 'users', label: 'Users' },
          { value: 'orders', label: 'Orders' },
          { value: 'products', label: 'Products' },
          { value: 'categories', label: 'Categories' },
          { value: 'coupons', label: 'Coupons' },
          { value: 'addresses', label: 'Addresses' },
          { value: 'reviews', label: 'Reviews' },
          { value: 'wishlists', label: 'Wishlists' },
          { value: 'carts', label: 'Carts' },
          { value: 'notifications', label: 'Notifications' }
        ],
        description: 'Select the PocketBase collection to query'
      },
      {
        key: 'recordId',
        label: 'Record ID',
        type: 'text',
        placeholder: 'abc123def456 or {{input.user_id}}',
        description: 'Specific record ID to fetch (supports templates)'
      },
      {
        key: 'filter',
        label: 'Filter (if no ID)',
        type: 'text',
        placeholder: 'email="user@example.com"',
        description: 'Filter to find record when ID is not provided'
      },
      {
        key: 'expand',
        label: 'Expand Relations',
        type: 'text',
        placeholder: 'user,items',
        description: 'Comma-separated list of relations to expand'
      },
      {
        key: 'fields',
        label: 'Select Fields',
        type: 'text',
        placeholder: 'id,name,email,created',
        description: 'Comma-separated list of fields to return (leave empty for all)'
      }
    ]
  },
  {
    type: 'pb.create',
    category: 'data',
    label: 'Create Record',
    description: 'Create a new record in PocketBase',
    icon: '➕',
    color: '#3B82F6',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'collection',
        label: 'Collection',
        type: 'text',
        required: true,
        placeholder: 'events'
      },
      {
        key: 'data',
        label: 'Data Template',
        type: 'json',
        placeholder: '{"name": "{{input.name}}", "status": "active"}',
        description: 'JSON template for the new record data'
      }
    ]
  },
  {
    type: 'pb.update',
    category: 'data',
    label: 'Update Record',
    description: 'Update an existing record in PocketBase',
    icon: '✏️',
    color: '#3B82F6',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'collection',
        label: 'Collection',
        type: 'text',
        required: true,
        placeholder: 'orders'
      },
      {
        key: 'id',
        label: 'Record ID',
        type: 'text',
        placeholder: '{{input.orderId}}',
        description: 'ID of record to update'
      },
      {
        key: 'data',
        label: 'Update Data',
        type: 'json',
        placeholder: '{"status": "paid", "updated": "{{now}}"}',
        description: 'JSON template for update data'
      }
    ]
  },

  // 3) LOGIC / CONTROL
  {
    type: 'logic.if',
    category: 'logic',
    label: 'If Condition',
    description: 'Branch flow based on a condition',
    icon: '🔀',
    color: '#F59E0B',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'true', label: 'True', type: 'control' },
      { id: 'false', label: 'False', type: 'control' }
    ],
    config: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'text',
        required: true,
        placeholder: 'input.status === "pending"',
        description: 'JavaScript expression that returns true/false'
      }
    ]
  },
  {
    type: 'iterate.each',
    category: 'logic',
    label: 'For Each',
    description: 'Iterate over each item in an array',
    icon: '🔄',
    color: '#F59E0B',
    inputs: [
      { id: 'in', label: 'Array', type: 'data' }
    ],
    outputs: [
      { id: 'item', label: 'Current Item', type: 'data' },
      { id: 'done', label: 'Completed', type: 'control' }
    ],
    config: [
      {
        key: 'path',
        label: 'Array Path',
        type: 'text',
        required: true,
        placeholder: 'items',
        description: 'Path to array in input data (e.g., "items", "data.results")',
        defaultValue: 'items'
      },
      {
        key: 'itemVariable',
        label: 'Item Variable Name',
        type: 'text',
        placeholder: 'item',
        description: 'Variable name for current item in loop',
        defaultValue: 'item'
      }
    ]
  },
  {
    type: 'logic.switch',
    category: 'logic',
    label: 'Switch',
    description: 'Route flow based on expression value',
    icon: '🎛️',
    color: '#F59E0B',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'default', label: 'Default', type: 'data' }
    ],
    config: [
      {
        key: 'expr',
        label: 'Expression',
        type: 'text',
        required: true,
        placeholder: 'input.paymentMethod',
        description: 'Expression to evaluate for switching'
      },
      {
        key: 'cases',
        label: 'Cases (JSON Array)',
        type: 'json',
        placeholder: '["razorpay", "cod", "upi"]',
        description: 'Array of case values to create output ports'
      }
    ]
  },
  {
    type: 'map.transform',
    category: 'logic',
    label: 'Transform Data',
    description: 'Transform data using template',
    icon: '🔄',
    color: '#F59E0B',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'template',
        label: 'Template',
        type: 'json',
        required: true,
        placeholder: '{"orderId": "{{input.id}}", "customerName": "{{input.customer.name}}"}',
        description: 'JSON template with Handlebars syntax'
      }
    ]
  },
  {
    type: 'util.delay',
    category: 'utilities',
    label: 'Delay',
    description: 'Add delay before continuing',
    icon: '⏳',
    color: '#6B7280',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'ms',
        label: 'Delay (milliseconds)',
        type: 'number',
        required: true,
        defaultValue: 5000,
        description: 'Delay in milliseconds (5000 = 5 seconds)'
      }
    ]
  },

  // 4) MESSAGING
  {
    type: 'whatsapp.send',
    category: 'messaging',
    label: 'Send WhatsApp',
    description: 'Send WhatsApp message via Evolution API',
    icon: '💬',
    color: '#059669',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'connectionId',
        label: 'Connection',
        type: 'connection',
        required: true,
        description: 'Evolution API connection to use'
      },
      {
        key: 'template',
        label: 'Message Template',
        type: 'textarea',
        required: true,
        placeholder: 'Hello {{input.customerName}}, your order {{input.orderId}} is confirmed!',
        description: 'Message template with variables'
      },
      {
        key: 'toPath',
        label: 'Phone Number Path',
        type: 'text',
        required: true,
        placeholder: 'input.user.phone',
        description: 'Path to phone number in input data'
      }
    ]
  },
  {
    type: 'email.send',
    category: 'messaging',
    label: 'Send Email',
    description: 'Send email via SMTP',
    icon: '📧',
    color: '#059669',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'connectionId',
        label: 'SMTP Connection',
        type: 'connection',
        required: true,
        description: 'SMTP connection to use'
      },
      {
        key: 'to',
        label: 'To Email',
        type: 'text',
        required: true,
        placeholder: '{{input.user.email}}',
        description: 'Recipient email address'
      },
      {
        key: 'subject',
        label: 'Subject',
        type: 'text',
        required: true,
        placeholder: 'Order Confirmation - {{input.orderId}}',
        description: 'Email subject line'
      },
      {
        key: 'html',
        label: 'HTML Content',
        type: 'textarea',
        placeholder: '<h1>Thank you for your order!</h1><p>Order ID: {{input.orderId}}</p>',
        description: 'HTML email content'
      }
    ]
  },

  // 5) PAYMENTS & ORDERS
  {
    type: 'razorpay.verify',
    category: 'payments',
    label: 'Verify Razorpay',
    description: 'Verify Razorpay webhook signature',
    icon: '💳',
    color: '#DC2626',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'verified', label: 'Verified', type: 'data' },
      { id: 'failed', label: 'Failed', type: 'data' }
    ],
    config: [
      {
        key: 'keyId',
        label: 'Key ID',
        type: 'text',
        required: true,
        placeholder: 'rzp_test_...',
        description: 'Razorpay Key ID'
      },
      {
        key: 'secret',
        label: 'Key Secret',
        type: 'text',
        required: true,
        placeholder: 'Razorpay Key Secret',
        description: 'Razorpay Key Secret'
      },
      {
        key: 'signatureHeader',
        label: 'Signature Header',
        type: 'text',
        defaultValue: 'x-razorpay-signature',
        description: 'Header containing the signature'
      }
    ]
  },
  {
    type: 'orders.confirm',
    category: 'payments',
    label: 'Confirm Order',
    description: 'Mark order as confirmed and update status',
    icon: '✅',
    color: '#DC2626',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'orderIdPath',
        label: 'Order ID Path',
        type: 'text',
        defaultValue: 'input.orderId',
        description: 'Path to order ID in input data'
      },
      {
        key: 'status',
        label: 'New Status',
        type: 'text',
        defaultValue: 'confirmed',
        description: 'Status to set on the order'
      }
    ]
  },

  // 6) UTILITIES
  {
    type: 'http.request',
    category: 'utilities',
    label: 'HTTP Request',
    description: 'Make HTTP request to external API',
    icon: '🌐',
    color: '#6B7280',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Success', type: 'data' },
      { id: 'error', label: 'Error', type: 'data' }
    ],
    config: [
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' }
        ],
        defaultValue: 'GET'
      },
      {
        key: 'url',
        label: 'URL',
        type: 'text',
        required: true,
        placeholder: 'https://api.example.com/webhook',
        description: 'Request URL'
      },
      {
        key: 'headers',
        label: 'Headers (JSON)',
        type: 'json',
        placeholder: '{"Content-Type": "application/json", "Authorization": "Bearer {{token}}"}',
        description: 'Request headers as JSON object'
      },
      {
        key: 'body',
        label: 'Request Body',
        type: 'json',
        placeholder: '{"data": "{{input}}"}',
        description: 'Request body template'
      }
    ]
  },
  {
    type: 'vars.set',
    category: 'utilities',
    label: 'Set Variable',
    description: 'Store value in flow variables',
    icon: '📝',
    color: '#6B7280',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'key',
        label: 'Variable Name',
        type: 'text',
        required: true,
        placeholder: 'customerEmail',
        description: 'Name of the variable to set'
      },
      {
        key: 'valueExpr',
        label: 'Value Expression',
        type: 'text',
        placeholder: 'input.user.email',
        description: 'Expression to evaluate for the value'
      }
    ]
  },
  {
    type: 'vars.get',
    category: 'utilities',
    label: 'Get Variable',
    description: 'Retrieve value from flow variables',
    icon: '📖',
    color: '#6B7280',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'key',
        label: 'Variable Name',
        type: 'text',
        required: true,
        placeholder: 'customerEmail',
        description: 'Name of the variable to retrieve'
      }
    ]
  },
  {
    type: 'log',
    category: 'utilities',
    label: 'Log Message',
    description: 'Log message for debugging',
    icon: '📋',
    color: '#6B7280',
    inputs: [
      { id: 'in', label: 'Input', type: 'data' }
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'data' }
    ],
    config: [
      {
        key: 'level',
        label: 'Log Level',
        type: 'select',
        options: [
          { value: 'info', label: 'Info' },
          { value: 'warn', label: 'Warning' },
          { value: 'error', label: 'Error' },
          { value: 'debug', label: 'Debug' }
        ],
        defaultValue: 'info'
      },
      {
        key: 'message',
        label: 'Message',
        type: 'text',
        required: true,
        placeholder: 'Processing order {{input.orderId}}',
        description: 'Log message template'
      }
    ]
  }
];

// Group nodes by category
export const nodesByCategory = nodeDefinitions.reduce((acc, node) => {
  if (!acc[node.category]) {
    acc[node.category] = [];
  }
  acc[node.category].push(node);
  return acc;
}, {} as Record<string, NodeDefinition[]>);

// Get node definition by type
export const getNodeDefinition = (type: string): NodeDefinition | undefined => {
  return nodeDefinitions.find(node => node.type === type);
};
