
export interface User {
  id: string;
  email: string;
  name: string;
  created: string;
  role: 'admin' | 'customer';
}

export interface Address {
  id: string;
  user_id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  product_image?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export interface Order {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  // Optional direct customer fields when available
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_id?: string;
  payment_method?: string;
  shipping_address: Address;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  created: string;
  updated: string;
}

export interface DashboardMetrics {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_revenue: number;
  average_order_value: number;
  revenue_today: number;
}

export interface ProductSalesMetric {
  productId: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ProductSalesSummary {
  items: ProductSalesMetric[];
  totalProductsSold: number;
  totalItemsSold: number;
}

export interface CustomerOrderSummary {
  userId: string;
  name: string;
  email: string;
  phone: string;
  pbUserId?: string;
  totalOrders: number;
  totalSpend: number;
  averageOrderValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  averageGapDays: number | null;
  daysSinceLastOrder: number | null;
  topProducts: CustomerOrderProductSummary[];
}

export interface CustomerOrderAnalytics {
  customers: CustomerOrderSummary[];
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  topCustomersBySpend: CustomerOrderSummary[];
  topCustomersByOrders: CustomerOrderSummary[];
  orderDetails: Record<string, CustomerOrderDetail[]>;
  chart: CustomerOrdersChartPoint[];
}

export interface CustomerOrderDetail {
  id: string;
  total: number;
  status: string;
  paymentStatus?: string;
  created: string;
  itemsCount: number;
  email: string;
  phone: string;
  products: CustomerOrderProductSummary[];
}

export interface CustomerOrderProductSummary {
  productId: string;
  name: string;
  quantity: number;
}

export interface CustomerOrdersChartPoint {
  month: string;
  orders: number;
  revenue: number;
}

export interface AbandonedCartSummary {
  userId: string;
  name: string;
  email: string;
  phone: string;
  pbUserId?: string;
  pendingOrders: number;
  totalValue: number;
  averageOrderValue: number;
  firstPendingDate: string | null;
  lastPendingDate: string | null;
  daysSinceLastPending: number | null;
  topProducts: CustomerOrderProductSummary[];
}

export interface AbandonedCartDetail {
  id: string;
  total: number;
  status: string;
  paymentStatus?: string;
  created: string;
  itemsCount: number;
  email: string;
  phone: string;
  products: CustomerOrderProductSummary[];
}

export interface AbandonedCartAnalytics {
  customers: AbandonedCartSummary[];
  totalCustomers: number;
  totalPendingOrders: number;
  totalPendingValue: number;
  topCustomersByValue: AbandonedCartSummary[];
  topCustomersByOrders: AbandonedCartSummary[];
  orderDetails: Record<string, AbandonedCartDetail[]>;
  chart: CustomerOrdersChartPoint[];
}
