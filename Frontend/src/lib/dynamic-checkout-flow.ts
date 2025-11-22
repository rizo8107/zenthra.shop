import { pocketbase } from './pocketbase';

// Types matching the backend service
export interface CheckoutFlow {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  conditions?: CheckoutCondition[];
  settings?: Record<string, any>;
  created: string;
  updated: string;
}

export interface PaymentMethod {
  id: string;
  method_key: string;
  name: string;
  description?: string;
  icon?: string;
  is_enabled: boolean;
  priority: number;
  conditions?: CheckoutCondition[];
  settings?: Record<string, any>;
  created: string;
  updated: string;
}

export interface CheckoutCondition {
  id?: string;
  name?: string;
  condition_type: string;
  description?: string;
  operator?: string;
  value?: any;
  is_active?: boolean;
  // Legacy support
  type?: string;
  amount?: number;
  state?: string;
  country?: string;
}

export interface CheckoutContext {
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  total: number;
  destinationState?: string;
  destinationCountry?: string;
  isGuest: boolean;
  items: Array<{
    productId: string;
    category?: string;
    tags?: string[];
    tn_shipping_enabled?: boolean;
  }>;
}

// Cache for checkout flow data
let cachedFlow: CheckoutFlow | null = null;
let cachedPaymentMethods: PaymentMethod[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ===== CHECKOUT FLOW FETCHING =====

export async function getActiveCheckoutFlow(): Promise<CheckoutFlow | null> {
  try {
    // Check cache first
    if (cachedFlow && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedFlow;
    }

    const record = await pocketbase.collection('checkout_flows').getFirstListItem(
      'is_active = true',
      {
        sort: '-is_default,-priority',
        $autoCancel: false,
      }
    );

    cachedFlow = record as CheckoutFlow;
    cacheTimestamp = Date.now();
    return cachedFlow;
  } catch (error) {
    console.error('Error fetching active checkout flow:', error);
    
    // Fallback to legacy flow
    const { getDefaultCheckoutFlow } = await import('./checkoutFlow');
    const legacyFlow = getDefaultCheckoutFlow();
    
    return {
      id: 'legacy',
      name: legacyFlow.name,
      description: 'Legacy checkout flow',
      is_active: true,
      is_default: true,
      priority: 1,
      conditions: [],
      settings: {},
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
  }
}

export async function getEnabledPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    // Check cache first
    if (cachedPaymentMethods.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedPaymentMethods;
    }

    const records = await pocketbase.collection('payment_methods').getFullList({
      filter: 'is_enabled = true',
      sort: 'priority,name',
      $autoCancel: false,
    });

    cachedPaymentMethods = records as PaymentMethod[];
    cacheTimestamp = Date.now();
    return cachedPaymentMethods;
  } catch (error) {
    console.error('Error fetching enabled payment methods:', error);
    
    // Fallback to legacy payment rules
    const { getDefaultCheckoutFlow } = await import('./checkoutFlow');
    const legacyFlow = getDefaultCheckoutFlow();
    
    return legacyFlow.paymentRules.map((rule, index) => ({
      id: `legacy-${rule.method}`,
      method_key: rule.method,
      name: rule.label,
      description: rule.description,
      icon: rule.method === 'cod' ? 'Truck' : 'CreditCard',
      is_enabled: true,
      priority: index + 1,
      conditions: rule.conditions?.map(c => ({
        condition_type: c.type,
        value: {
          amount: c.amount,
          state: c.state,
          country: c.country,
          required: c.value
        },
        is_active: true,
        // Legacy fields for backward compatibility
        type: c.type,
        amount: c.amount,
        state: c.state,
        country: c.country
      })) || [],
      settings: {},
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }));
  }
}

// ===== CONDITION EVALUATION =====

