// Checkout Flow Builder
// Central place to define checkout steps, conditions, and payment rules

export type CheckoutPaymentMethod = 'razorpay' | 'cod' | 'free' | 'manual';

export type CheckoutConditionType =
  | 'min_total'
  | 'max_total'
  | 'state_is'
  | 'state_is_not'
  | 'country_is'
  | 'user_logged_in'
  | 'tn_shipping_restricted';

export interface CheckoutCondition {
  type: CheckoutConditionType;
  // For min/max total
  amount?: number;
  // For state / country matching
  state?: string;
  country?: string;
  // For tn_shipping_restricted, value=true means "only if restricted items exist",
  // value=false means "only if there are NO restricted items".
  value?: boolean;
}

export type CheckoutStepType =
  | 'collect_shipping'
  | 'collect_contact'
  | 'review_order'
  | 'select_payment_method'
  | 'create_order_record'
  | 'start_payment_gateway';

export interface CheckoutStep {
  id: string;
  type: CheckoutStepType;
  label: string;
  order: number;
  conditions?: CheckoutCondition[];
}

export interface CheckoutPaymentRule {
  method: CheckoutPaymentMethod;
  label: string;
  description?: string;
  conditions?: CheckoutCondition[];
}

export interface CheckoutFlowConfig {
  id: string;
  name: string;
  isDefault: boolean;
  steps: CheckoutStep[];
  paymentRules: CheckoutPaymentRule[];
}

export interface CheckoutItemContext {
  productId: string;
  category?: string;
  tags?: string[];
  // From Product.tn_shipping_enabled (false means restricted for Tamil Nadu)
  tn_shipping_enabled?: boolean;
}

export interface CheckoutContext {
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  total: number;
  destinationState?: string;
  destinationCountry?: string;
  isGuest: boolean;
  items: CheckoutItemContext[];
}

// ----- Condition evaluation -----

export function evaluateCondition(
  condition: CheckoutCondition,
  ctx: CheckoutContext,
): boolean {
  switch (condition.type) {
    case 'min_total': {
      const min = condition.amount ?? 0;
      return ctx.total >= min;
    }
    case 'max_total': {
      const max = condition.amount ?? Number.POSITIVE_INFINITY;
      return ctx.total <= max;
    }
    case 'state_is': {
      if (!condition.state) return true;
      return (ctx.destinationState || '').toLowerCase() === condition.state.toLowerCase();
    }
    case 'state_is_not': {
      if (!condition.state) return true;
      return (ctx.destinationState || '').toLowerCase() !== condition.state.toLowerCase();
    }
    case 'country_is': {
      if (!condition.country) return true;
      return (ctx.destinationCountry || 'india').toLowerCase() === condition.country.toLowerCase();
    }
    case 'user_logged_in': {
      // In our context, isGuest=false means logged in
      const shouldBeLoggedIn = condition.value !== false; // default true
      return shouldBeLoggedIn ? !ctx.isGuest : ctx.isGuest;
    }
    case 'tn_shipping_restricted': {
      const hasRestrictedItem = ctx.items.some(
        (item) => item.tn_shipping_enabled === false,
      );
      // value=true  -> only if restricted items exist
      // value=false -> only if NO restricted items
      if (condition.value === true) return hasRestrictedItem;
      if (condition.value === false) return !hasRestrictedItem;
      // If value not provided, just report whether restricted items exist
      return hasRestrictedItem;
    }
    default:
      return true;
  }
}

export function evaluateAllConditions(
  conditions: CheckoutCondition[] | undefined,
  ctx: CheckoutContext,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, ctx));
}

// ----- Default flow configuration -----

export const DEFAULT_CHECKOUT_FLOW: CheckoutFlowConfig = {
  id: 'default',
  name: 'Default Checkout Flow',
  isDefault: true,
  steps: [
    {
      id: 'shipping',
      type: 'collect_shipping',
      label: 'Shipping Address',
      order: 1,
    },
    {
      id: 'contact',
      type: 'collect_contact',
      label: 'Contact Details',
      order: 2,
    },
    {
      id: 'review',
      type: 'review_order',
      label: 'Review Order',
      order: 3,
    },
    {
      id: 'payment-method',
      type: 'select_payment_method',
      label: 'Choose Payment Method',
      order: 4,
    },
    {
      id: 'create-order',
      type: 'create_order_record',
      label: 'Create Order',
      order: 5,
    },
    {
      id: 'start-payment',
      type: 'start_payment_gateway',
      label: 'Start Payment',
      order: 6,
    },
  ],
  paymentRules: [
    {
      method: 'razorpay',
      label: 'UPI / Cards / Wallets (Razorpay)',
      description: 'Fast online payment using Razorpay.',
      conditions: [
        {
          type: 'min_total',
          amount: 1,
        },
      ],
    },
    {
      method: 'cod',
      label: 'Cash on Delivery',
      description:
        'Allow COD only for smaller orders, outside Tamil Nadu, and without TN-restricted products.',
      conditions: [
        {
          // Only for orders up to ₹2,000
          type: 'max_total',
          amount: 2000,
        },
        {
          // Disallow COD for Tamil Nadu (can be relaxed later)
          type: 'state_is_not',
          state: 'Tamil Nadu',
        },
        {
          // COD only if there are NO TN-restricted products in cart
          type: 'tn_shipping_restricted',
          value: false,
        },
      ],
    },
  ],
};

// ----- Public helpers -----

/**
 * Return the default checkout flow configuration.
 */
export function getDefaultCheckoutFlow(): CheckoutFlowConfig {
  return DEFAULT_CHECKOUT_FLOW;
}

/**
 * Given a flow and a checkout context, return the enabled payment methods.
 */
export function getEnabledPaymentMethods(
  flow: CheckoutFlowConfig,
  ctx: CheckoutContext,
): CheckoutPaymentRule[] {
  return flow.paymentRules.filter((rule) =>
    evaluateAllConditions(rule.conditions, ctx),
  );
}

/**
 * Convenience helper: evaluate the default flow for a given context.
 */
export function getEnabledPaymentMethodsForDefaultFlow(
  ctx: CheckoutContext,
): CheckoutPaymentRule[] {
  return getEnabledPaymentMethods(DEFAULT_CHECKOUT_FLOW, ctx);
}
