import { pb } from './pocketbase';

// Types for the new PocketBase collections
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

export interface CheckoutStep {
  id: string;
  flow_id: string;
  step_type: 'collect_shipping' | 'collect_contact' | 'review_order' | 'select_payment_method' | 'create_order_record' | 'start_payment_gateway' | 'custom';
  label: string;
  description?: string;
  order_index: number;
  is_enabled: boolean;
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
  condition_type: 'min_total' | 'max_total' | 'state_is' | 'state_is_not' | 'country_is' | 'user_logged_in' | 'tn_shipping_restricted' | 'product_category' | 'product_tag' | 'cart_item_count' | 'custom';
  description?: string;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value?: any;
  is_active?: boolean;
  // Legacy support for existing checkoutFlow.ts format
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

// ===== CHECKOUT FLOWS =====

export async function getCheckoutFlows(): Promise<CheckoutFlow[]> {
  try {
    const records = await pb.collection('checkout_flows').getFullList<CheckoutFlow>({
      sort: '-priority,name',
      $autoCancel: false,
    });
    return records;
  } catch (error) {
    console.error('Error fetching checkout flows:', error);
    return [];
  }
}

export async function getActiveCheckoutFlow(): Promise<CheckoutFlow | null> {
  try {
    const record = await pb.collection('checkout_flows').getFirstListItem<CheckoutFlow>(
      'is_active = true',
      {
        sort: '-is_default,-priority',
        $autoCancel: false,
      }
    );
    return record;
  } catch (error) {
    console.error('Error fetching active checkout flow:', error);
    return null;
  }
}

export async function createCheckoutFlow(data: Partial<CheckoutFlow>): Promise<CheckoutFlow | null> {
  try {
    const record = await pb.collection('checkout_flows').create<CheckoutFlow>(data);
    return record;
  } catch (error) {
    console.error('Error creating checkout flow:', error);
    return null;
  }
}

export async function updateCheckoutFlow(id: string, data: Partial<CheckoutFlow>): Promise<CheckoutFlow | null> {
  try {
    const record = await pb.collection('checkout_flows').update<CheckoutFlow>(id, data);
    return record;
  } catch (error) {
    console.error('Error updating checkout flow:', error);
    return null;
  }
}

export async function deleteCheckoutFlow(id: string): Promise<boolean> {
  try {
    await pb.collection('checkout_flows').delete(id);
    return true;
  } catch (error) {
    console.error('Error deleting checkout flow:', error);
    return false;
  }
}

// ===== CHECKOUT STEPS =====

export async function getCheckoutSteps(flowId: string): Promise<CheckoutStep[]> {
  try {
    const records = await pb.collection('checkout_steps').getFullList<CheckoutStep>({
      filter: `flow_id = "${flowId}"`,
      sort: 'order_index',
      $autoCancel: false,
    });
    return records;
  } catch (error) {
    console.error('Error fetching checkout steps:', error);
    return [];
  }
}

export async function createCheckoutStep(data: Partial<CheckoutStep>): Promise<CheckoutStep | null> {
  try {
    const record = await pb.collection('checkout_steps').create<CheckoutStep>(data);
    return record;
  } catch (error) {
    console.error('Error creating checkout step:', error);
    return null;
  }
}

export async function updateCheckoutStep(id: string, data: Partial<CheckoutStep>): Promise<CheckoutStep | null> {
  try {
    const record = await pb.collection('checkout_steps').update<CheckoutStep>(id, data);
    return record;
  } catch (error) {
    console.error('Error updating checkout step:', error);
    return null;
  }
}

export async function deleteCheckoutStep(id: string): Promise<boolean> {
  try {
    await pb.collection('checkout_steps').delete(id);
    return true;
  } catch (error) {
    console.error('Error deleting checkout step:', error);
    return false;
  }
}

// ===== PAYMENT METHODS =====

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const records = await pb.collection('payment_methods').getFullList<PaymentMethod>({
      sort: 'priority,name',
      $autoCancel: false,
    });
    return records;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }
}

export async function getEnabledPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const records = await pb.collection('payment_methods').getFullList<PaymentMethod>({
      filter: 'is_enabled = true',
      sort: 'priority,name',
      $autoCancel: false,
    });
    return records;
  } catch (error) {
    console.error('Error fetching enabled payment methods:', error);
    return [];
  }
}

export async function createPaymentMethod(data: Partial<PaymentMethod>): Promise<PaymentMethod | null> {
  try {
    const record = await pb.collection('payment_methods').create<PaymentMethod>(data);
    return record;
  } catch (error) {
    console.error('Error creating payment method:', error);
    return null;
  }
}

export async function updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | null> {
  try {
    const record = await pb.collection('payment_methods').update<PaymentMethod>(id, data);
    return record;
  } catch (error) {
    console.error('Error updating payment method:', error);
    return null;
  }
}

export async function deletePaymentMethod(id: string): Promise<boolean> {
  try {
    await pb.collection('payment_methods').delete(id);
    return true;
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return false;
  }
}

// ===== CONDITION EVALUATION =====

export function evaluateCondition(condition: CheckoutCondition, context: CheckoutContext): boolean {
  // Support both new and legacy condition formats
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

// ===== MIGRATION HELPERS =====

export async function migrateFromLegacyFlow(): Promise<boolean> {
  try {
    // Check if collections exist and are empty
    const existingFlows = await getCheckoutFlows();
    if (existingFlows.length > 0) {
      console.log('Checkout flows already exist, skipping migration');
      return true;
    }

    // Import the legacy flow
    const { DEFAULT_CHECKOUT_FLOW } = await import('./checkoutFlow');
    
    // Create the default flow
    const flow = await createCheckoutFlow({
      name: DEFAULT_CHECKOUT_FLOW.name,
      description: 'Migrated from legacy checkout flow configuration',
      is_active: true,
      is_default: true,
      priority: 1,
      conditions: [],
      settings: {
        allow_guest_checkout: true,
        require_phone_verification: false
      }
    });

    if (!flow) {
      throw new Error('Failed to create checkout flow');
    }

    // Create steps
    for (const step of DEFAULT_CHECKOUT_FLOW.steps) {
      await createCheckoutStep({
        flow_id: flow.id,
        step_type: step.type as any,
        label: step.label,
        order_index: step.order,
        is_enabled: true,
        conditions: step.conditions || [],
        settings: {}
      });
    }

    // Create payment methods
    for (const rule of DEFAULT_CHECKOUT_FLOW.paymentRules) {
      await createPaymentMethod({
        method_key: rule.method,
        name: rule.label,
        description: rule.description,
        icon: rule.method === 'cod' ? 'Truck' : 'CreditCard',
        is_enabled: true,
        priority: rule.method === 'razorpay' ? 1 : 2,
        conditions: rule.conditions || [],
        settings: {}
      });
    }

    console.log('Successfully migrated legacy checkout flow');
    return true;
  } catch (error) {
    console.error('Error migrating checkout flow:', error);
    return false;
  }
}