export function evaluateCondition(condition: CheckoutCondition, context: CheckoutContext): boolean {
  const type = condition.condition_type || condition.type;
  
  switch (type) {
    case 'min_total': {
      const amount = condition.value?.amount || condition.amount || 0;
      return context.total >= amount;
    }
    
    case 'max_total': {
      const amount = condition.value?.amount || condition.amount || Number.POSITIVE_INFINITY;
      return context.total <= amount;
    }
    
    case 'state_is': {
      const state = condition.value?.state || condition.state;
      if (!state) return true;
      return (context.destinationState || '').toLowerCase() === state.toLowerCase();
    }
    
    case 'state_is_not': {
      const state = condition.value?.state || condition.state;
      if (!state) return true;
      return (context.destinationState || '').toLowerCase() !== state.toLowerCase();
    }
    
    case 'country_is': {
      const country = condition.value?.country || condition.country;
      if (!country) return true;
      return (context.destinationCountry || 'india').toLowerCase() === country.toLowerCase();
    }
    
    case 'user_logged_in': {
      const required = condition.value?.required !== false;
      return required ? !context.isGuest : context.isGuest;
    }
    
    case 'tn_shipping_restricted': {
      const hasRestrictedItem = context.items.some(item => item.tn_shipping_enabled === false);
      const checkValue = condition.value?.value !== undefined ? condition.value.value : condition.value;
      
      if (checkValue === true) return hasRestrictedItem;
      if (checkValue === false) return !hasRestrictedItem;
      return hasRestrictedItem;
    }
    
    case 'cart_item_count': {
      const count = context.items.length;
      const targetCount = condition.value?.count || 0;
      const operator = condition.operator || 'greater_equal';
      
      switch (operator) {
        case 'equals': return count === targetCount;
        case 'not_equals': return count !== targetCount;
        case 'greater_than': return count > targetCount;
        case 'less_than': return count < targetCount;
        case 'greater_equal': return count >= targetCount;
        case 'less_equal': return count <= targetCount;
        default: return true;
      }
    }
    
    case 'product_category': {
      const targetCategory = condition.value?.category;
      if (!targetCategory) return true;
      
      const hasCategory = context.items.some(item => 
        item.category?.toLowerCase() === targetCategory.toLowerCase()
      );
      
      return condition.operator === 'not_contains' ? !hasCategory : hasCategory;
    }
    
    case 'product_tag': {
      const targetTag = condition.value?.tag;
      if (!targetTag) return true;
      
      const hasTag = context.items.some(item => 
        item.tags?.some(tag => tag.toLowerCase() === targetTag.toLowerCase())
      );
      
      return condition.operator === 'not_contains' ? !hasTag : hasTag;
    }
    
    default:
      return true;
  }
}

export function evaluateAllConditions(conditions: CheckoutCondition[] | undefined, context: CheckoutContext): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every(condition => evaluateCondition(condition, context));
}

// ===== PAYMENT METHOD FILTERING =====

export async function getAvailablePaymentMethods(context: CheckoutContext): Promise<PaymentMethod[]> {
  try {
    const allMethods = await getEnabledPaymentMethods();
    
    return allMethods.filter(method => {
      if (!method.conditions || method.conditions.length === 0) return true;
      return evaluateAllConditions(method.conditions, context);
    });
  } catch (error) {
    console.error('Error filtering payment methods:', error);
    return [];
  }
}

// ===== LEGACY COMPATIBILITY =====

// Convert dynamic payment methods to legacy format for existing checkout code
export async function getEnabledPaymentMethodsForDefaultFlow(context: CheckoutContext) {
  const methods = await getAvailablePaymentMethods(context);
  
  return methods.map(method => ({
    method: method.method_key,
    label: method.name,
    description: method.description,
    conditions: method.conditions?.map(c => ({
      type: c.condition_type || c.type,
      amount: c.value?.amount || c.amount,
      state: c.value?.state || c.state,
      country: c.value?.country || c.country,
      value: c.value?.required !== undefined ? c.value.required : c.value
    })) || []
  }));
}

// ===== CACHE MANAGEMENT =====

export function clearCheckoutFlowCache() {
  cachedFlow = null;
  cachedPaymentMethods = [];
  cacheTimestamp = 0;
}

// ===== CHECKOUT FLOW UTILITIES =====

export async function getCheckoutFlowSettings(): Promise<Record<string, any>> {
  const flow = await getActiveCheckoutFlow();
  return flow?.settings || {
    allow_guest_checkout: true,
    require_phone_verification: false,
    auto_apply_coupons: true
  };
}

export async function shouldAllowGuestCheckout(): Promise<boolean> {
  const settings = await getCheckoutFlowSettings();
  return settings.allow_guest_checkout !== false;
}

export async function shouldRequirePhoneVerification(): Promise<boolean> {
  const settings = await getCheckoutFlowSettings();
  return settings.require_phone_verification === true;
}

export async function shouldAutoApplyCoupons(): Promise<boolean> {
  const settings = await getCheckoutFlowSettings();
  return settings.auto_apply_coupons !== false;
}
