import PocketBase from 'pocketbase';
// Initialize PocketBase with the URL from environment variables (supports Vite and Node)
const VITE_ENV = (() => {
    try {
        return import.meta?.env ?? {};
    }
    catch {
        return {};
    }
})();
const POCKETBASE_URL = VITE_ENV.VITE_POCKETBASE_URL ||
    (typeof process !== 'undefined' ? process.env?.VITE_POCKETBASE_URL : undefined) ||;
export const pb = new PocketBase(POCKETBASE_URL);
// Disable auto-cancellation of requests which is causing issues
pb.autoCancellation(false);
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
        const authData = await pb.collection('users').authWithPassword(email, password);
        return authData;
    }
    catch (error) {
        console.error('Authentication error:', error);
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
        const ordersResult = await pb.collection('orders').getFullList({
            sort: '-created',
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
// Get revenue data for chart (monthly revenue)
export const getMonthlyRevenueData = async () => {
    try {
        await ensureAdminAuth();
        // Get all orders
        const ordersResult = await pb.collection('orders').getFullList({
            sort: 'created',
        });
        // Get current year
        const currentYear = new Date().getFullYear();
        // Create an object to store monthly revenue
        const monthlyRevenue = {
            'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
            'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
        };
        // Calculate revenue for each month
        ordersResult.forEach(order => {
            const orderDate = new Date(order.created);
            // Only include orders from current year
            if (orderDate.getFullYear() === currentYear) {
                const month = orderDate.toLocaleString('default', { month: 'short' });
                monthlyRevenue[month] += (order.total || 0);
            }
        });
        // Convert to array format expected by chart
        return Object.entries(monthlyRevenue).map(([month, revenue]) => ({
            month,
            revenue
        }));
    }
    catch (error) {
        console.error('Error fetching monthly revenue data:', error);
        throw error;
    }
};
export const getImageUrl = (collectionId, recordId, fileName) => {
    if (!collectionId || !recordId || !fileName) {
        console.warn('Missing parameters for getImageUrl', { collectionId, recordId, fileName });
        return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
    }
    const envBase = (typeof process !== 'undefined' ? process.env?.VITE_POCKETBASE_URL : undefined)
        || import.meta?.env?.VITE_POCKETBASE_URL;
    const fallbackEnv = (typeof process !== 'undefined' ? process.env?.VITE_PB_FALLBACK_URL : undefined)
        || import.meta?.env?.VITE_PB_FALLBACK_URL
        || (typeof process !== 'undefined' ? process.env?.PUBLIC_PB_URL : undefined)
        || import.meta?.env?.PUBLIC_PB_URL;
    // Last-resort hardcoded fallback (update if backend host changes)
    const hardcoded = 'https://backend-pocketbase.p3ibd8.easypanel.host';
    const base = envBase || fallbackEnv || hardcoded;
    return `${base}/api/files/${collectionId}/${recordId}/${fileName}`;
};
