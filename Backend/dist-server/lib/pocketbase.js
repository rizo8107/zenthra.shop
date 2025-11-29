import PocketBase from 'pocketbase';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
// Initialize PocketBase with the URL from environment variables (supports Vite and Node)
const VITE_ENV = (() => {
    try {
        return import.meta?.env ?? {};
    }
    catch {
        return {};
    }
})();
// Default URL from environment
const DEFAULT_POCKETBASE_URL = VITE_ENV.VITE_POCKETBASE_URL ||
    (typeof process !== 'undefined' ? process.env?.VITE_POCKETBASE_URL : undefined) ||
    (typeof window !== 'undefined' && window.__ENV__?.VITE_POCKETBASE_URL) ||
    'https://backend.viruthigold.in';
// Get stored URL for native apps
let POCKETBASE_URL = DEFAULT_POCKETBASE_URL;
// For native apps, try to get stored URL synchronously from localStorage as fallback
// (Preferences is async, so we use localStorage for initial load)
if (Capacitor.isNativePlatform() && typeof localStorage !== 'undefined') {
    const storedUrl = localStorage.getItem('zenthra_pocketbase_url');
    if (storedUrl) {
        POCKETBASE_URL = storedUrl;
        console.log('✓ Using stored PocketBase URL:', POCKETBASE_URL);
    }
}
console.log('✓ PocketBase URL:', POCKETBASE_URL);
export const pb = new PocketBase(POCKETBASE_URL);
// Disable auto-cancellation of requests which is causing issues
pb.autoCancellation(false);
/**
 * Update PocketBase URL dynamically (for native app configuration)
 */
export async function updatePocketBaseUrl(newUrl) {
    const cleanUrl = newUrl.trim().replace(/\/$/, '');
    // Update the PocketBase instance
    pb.baseUrl = cleanUrl;
    // Store in localStorage for sync access on next load
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('zenthra_pocketbase_url', cleanUrl);
    }
    // Also store in Capacitor Preferences
    if (Capacitor.isNativePlatform()) {
        await Preferences.set({
            key: 'zenthra_pocketbase_url',
            value: cleanUrl,
        });
    }
    console.log('✓ PocketBase URL updated to:', cleanUrl);
}
/**
 * Get current PocketBase URL
 */
export function getPocketBaseUrl() {
    return pb.baseUrl || POCKETBASE_URL;
}
/**
 * Derive the public storefront base URL from the current backend / PocketBase URL.
 *
 * Examples:
 *  - https://backend.karigaistore.in -> https://karigaistore.in
 *  - https://admin.mystore.com       -> https://mystore.com
 *  - https://api.shop.example.com    -> https://shop.example.com
 *
 * On native apps, this uses the dynamically configured PocketBase URL
 * (whatever the user entered on the Configure Backend screen).
 * On web, if VITE_ZENTHRA_FRONTEND_URL is set, that is preferred.
 */
