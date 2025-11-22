/**
 * PocketBase Collection Setup Script for Checkout Flow Management
 * 
 * Run this script to create the necessary collections for checkout flow management.
 * You can either run this via Node.js or manually create the collections in PocketBase admin.
 */

// Collection 1: checkout_flows
const checkoutFlowsSchema = {
  name: "checkout_flows",
  type: "base",
  schema: [
    {
      name: "name",
      type: "text",
      required: true,
      options: {
        min: 1,
        max: 100,
        pattern: ""
      }
    },
    {
      name: "description",
      type: "text",
      required: false,
      options: {
        min: 0,
        max: 500,
        pattern: ""
      }
    },
    {
      name: "is_active",
      type: "bool",
      required: true,
      options: {}
    },
    {
      name: "is_default",
      type: "bool",
      required: true,
      options: {}
    },
    {
      name: "priority",
      type: "number",
      required: true,
      options: {
        min: 0,
        max: 100
      }
    },
    {
      name: "conditions",
      type: "json",
      required: false,
      options: {}
    },
    {
      name: "settings",
      type: "json",
      required: false,
      options: {}
    }
  ],
  indexes: [
    "CREATE INDEX idx_checkout_flows_active ON checkout_flows (is_active)",
    "CREATE INDEX idx_checkout_flows_default ON checkout_flows (is_default)",
    "CREATE INDEX idx_checkout_flows_priority ON checkout_flows (priority)"
  ]
};

// Collection 2: checkout_steps
const checkoutStepsSchema = {
  name: "checkout_steps",
  type: "base",
  schema: [
    {
      name: "flow_id",
      type: "relation",
      required: true,
      options: {
        collectionId: "checkout_flows",
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
        displayFields: ["name"]
      }
    },
    {
      name: "step_type",
      type: "select",
      required: true,
      options: {
        maxSelect: 1,
        values: [
          "collect_shipping",
          "collect_contact", 
          "review_order",
          "select_payment_method",
          "create_order_record",
          "start_payment_gateway",
          "custom"
        ]
      }
    },
    {
      name: "label",
      type: "text",
      required: true,
      options: {
        min: 1,
        max: 100,
        pattern: ""
      }
    },
    {
      name: "description",
      type: "text",
      required: false,
      options: {
        min: 0,
        max: 300,
        pattern: ""
      }
    },
    {
      name: "order_index",
      type: "number",
      required: true,
      options: {
        min: 1,
        max: 20
      }
    },
    {
      name: "is_enabled",
      type: "bool",
      required: true,
      options: {}
    },
    {
      name: "conditions",
      type: "json",
      required: false,
      options: {}
    },
    {
      name: "settings",
      type: "json",
      required: false,
      options: {}
    }
  ],
  indexes: [
    "CREATE INDEX idx_checkout_steps_flow ON checkout_steps (flow_id)",
    "CREATE INDEX idx_checkout_steps_order ON checkout_steps (order_index)",
    "CREATE INDEX idx_checkout_steps_enabled ON checkout_steps (is_enabled)"
  ]
};

// Collection 3: payment_methods
const paymentMethodsSchema = {
  name: "payment_methods",
  type: "base",
  schema: [
    {
      name: "method_key",
      type: "text",
      required: true,
      options: {
        min: 1,
        max: 50,
        pattern: "^[a-z_]+$"
      }
    },
    {
      name: "name",
      type: "text",
      required: true,
      options: {
        min: 1,
        max: 100,
        pattern: ""
      }
    },
    {
      name: "description",
      type: "text",
      required: false,
      options: {
        min: 0,
        max: 300,
        pattern: ""
      }
    },
    {
      name: "icon",
      type: "text",
      required: false,
      options: {
        min: 0,
        max: 50,
        pattern: ""
      }
    },
    {
      name: "is_enabled",
      type: "bool",
      required: true,
      options: {}
    },
    {
      name: "priority",
      type: "number",
      required: true,
      options: {
        min: 0,
        max: 100
      }
    },
    {
      name: "conditions",
      type: "json",
      required: false,
      options: {}
    },
    {
      name: "settings",
      type: "json",
      required: false,
      options: {}
    }
  ],
  indexes: [
    "CREATE UNIQUE INDEX idx_payment_methods_key ON payment_methods (method_key)",
    "CREATE INDEX idx_payment_methods_enabled ON payment_methods (is_enabled)",
    "CREATE INDEX idx_payment_methods_priority ON payment_methods (priority)"
  ]
};

