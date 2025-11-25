// Customer Journey Tracking Utility
// Sends journey events to the automation API for triggering flows

interface JourneyEvent {
    event_type: 'page_view' | 'product_view' | 'add_to_cart' | 'checkout_start' | 'purchase' | 'cart_abandon' | 'milestone';
    user_id?: string;
    session_id?: string;
    timestamp?: string;
    data?: Record<string, unknown>;
}

/**
 * Get or create a session ID for tracking
 */
function getSessionId(): string {
    let sessionId = sessionStorage.getItem('journey_session_id');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('journey_session_id', sessionId);
    }
    return sessionId;
}

/**
 * Get user ID from localStorage or PocketBase
 */
function getUserId(): string | undefined {
    try {
        const pbAuth = localStorage.getItem('pocketbase_auth');
        if (pbAuth) {
            const auth = JSON.parse(pbAuth);
            return auth?.model?.id || auth?.record?.id;
        }
    } catch (error) {
        console.warn('Could not get user ID:', error);
    }
    return undefined;
}

function mapEventToBackend(event: JourneyEvent): { event: string; stage: 'awareness' | 'consideration' | 'purchase' | 'retention' | 'advocacy' } {
    switch (event.event_type) {
        case 'page_view':
            return { event: 'stage_entered', stage: 'awareness' };
        case 'product_view':
        case 'add_to_cart':
        case 'checkout_start':
        case 'cart_abandon':
            return { event: 'stage_entered', stage: 'consideration' };
        case 'purchase':
            return { event: 'purchase_made', stage: 'purchase' };
        case 'milestone':
        default:
            return { event: 'stage_entered', stage: 'retention' };
    }
}

/**
 * Send journey event to the automation API
 */
async function sendJourneyEvent(event: JourneyEvent): Promise<void> {
    try {
        const apiUrl = import.meta.env.VITE_CUSTOMER_JOURNEY_WEBHOOK_URL || '/api/webhook/customer-journey';

        const sessionId = event.session_id || getSessionId();
        const userId = event.user_id || getUserId();
        const timestamp = event.timestamp || new Date().toISOString();
        const { event: backendEvent, stage } = mapEventToBackend(event);

        const metadata: Record<string, unknown> = {
            ...(event.data || {}),
            event_type: event.event_type,
            url: window.location.href,
            path: window.location.pathname,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            session_id: sessionId,
        };

        const payload = {
            customer_id: userId || sessionId,
            customer_name: undefined,
            customer_email: undefined,
            event: backendEvent,
            stage,
            timestamp,
            metadata,
        };

        await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        console.log('[Journey] Event sent:', event.event_type, payload);
    } catch (error) {
        console.error('[Journey] Failed to send event:', error);
    }
}

/**
 * Track a page view
 */
export function trackJourneyPageView(pagePath?: string): void {
    sendJourneyEvent({
        event_type: 'page_view',
        data: {
            path: pagePath || window.location.pathname,
            title: document.title,
        },
    });
}

/**
 * Track a product view
 */
export function trackJourneyProductView(productId: string, productData?: Record<string, unknown>): void {
    sendJourneyEvent({
        event_type: 'product_view',
        data: {
            product_id: productId,
            ...productData,
        },
    });
}

/**
 * Track add to cart
 */
export function trackJourneyAddToCart(productId: string, quantity: number, productData?: Record<string, unknown>): void {
    sendJourneyEvent({
        event_type: 'add_to_cart',
        data: {
            product_id: productId,
            quantity,
            ...productData,
        },
    });
}

/**
 * Track checkout start
 */
export function trackJourneyCheckoutStart(cartData?: Record<string, unknown>): void {
    sendJourneyEvent({
        event_type: 'checkout_start',
        data: cartData,
    });
}

/**
 * Track purchase completion
 */
export function trackJourneyPurchase(orderId: string, orderData?: Record<string, unknown>): void {
    sendJourneyEvent({
        event_type: 'purchase',
        data: {
            order_id: orderId,
            ...orderData,
        },
    });
}

/**
 * Track cart abandonment
 */
export function trackJourneyCartAbandon(cartData?: Record<string, unknown>): void {
    sendJourneyEvent({
        event_type: 'cart_abandon',
        data: cartData,
    });
}

/**
 * Track custom milestone
 */
export function trackJourneyMilestone(milestoneName: string, data?: Record<string, unknown>): void {
    sendJourneyEvent({
        event_type: 'milestone',
        data: {
            milestone: milestoneName,
            ...data,
        },
    });
}

// Auto-track cart abandonment after 5 minutes of inactivity
let cartAbandonTimer: NodeJS.Timeout | null = null;

export function startCartAbandonTracking(cartData?: Record<string, unknown>): void {
    // Clear existing timer
    if (cartAbandonTimer) {
        clearTimeout(cartAbandonTimer);
    }

    // Set 5-minute timer
    cartAbandonTimer = setTimeout(() => {
        trackJourneyCartAbandon(cartData);
    }, 5 * 60 * 1000); // 5 minutes
}

export function cancelCartAbandonTracking(): void {
    if (cartAbandonTimer) {
        clearTimeout(cartAbandonTimer);
        cartAbandonTimer = null;
    }
}