export function getStorefrontBaseUrl() {
    // Prefer explicit frontend URL on web
    const envFrontend = VITE_ENV.VITE_ZENTHRA_FRONTEND_URL;
    if (!Capacitor.isNativePlatform() && envFrontend) {
        return envFrontend.replace(/\/$/, '');
    }
    const rawBase = getPocketBaseUrl();
    try {
        const url = new URL(rawBase);
        const hostParts = url.hostname.split('.');
        if (hostParts.length > 2) {
            const sub = hostParts[0].toLowerCase();
            if (['backend', 'admin', 'api', 'app'].includes(sub)) {
                hostParts.shift();
                url.hostname = hostParts.join('.');
            }
        }
        return url.origin.replace(/\/$/, '');
    }
    catch {
        return rawBase.replace(/\/$/, '');
    }
}
// Ensure a user is authenticated (no auto-admin)
export const ensureAdminAuth = async () => {
    try {
        if (pb.authStore.isValid) {
            return pb.authStore.model;
        }
        throw new Error('Not authenticated');
    }
    catch (error) {
        console.error('Auth check failed:', error);
        throw error;
    }
};
const parseOrderProducts = (raw) => {
    if (!raw)
        return [];
    if (Array.isArray(raw)) {
        return raw.filter((item) => typeof item === 'object' && item !== null);
    }
    if (typeof raw === 'string') {
        let s = raw.trim();
        if (!s)
            return [];
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            try {
                s = JSON.parse(s);
            }
            catch {
                s = s.slice(1, -1);
            }
        }
        if (/""/.test(s))
            s = s.replace(/""/g, '"');
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) {
                return parsed.filter((item) => typeof item === 'object' && item !== null);
            }
        }
        catch {
            return [];
        }
    }
    return [];
};
export const getProductSalesSummary = async (filters) => {
    await ensureAdminAuth();
    const { startDate, endDate } = filters ?? {};
    const options = {
        sort: '-created',
    };
    if (startDate || endDate) {
        const conditions = [];
        if (startDate)
            conditions.push(`created >= "${startDate}"`);
        if (endDate)
            conditions.push(`created <= "${endDate}"`);
        options.filter = conditions.join(' && ');
    }
    const orders = await pb.collection('orders').getFullList(options);
    const metricsMap = new Map();
    orders.forEach((order) => {
        const products = parseOrderProducts(order.products);
        products.forEach((record) => {
            const rawId = record.productId ?? record.product_id ?? record.id;
            const productId = rawId === undefined || rawId === null ? '' : String(rawId);
            if (!productId)
                return;
            const rawQuantity = record.quantity ?? record.totalQuantity ?? 0;
            const quantity = Number(rawQuantity);
            if (!Number.isFinite(quantity) || quantity <= 0)
                return;
            const rawUnitPrice = record.unitPrice ?? record.totalRevenue ?? record.price ?? record.product?.price ?? 0;
            const unitPrice = Number(rawUnitPrice);
            const productNameCandidate = record.product?.name ?? record.name;
            const productName = typeof productNameCandidate === 'string' && productNameCandidate.trim().length > 0
                ? productNameCandidate.trim()
                : 'Unknown Product';
            const current = metricsMap.get(productId) ?? {
                productId,
                name: productName,
                totalQuantity: 0,
                totalRevenue: 0,
            };
            current.totalQuantity += quantity;
            current.totalRevenue += quantity * (Number.isFinite(unitPrice) ? unitPrice : 0);
            metricsMap.set(productId, current);
        });
    });
    const items = Array.from(metricsMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
    const totalItemsSold = items.reduce((sum, item) => sum + item.totalQuantity, 0);
    return {
        items,
        totalProductsSold: items.length,
        totalItemsSold,
    };
};
export const getCustomerOrderAnalytics = async () => {
    await ensureAdminAuth();
    const orders = await pb.collection('orders').getFullList({
        sort: '-created',
        expand: 'user_id',
    });
    const summaryMap = new Map();
    const orderDetails = {};
    const productTotalsByCustomer = new Map();
    const chartMap = new Map();
    const now = Date.now();
    let totalOrders = 0;
    let totalRevenue = 0;
    orders.forEach((order) => {
        if ((order.payment_status ?? '').toString().toLowerCase() !== 'paid') {
            return;
        }
        const expandRecord = order.expand;
        const expandedUser = expandRecord?.['user_id'];
        const emailCandidate = expandedUser?.email ?? order.customer_email ?? '';
        const phoneCandidate = expandedUser?.phone ?? order.customer_phone ?? '';
        const normalizedEmail = typeof emailCandidate === 'string' ? emailCandidate.trim().toLowerCase() : '';
        const normalizedPhone = typeof phoneCandidate === 'string' ? phoneCandidate.replace(/\D/g, '') : '';
        if (!normalizedEmail && !normalizedPhone) {
            return;
        }
        const nameCandidate = expandedUser?.name ?? order.customer_name ?? '';
        const name = typeof nameCandidate === 'string' && nameCandidate.trim().length > 0 ? nameCandidate.trim() : 'Unknown customer';
        const email = normalizedEmail;
        const phone = normalizedPhone;
        const key = `${email}::${phone}`;
        const orderTotal = Number(order.total ?? 0);
        const createdAt = typeof order.created === 'string' ? order.created : null;
        const createdDate = createdAt ? new Date(createdAt) : null;
        const summaryEntry = summaryMap.get(key) ?? {
            summary: {
                userId: key,
                name,
                email,
                phone,
                pbUserId: expandedUser?.id,
                totalOrders: 0,
                totalSpend: 0,
                averageOrderValue: 0,
                firstOrderDate: null,
                lastOrderDate: null,
                averageGapDays: null,
                daysSinceLastOrder: null,
                topProducts: [],
            },
            orderDates: [],
        };
        summaryEntry.summary.totalOrders += 1;
        summaryEntry.summary.totalSpend += Number.isFinite(orderTotal) ? orderTotal : 0;
        if (createdDate && !Number.isNaN(createdDate.getTime())) {
            summaryEntry.orderDates.push(createdDate);
        }
        summaryMap.set(key, summaryEntry);
        const parsedProducts = parseOrderProducts(order.products);
        const totalItems = parsedProducts.reduce((sum, item) => {
            const quantity = Number(item.quantity ?? item.totalQuantity ?? 0);
            return Number.isFinite(quantity) ? sum + quantity : sum;
        }, 0);
        const perOrderProductMap = new Map();
        parsedProducts.forEach((item) => {
            const rawId = item.productId ?? item.product_id ?? item.id;
            const productId = rawId === undefined || rawId === null ? '' : String(rawId);
            if (!productId)
                return;
            const quantity = Number(item.quantity ?? item.totalQuantity ?? 0);
            if (!Number.isFinite(quantity) || quantity <= 0)
                return;
            const productNameCandidate = item.product?.name ?? item.name;
            const productName = typeof productNameCandidate === 'string' && productNameCandidate.trim().length > 0
                ? productNameCandidate.trim()
                : 'Unnamed product';
            const customerProductTotals = productTotalsByCustomer.get(key) ?? new Map();
            const currentTotal = customerProductTotals.get(productId) ?? { name: productName, quantity: 0 };
            currentTotal.quantity += quantity;
            customerProductTotals.set(productId, currentTotal);
            productTotalsByCustomer.set(key, customerProductTotals);
            const orderProduct = perOrderProductMap.get(productId) ?? { name: productName, quantity: 0 };
            orderProduct.quantity += quantity;
            perOrderProductMap.set(productId, orderProduct);
        });
        const detailsArray = orderDetails[key] ?? [];
        detailsArray.push({
            id: order.id,
            total: Number.isFinite(orderTotal) ? orderTotal : 0,
            status: typeof order.status === 'string' ? order.status : 'unknown',
            paymentStatus: typeof order.payment_status === 'string' ? order.payment_status : undefined,
            created: createdAt ?? '',
            itemsCount: totalItems,
            email,
            phone,
            products: Array.from(perOrderProductMap.entries()).map(([productId, info]) => ({
                productId,
                name: info.name,
                quantity: info.quantity,
            })),
        });
        orderDetails[key] = detailsArray;
        if (Number.isFinite(orderTotal)) {
            totalRevenue += orderTotal;
        }
        totalOrders += 1;
        if (createdDate && !Number.isNaN(createdDate.getTime())) {
            const monthKey = `${createdDate.getUTCFullYear()}-${String(createdDate.getUTCMonth() + 1).padStart(2, '0')}`;
            const chartEntry = chartMap.get(monthKey) ?? { orders: 0, revenue: 0 };
            chartEntry.orders += 1;
            chartEntry.revenue += Number.isFinite(orderTotal) ? orderTotal : 0;
            chartMap.set(monthKey, chartEntry);
        }
    });
    const customers = Array.from(summaryMap.values()).map(({ summary, orderDates }) => {
        if (orderDates.length > 0) {
            const sortedDates = [...orderDates].sort((a, b) => a.getTime() - b.getTime());
            summary.firstOrderDate = sortedDates[0].toISOString();
            summary.lastOrderDate = sortedDates[sortedDates.length - 1].toISOString();
            if (sortedDates.length > 1) {
                let gapTotal = 0;
                for (let i = 1; i < sortedDates.length; i++) {
                    gapTotal += sortedDates[i].getTime() - sortedDates[i - 1].getTime();
                }
                const avgGapDays = gapTotal / (sortedDates.length - 1) / (1000 * 60 * 60 * 24);
                summary.averageGapDays = Number.isFinite(avgGapDays) ? Math.round(avgGapDays * 10) / 10 : null;
            }
            const lastDate = sortedDates[sortedDates.length - 1].getTime();
            const daysSince = (now - lastDate) / (1000 * 60 * 60 * 24);
            summary.daysSinceLastOrder = Number.isFinite(daysSince) ? Math.round(daysSince * 10) / 10 : null;
        }
        summary.averageOrderValue = summary.totalOrders > 0
            ? Math.round((summary.totalSpend / summary.totalOrders) * 100) / 100
            : 0;
        const customerKey = summary.userId;
        const details = orderDetails[customerKey] ?? [];
        orderDetails[customerKey] = details.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        const productTotals = productTotalsByCustomer.get(customerKey);
        if (productTotals) {
            summary.topProducts = Array.from(productTotals.entries())
                .map(([productId, info]) => ({ productId, name: info.name, quantity: info.quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);
        }
        return summary;
    });
    const sortedBySpend = [...customers].sort((a, b) => b.totalSpend - a.totalSpend);
    const sortedByOrders = [...customers].sort((a, b) => b.totalOrders - a.totalOrders);
    const chart = Array.from(chartMap.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([month, data]) => ({ month, orders: data.orders, revenue: Math.round(data.revenue * 100) / 100 }));
    return {
        customers: sortedBySpend,
        totalCustomers: customers.length,
        totalOrders,
        totalRevenue,
        topCustomersBySpend: sortedBySpend.slice(0, 5),
        topCustomersByOrders: sortedByOrders.slice(0, 5),
        orderDetails,
        chart,
    };
};
export const getAbandonedCartAnalytics = async () => {
    await ensureAdminAuth();
    const orders = await pb.collection('orders').getFullList({
        sort: '-created',
        expand: 'user_id',
    });
    const summaryMap = new Map();
    const orderDetails = {};
    const productTotalsByCustomer = new Map();
    const chartMap = new Map();
    const now = Date.now();
    let totalPendingOrders = 0;
    let totalPendingValue = 0;
    orders.forEach((order) => {
        const paymentStatus = (order.payment_status ?? '').toString().toLowerCase();
        const status = (order.status ?? '').toString().toLowerCase();
        if (paymentStatus === 'paid' || status === 'cancelled') {
            return;
        }
        const expandRecord = order.expand;
        const expandedUser = expandRecord?.['user_id'];
        const emailCandidate = expandedUser?.email ?? order.customer_email ?? '';
        const phoneCandidate = expandedUser?.phone ?? order.customer_phone ?? '';
        const normalizedEmail = typeof emailCandidate === 'string' ? emailCandidate.trim().toLowerCase() : '';
        const normalizedPhone = typeof phoneCandidate === 'string' ? phoneCandidate.replace(/\D/g, '') : '';
        if (!normalizedEmail && !normalizedPhone) {
            return;
        }
        const nameCandidate = expandedUser?.name ?? order.customer_name ?? '';
        const name = typeof nameCandidate === 'string' && nameCandidate.trim().length > 0 ? nameCandidate.trim() : 'Unknown customer';
        const email = normalizedEmail;
        const phone = normalizedPhone;
        const key = `${email}::${phone}`;
        const orderTotal = Number(order.total ?? 0);
        const createdAt = typeof order.created === 'string' ? order.created : null;
        const createdDate = createdAt ? new Date(createdAt) : null;
        const summaryEntry = summaryMap.get(key) ?? {
            summary: {
                userId: key,
                name,
                email,
                phone,
                pbUserId: expandedUser?.id,
                pendingOrders: 0,
                totalValue: 0,
                averageOrderValue: 0,
                firstPendingDate: null,
                lastPendingDate: null,
                daysSinceLastPending: null,
                topProducts: [],
            },
            orderDates: [],
        };
        summaryEntry.summary.pendingOrders += 1;
        summaryEntry.summary.totalValue += Number.isFinite(orderTotal) ? orderTotal : 0;
        if (createdDate && !Number.isNaN(createdDate.getTime())) {
            summaryEntry.orderDates.push(createdDate);
        }
        summaryMap.set(key, summaryEntry);
        const parsedProducts = parseOrderProducts(order.products);
        const totalItems = parsedProducts.reduce((sum, item) => {
            const quantity = Number(item.quantity ?? item.totalQuantity ?? 0);
            return Number.isFinite(quantity) ? sum + quantity : sum;
        }, 0);
        const perOrderProductMap = new Map();
        parsedProducts.forEach((item) => {
            const rawId = item.productId ?? item.product_id ?? item.id;
            const productId = rawId === undefined || rawId === null ? '' : String(rawId);
            if (!productId)
                return;
            const quantity = Number(item.quantity ?? item.totalQuantity ?? 0);
            if (!Number.isFinite(quantity) || quantity <= 0)
                return;
            const productNameCandidate = item.product?.name ?? item.name;
            const productName = typeof productNameCandidate === 'string' && productNameCandidate.trim().length > 0
                ? productNameCandidate.trim()
                : 'Unnamed product';
            const customerProductTotals = productTotalsByCustomer.get(key) ?? new Map();
            const currentTotal = customerProductTotals.get(productId) ?? { name: productName, quantity: 0 };
            currentTotal.quantity += quantity;
            customerProductTotals.set(productId, currentTotal);
            productTotalsByCustomer.set(key, customerProductTotals);
            const orderProduct = perOrderProductMap.get(productId) ?? { name: productName, quantity: 0 };
            orderProduct.quantity += quantity;
            perOrderProductMap.set(productId, orderProduct);
        });
        const detailsArray = orderDetails[key] ?? [];
        detailsArray.push({
            id: order.id,
            total: Number.isFinite(orderTotal) ? orderTotal : 0,
            status: typeof order.status === 'string' ? order.status : 'unknown',
            paymentStatus: typeof order.payment_status === 'string' ? order.payment_status : undefined,
            created: createdAt ?? '',
            itemsCount: totalItems,
            email,
            phone,
            products: Array.from(perOrderProductMap.entries()).map(([productId, info]) => ({
                productId,
                name: info.name,
                quantity: info.quantity,
            })),
        });
        orderDetails[key] = detailsArray;
        if (Number.isFinite(orderTotal)) {
            totalPendingValue += orderTotal;
        }
        totalPendingOrders += 1;
        if (createdDate && !Number.isNaN(createdDate.getTime())) {
            const monthKey = `${createdDate.getUTCFullYear()}-${String(createdDate.getUTCMonth() + 1).padStart(2, '0')}`;
            const chartEntry = chartMap.get(monthKey) ?? { orders: 0, revenue: 0 };
            chartEntry.orders += 1;
            chartEntry.revenue += Number.isFinite(orderTotal) ? orderTotal : 0;
            chartMap.set(monthKey, chartEntry);
        }
    });
    const customers = Array.from(summaryMap.values()).map(({ summary, orderDates }) => {
        if (orderDates.length > 0) {
            const sortedDates = [...orderDates].sort((a, b) => a.getTime() - b.getTime());
            summary.firstPendingDate = sortedDates[0].toISOString();
            summary.lastPendingDate = sortedDates[sortedDates.length - 1].toISOString();
            const lastDate = sortedDates[sortedDates.length - 1].getTime();
            const daysSince = (now - lastDate) / (1000 * 60 * 60 * 24);
            summary.daysSinceLastPending = Number.isFinite(daysSince) ? Math.round(daysSince * 10) / 10 : null;
        }
        summary.averageOrderValue = summary.pendingOrders > 0
            ? Math.round((summary.totalValue / summary.pendingOrders) * 100) / 100
            : 0;
        const customerKey = summary.userId;
        const details = orderDetails[customerKey] ?? [];
        orderDetails[customerKey] = details.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        const productTotals = productTotalsByCustomer.get(customerKey);
        if (productTotals) {
            summary.topProducts = Array.from(productTotals.entries())
                .map(([productId, info]) => ({ productId, name: info.name, quantity: info.quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);
        }
        return summary;
    });
    const sortedByValue = [...customers].sort((a, b) => b.totalValue - a.totalValue);
    const sortedByOrders = [...customers].sort((a, b) => b.pendingOrders - a.pendingOrders);
    const chart = Array.from(chartMap.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([month, data]) => ({ month, orders: data.orders, revenue: Math.round(data.revenue * 100) / 100 }));
    return {
        customers: sortedByValue,
        totalCustomers: customers.length,
        totalPendingOrders,
        totalPendingValue,
        topCustomersByValue: sortedByValue.slice(0, 5),
        topCustomersByOrders: sortedByOrders.slice(0, 5),
        orderDetails,
        chart,
    };
};
// User login using default PocketBase users collection
export const authenticateAdmin = async (email, password) => {
    try {
        console.log('Attempting authentication with PocketBase at:', POCKETBASE_URL);
        // Clear any existing auth before attempting new login
        pb.authStore.clear();
        const authData = await pb.collection('users').authWithPassword(email, password);
        console.log('Authentication successful:', authData.record?.email);
        return authData;
    }
    catch (error) {
        console.error('Authentication error:', error);
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Cannot connect to PocketBase server. Please check if PocketBase is running and the URL is correct.');
            }
            else if (error.message.includes('400')) {
                throw new Error('Invalid email or password.');
            }
            else if (error.message.includes('CORS')) {
                throw new Error('CORS error: Please check PocketBase CORS settings.');
            }
        }
        throw error;
    }
};
// Helper functions for orders
export const getOrders = async (limit = 50) => {
    try {
        await ensureAdminAuth();
        const records = await pb.collection('orders').getList(1, limit, {
            sort: '-created',
            expand: 'user_id,shipping_address',
        });
        return records;
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
};
export const getOrderById = async (id) => {
    try {
        await ensureAdminAuth();
        const record = await pb.collection('orders').getOne(id, {
            expand: 'user_id,shipping_address,items',
        });
        return record;
    }
    catch (error) {
        console.error(`Error fetching order ${id}:`, error);
        throw error;
    }
};
export const updateOrderStatus = async (id, status) => {
    try {
        await ensureAdminAuth();
        const record = await pb.collection('orders').update(id, { status });
        return record;
    }
    catch (error) {
        console.error(`Error updating order ${id}:`, error);
        throw error;
    }
};
// Update tracking details and mark as shipped
export const updateOrderTrackingAndShip = async (id, tracking_code, tracking_url) => {
    try {
        await ensureAdminAuth();
        const data = {
            tracking_code,
            tracking_url,
            status: 'shipped',
        };
        const record = await pb.collection('orders').update(id, data);
        return record;
    }
    catch (error) {
        console.error(`Error updating tracking for order ${id}:`, error);
        throw error;
    }
};
// Get dashboard metrics
export const getDashboardMetrics = async () => {
    try {
        await ensureAdminAuth();
        // Get all orders to calculate metrics
        const ordersResult = await pb.collection('orders').getFullList(200, {
            sort: '-created',
            fields: 'payment_status,status,total,created',
        });
        // Calculate the metrics using ONLY paid orders
        const paidOrders = ordersResult.filter(order => order.payment_status === 'paid');
        const totalOrders = paidOrders.length;
        // Pending = orders that are NOT paid
        const pendingOrders = ordersResult.filter(order => order.payment_status !== 'paid').length;
        // Completed orders by delivery status (unchanged)
        const completedOrders = ordersResult.filter(order => order.status === 'delivered').length;
        // Revenue metrics from PAID orders only
        const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const averageOrderValue = totalOrders > 0
            ? totalRevenue / totalOrders
            : 0;
        // Calculate today's revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const revenueToday = ordersResult
            .filter(order => {
            const orderDate = new Date(order.created);
            return orderDate >= today && order.payment_status === 'paid';
        })
            .reduce((sum, order) => sum + (order.total || 0), 0);
        return {
            total_orders: totalOrders,
            pending_orders: pendingOrders,
            completed_orders: completedOrders,
            total_revenue: totalRevenue,
            average_order_value: averageOrderValue,
            revenue_today: revenueToday
        };
    }
    catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        throw error;
    }
};
// Get revenue data for chart, with optional date range and grouping
export const getMonthlyRevenueData = async (params) => {
    try {
        await ensureAdminAuth();
        const { startDate, endDate, groupBy = 'month' } = params ?? {};
        const filterParts = [];
        if (startDate) {
            filterParts.push(`created >= "${startDate}"`);
        }
        if (endDate) {
            filterParts.push(`created <= "${endDate}"`);
        }
        const filter = filterParts.length > 0 ? filterParts.join(' && ') : undefined;
        const ordersResult = await pb.collection('orders').getFullList(500, {
            sort: 'created',
            fields: 'total,created',
            filter,
        });
        const buckets = new Map();
        const normalizeDate = (input) => {
            const value = typeof input === 'string' || typeof input === 'number' || input instanceof Date
                ? new Date(input)
                : null;
            return value && !Number.isNaN(value.getTime()) ? value : null;
        };
        ordersResult.forEach((order) => {
            const created = normalizeDate(order.created);
            if (!created) {
                console.warn('Skipping order with invalid created date when aggregating revenue:', order?.id, order?.created);
                return;
            }
            const total = Number(order.total || 0);
            let key;
            if (groupBy === 'day') {
                key = created.toISOString().slice(0, 10); // YYYY-MM-DD
            }
            else if (groupBy === 'week') {
                const d = new Date(Date.UTC(created.getFullYear(), created.getMonth(), created.getDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
                key = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
            }
            else {
                key = created.toLocaleString('default', { month: 'short', year: 'numeric' });
            }
            buckets.set(key, (buckets.get(key) || 0) + total);
        });
        const entries = Array.from(buckets.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return entries.map(([label, revenue]) => ({
            label,
            revenue,
        }));
    }
    catch (error) {
        console.error('Error fetching revenue data:', error);
        throw error;
    }
};
export const listNavbarConfigs = async () => {
    await ensureAdminAuth();
    const items = await pb.collection('navbar_config').getFullList({ sort: '-created' });
    return items;
};
export const getActiveNavbarConfig = async () => {
    await ensureAdminAuth();
    const res = await pb.collection('navbar_config').getList(1, 1, { filter: 'is_active = true', sort: '-created' });
    return res.items?.[0] ?? null;
};
export const createNavbarConfig = async (data) => {
    await ensureAdminAuth();
    // If setting active, deactivate others first
    if (data.is_active) {
        const all = await pb.collection('navbar_config').getFullList({});
        await Promise.all(all.map((it) => it.is_active ? pb.collection('navbar_config').update(it.id, { is_active: false }) : Promise.resolve()));
    }
    const rec = await pb.collection('navbar_config').create(data);
    return rec;
};
export const updateNavbarConfig = async (id, data) => {
    await ensureAdminAuth();
    if (data.is_active) {
        const all = await pb.collection('navbar_config').getFullList({});
        await Promise.all(all.filter((it) => it.id !== id).map((it) => it.is_active ? pb.collection('navbar_config').update(it.id, { is_active: false }) : Promise.resolve()));
    }
    const rec = await pb.collection('navbar_config').update(id, data);
    return rec;
};
export const activateNavbarConfig = async (id) => {
    await ensureAdminAuth();
    const all = await pb.collection('navbar_config').getFullList({});
    await Promise.all(all.map((it) => pb.collection('navbar_config').update(it.id, { is_active: it.id === id })));
    const rec = await pb.collection('navbar_config').getOne(id);
    return rec;
};
export const deleteNavbarConfig = async (id) => {
    await ensureAdminAuth();
    await pb.collection('navbar_config').delete(id);
    return true;
};
export const listPagesLite = async () => {
    await ensureAdminAuth();
    const items = await pb.collection('pages').getFullList({
        sort: '-updated',
        fields: 'id,title,slug,published,updated'
    });
    return items;
};
export const getImageUrl = (collectionId, recordId, fileName) => {
    const placeholder = 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
    if (!collectionId || !recordId || !fileName) {
        console.warn('Missing parameters for getImageUrl', { collectionId, recordId, fileName });
        return placeholder;
    }
    if (typeof fileName === 'string' && /^https?:\/\//i.test(fileName)) {
        return fileName;
    }
    const envBase = (typeof process !== 'undefined' ? process.env?.VITE_POCKETBASE_URL : undefined)
        || import.meta?.env?.VITE_POCKETBASE_URL;
    const fallbackEnv = (typeof process !== 'undefined' ? process.env?.VITE_PB_FALLBACK_URL : undefined)
        || import.meta?.env?.VITE_PB_FALLBACK_URL
        || (typeof process !== 'undefined' ? process.env?.PUBLIC_PB_URL : undefined)
        || import.meta?.env?.PUBLIC_PB_URL;
    // Prefer the PocketBase client's current base URL, then envs, then hardcoded legacy
    const hardcoded = 'https://backend-pocketbase.p3ibd8.easypanel.host';
    const base = (pb?.baseUrl && typeof pb.baseUrl === 'string' ? pb.baseUrl : undefined)
        || envBase
        || fallbackEnv
        || hardcoded;
    // Normalise file names that may already include recordId or leading slashes
    const normalised = String(fileName).replace(/^\/+/, '');
    let relativePath = `${recordId}/${normalised}`;
    if (normalised.startsWith(`${recordId}/`)) {
        relativePath = normalised;
    }
    else if (normalised.includes('/')) {
        // If another path segment is included (e.g. generated/id/filename), use the last segment
        relativePath = `${recordId}/${normalised.split('/').pop()}`;
    }
    return `${base.replace(/\/+$/, '')}/api/files/${collectionId}/${relativePath}`;
};
export const getSiteSettingsRecord = async () => {
    await ensureAdminAuth();
    const res = await pb.collection('site_settings').getList(1, 1, {
        sort: '-created',
    });
    const rec = res.items?.[0];
    return rec ?? null;
};
export const createSiteSettingsRecord = async (data) => {
    await ensureAdminAuth();
    const rec = await pb.collection('site_settings').create(data);
    return rec;
};
export const updateSiteSettingsRecord = async (id, data) => {
    await ensureAdminAuth();
    const rec = await pb.collection('site_settings').update(id, data);
    return rec;
};
export const uploadSiteSettingsImage = async (id, fieldName, file) => {
    await ensureAdminAuth();
    const formData = new FormData();
    formData.append(fieldName, file);
    const rec = await pb.collection('site_settings').update(id, formData);
    return rec;
};