// Collection 4: checkout_conditions
const checkoutConditionsSchema = {
  name: "checkout_conditions",
  type: "base",
  schema: [
    {
      name: "name",
      type: "text",
      required: true,
      options: {
        min: 1,
        max: 100,
        pattern: ""
      }
    },
    {
      name: "condition_type",
      type: "select",
      required: true,
      options: {
        maxSelect: 1,
        values: [
          "min_total",
          "max_total",
          "state_is",
          "state_is_not",
          "country_is",
          "user_logged_in",
          "tn_shipping_restricted",
          "product_category",
          "product_tag",
          "cart_item_count",
          "custom"
        ]
      }
    },
    {
      name: "description",
      type: "text",
      required: false,
      options: {
        min: 0,
        max: 300,
        pattern: ""
      }
    },
    {
      name: "operator",
      type: "select",
      required: false,
      options: {
        maxSelect: 1,
        values: [
          "equals",
          "not_equals",
          "greater_than",
          "less_than",
          "greater_equal",
          "less_equal",
          "contains",
          "not_contains",
          "in",
          "not_in"
        ]
      }
    },
    {
      name: "value",
      type: "json",
      required: false,
      options: {}
    },
    {
      name: "is_active",
      type: "bool",
      required: true,
      options: {}
    }
  ],
  indexes: [
    "CREATE INDEX idx_checkout_conditions_type ON checkout_conditions (condition_type)",
    "CREATE INDEX idx_checkout_conditions_active ON checkout_conditions (is_active)"
  ]
};

// Default data to insert
const defaultData = {
  checkout_flows: [
    {
      name: "Default Checkout Flow",
      description: "Standard checkout process for most customers",
      is_active: true,
      is_default: true,
      priority: 1,
      conditions: [],
      settings: {
        allow_guest_checkout: true,
        require_phone_verification: false,
        auto_apply_coupons: true
      }
    }
  ],
  
  payment_methods: [
    {
      method_key: "razorpay",
      name: "UPI / Cards / Wallets",
      description: "Fast online payment using Razorpay",
      icon: "CreditCard",
      is_enabled: true,
      priority: 1,
      conditions: [
        {
          type: "min_total",
          amount: 1
        }
      ],
      settings: {
        gateway: "razorpay",
        auto_capture: true
      }
    },
    {
      method_key: "cod",
      name: "Cash on Delivery",
      description: "Pay when you receive your order",
      icon: "Truck",
      is_enabled: true,
      priority: 2,
      conditions: [
        {
          type: "max_total",
          amount: 2000
        },
        {
          type: "state_is_not",
          state: "Tamil Nadu"
        },
        {
          type: "tn_shipping_restricted",
          value: false
        }
      ],
      settings: {
        cod_charges: 0,
        cod_charge_percentage: 0
      }
    }
  ],
  
  checkout_conditions: [
    {
      name: "Minimum Order Value",
      condition_type: "min_total",
      description: "Order must be above a certain amount",
      operator: "greater_equal",
      value: { amount: 0 },
      is_active: true
    },
    {
      name: "Maximum Order Value",
      condition_type: "max_total", 
      description: "Order must be below a certain amount",
      operator: "less_equal",
      value: { amount: 10000 },
      is_active: true
    },
    {
      name: "Tamil Nadu State Check",
      condition_type: "state_is",
      description: "Check if delivery is to Tamil Nadu",
      operator: "equals",
      value: { state: "Tamil Nadu" },
      is_active: true
    },
    {
      name: "User Login Required",
      condition_type: "user_logged_in",
      description: "User must be logged in",
      operator: "equals",
      value: { required: true },
      is_active: true
    }
  ]
};

console.log("=== PocketBase Checkout Flow Collections Setup ===");
console.log("\n1. Create these collections in your PocketBase admin:");
console.log("\nCollection Schemas:");
console.log("- checkout_flows:", JSON.stringify(checkoutFlowsSchema, null, 2));
console.log("- checkout_steps:", JSON.stringify(checkoutStepsSchema, null, 2));
console.log("- payment_methods:", JSON.stringify(paymentMethodsSchema, null, 2));
console.log("- checkout_conditions:", JSON.stringify(checkoutConditionsSchema, null, 2));

console.log("\n2. Insert this default data:");
console.log(JSON.stringify(defaultData, null, 2));

console.log("\n3. Set up collection rules:");
console.log("- All collections: Admin-only write access");
console.log("- checkout_flows, payment_methods: Public read access for active records");
console.log("- checkout_steps, checkout_conditions: Public read access");

module.exports = {
  checkoutFlowsSchema,
  checkoutStepsSchema,
  paymentMethodsSchema,
  checkoutConditionsSchema,
  defaultData
};
