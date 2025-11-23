/**
 * Webhook Server API Client
 * 
 * This service handles all communication with the standalone webhook/payment server.
 * Replace direct Razorpay API calls with these functions.
 */

const WEBHOOK_SERVER_URL = import.meta.env.VITE_WEBHOOK_SERVER_URL || 'http://localhost:3001';

export interface RazorpayOrderRequest {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  key_id: string;
}

export interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  verified: boolean;
  payment: any;
}

/**
 * Create a Razorpay order via webhook server
 */
export async function createRazorpayOrder(
  orderData: RazorpayOrderRequest
): Promise<RazorpayOrder> {
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/api/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

/**
 * Verify a Razorpay payment via webhook server
 */
export async function verifyRazorpayPayment(
  paymentData: PaymentVerificationRequest
): Promise<PaymentVerificationResponse> {
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/api/razorpay/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Payment verification failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
}

/**
 * Capture a payment via webhook server
 */
export async function capturePayment(paymentId: string, amount?: number) {
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/api/razorpay/capture-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_id: paymentId, amount }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to capture payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw error;
  }
}

/**
 * Refund a payment via webhook server
 */
export async function refundPayment(
  paymentId: string,
  amount?: number,
  notes?: Record<string, any>
) {
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/api/razorpay/refund-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_id: paymentId, amount, notes }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to refund payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw error;
  }
}

/**
 * Get payment details via webhook server
 */
export async function getPaymentDetails(paymentId: string) {
  try {
    const response = await fetch(
      `${WEBHOOK_SERVER_URL}/api/razorpay/payment/${paymentId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch payment details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
}

/**
 * Emit a webhook event
 */
export async function emitWebhookEvent(event: {
  type: string;
  data: Record<string, any>;
  source?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/api/webhooks/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to emit webhook event');
    }

    return await response.json();
  } catch (error) {
    console.error('Error emitting webhook event:', error);
    throw error;
  }
}

/**
 * Trigger an automation flow
 */
export async function triggerAutomation(flowId: string, data: Record<string, any>) {
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/api/automation/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ flow_id: flowId, data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to trigger automation');
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering automation:', error);
    throw error;
  }
}

/**
 * Check webhook server health
 */
export async function checkWebhookServerHealth() {
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('Webhook server is not reachable:', error);
    return { status: 'error', error: 'Server not reachable' };
  }
}
