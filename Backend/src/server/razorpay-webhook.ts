import express, { Request, Response } from 'express';
import crypto from 'crypto';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(POCKETBASE_URL);

// Razorpay webhook secret - you'll set this in Razorpay dashboard
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

/**
 * Verify Razorpay webhook signature
 * This ensures the webhook request is actually from Razorpay
 */
function verifyRazorpaySignature(
    webhookBody: string,
    signature: string,
    secret: string
): boolean {
    try {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(webhookBody)
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        console.error('Error verifying Razorpay signature:', error);
        return false;
    }
}

/**
 * Main Razorpay Webhook Handler
 * Handles all payment events from Razorpay
 */
router.post('/razorpay-webhook', async (req: Request, res: Response) => {
    try {
        console.log('📨 Razorpay webhook received');

        // Get the signature from headers
        const signature = req.headers['x-razorpay-signature'] as string;

        if (!signature) {
            console.error('❌ No signature in webhook request');
            return res.status(400).json({ error: 'Missing signature' });
        }

        // Verify the webhook signature
        const webhookBody = JSON.stringify(req.body);

        if (RAZORPAY_WEBHOOK_SECRET && !verifyRazorpaySignature(webhookBody, signature, RAZORPAY_WEBHOOK_SECRET)) {
            console.error('❌ Invalid webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        console.log('✅ Webhook signature verified');

        // Parse the event
        const event = req.body.event;
        const payload = req.body.payload;

        console.log('📋 Event type:', event);
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));

        // Handle different payment events
        switch (event) {
            case 'payment.captured':
                await handlePaymentCaptured(payload);
                break;

            case 'payment.failed':
                await handlePaymentFailed(payload);
                break;

            case 'payment.authorized':
                await handlePaymentAuthorized(payload);
                break;

            case 'order.paid':
                await handleOrderPaid(payload);
                break;

            default:
                console.log(`ℹ️ Unhandled event type: ${event}`);
        }

        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ status: 'ok' });

    } catch (error) {
        console.error('💥 Error processing Razorpay webhook:', error);
        // Still return 200 to prevent Razorpay from retrying
        res.status(200).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
});

/**
 * Handle payment.captured event
 * This is the most important event - payment was successfully captured
 */
async function handlePaymentCaptured(payload: any) {
    try {
        const payment = payload.payment?.entity;

        if (!payment) {
            console.error('❌ No payment entity in payload');
            return;
        }

        console.log('💰 Processing payment.captured event');
        console.log('Payment ID:', payment.id);
        console.log('Order ID:', payment.order_id);
        console.log('Amount:', payment.amount / 100, 'INR');
        console.log('Status:', payment.status);

        // Extract metadata to find our PocketBase order ID
        const notes = payment.notes || {};
        const pocketbaseOrderId = notes.pocketbase_order_id || notes.order_id;

        if (!pocketbaseOrderId) {
            console.error('❌ No PocketBase order ID in payment notes');
            console.log('Payment notes:', notes);

            // Try to find order by razorpay_order_id
            try {
                const orders = await pb.collection('orders').getList(1, 1, {
                    filter: `razorpay_order_id="${payment.order_id}"`,
                    $autoCancel: false,
                });

                if (orders.items.length > 0) {
                    const orderId = orders.items[0].id;
                    console.log('✅ Found order by razorpay_order_id:', orderId);
                    await updateOrderStatus(orderId, payment, 'captured');
                } else {
                    console.error('❌ Could not find order with razorpay_order_id:', payment.order_id);
                }
            } catch (searchError) {
                console.error('Error searching for order:', searchError);
            }

            return;
        }

        console.log('📝 PocketBase Order ID:', pocketbaseOrderId);

        // Update the order in PocketBase
        await updateOrderStatus(pocketbaseOrderId, payment, 'captured');

    } catch (error) {
        console.error('Error handling payment.captured:', error);
        throw error;
    }
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payload: any) {
    try {
        const payment = payload.payment?.entity;

        if (!payment) {
            console.error('❌ No payment entity in payload');
            return;
        }

        console.log('❌ Processing payment.failed event');
        console.log('Payment ID:', payment.id);
        console.log('Error:', payment.error_code, payment.error_description);

        const notes = payment.notes || {};
        const pocketbaseOrderId = notes.pocketbase_order_id || notes.order_id;

        if (pocketbaseOrderId) {
            await updateOrderStatus(pocketbaseOrderId, payment, 'failed');
        }

    } catch (error) {
        console.error('Error handling payment.failed:', error);
    }
}

/**
 * Handle payment.authorized event
 * Payment authorized but not yet captured
 */
async function handlePaymentAuthorized(payload: any) {
    try {
        const payment = payload.payment?.entity;

        if (!payment) {
            console.error('❌ No payment entity in payload');
            return;
        }

        console.log('🔐 Processing payment.authorized event');
        console.log('Payment ID:', payment.id);

        const notes = payment.notes || {};
        const pocketbaseOrderId = notes.pocketbase_order_id || notes.order_id;

        if (pocketbaseOrderId) {
            await updateOrderStatus(pocketbaseOrderId, payment, 'authorized');
        }

    } catch (error) {
        console.error('Error handling payment.authorized:', error);
    }
}

/**
 * Handle order.paid event
 */
async function handleOrderPaid(payload: any) {
    try {
        const order = payload.order?.entity;

        if (!order) {
            console.error('❌ No order entity in payload');
            return;
        }

        console.log('✅ Processing order.paid event');
        console.log('Razorpay Order ID:', order.id);

        // Find and update the PocketBase order
        try {
            const orders = await pb.collection('orders').getList(1, 1, {
                filter: `razorpay_order_id="${order.id}"`,
                $autoCancel: false,
            });

            if (orders.items.length > 0) {
                const pocketbaseOrderId = orders.items[0].id;
                await updateOrderStatus(pocketbaseOrderId, { order_id: order.id }, 'paid');
            }
        } catch (searchError) {
            console.error('Error finding order:', searchError);
        }

    } catch (error) {
        console.error('Error handling order.paid:', error);
    }
}

/**
 * Update order status in PocketBase
 */
async function updateOrderStatus(
    orderId: string,
    payment: any,
    eventType: 'captured' | 'failed' | 'authorized' | 'paid'
) {
    try {
        console.log(`📝 Updating order ${orderId} with ${eventType} status`);

        // Prepare update data based on event type
        const updateData: any = {
            razorpay_payment_id: payment.id,
            payment_id: payment.id,
            updated: new Date().toISOString(),
        };

        switch (eventType) {
            case 'captured':
                updateData.payment_status = 'paid';
                updateData.status = 'processing';
                updateData.payment_date = new Date().toISOString();
                updateData.notes = `Payment captured via Razorpay webhook. Payment ID: ${payment.id}. Amount: ₹${(payment.amount / 100).toFixed(2)}`;

                // Ensure totalAmount is set correctly
                if (payment.amount) {
                    updateData.totalAmount = payment.amount / 100; // Convert paise to rupees
                    updateData.total = payment.amount / 100;
                }
                break;

            case 'failed':
                updateData.payment_status = 'failed';
                updateData.status = 'payment_failed';
                updateData.notes = `Payment failed: ${payment.error_code || 'Unknown error'}. ${payment.error_description || ''}`;
                break;

            case 'authorized':
                updateData.payment_status = 'authorized';
                updateData.status = 'payment_authorized';
                updateData.notes = `Payment authorized but not captured. Payment ID: ${payment.id}`;
                break;

            case 'paid':
                updateData.payment_status = 'paid';
                updateData.status = 'processing';
                updateData.notes = `Order paid via Razorpay webhook`;
                break;
        }

        // Update the order in PocketBase
        await pb.collection('orders').update(orderId, updateData, {
            $autoCancel: false,
        });

        console.log('✅ Order updated successfully');
        console.log('Updated fields:', updateData);

        // Verify the update
        const updatedOrder = await pb.collection('orders').getOne(orderId, {
            $autoCancel: false,
        });

        console.log('🔍 Verification - Order after update:', {
            id: updatedOrder.id,
            payment_status: updatedOrder.payment_status,
            status: updatedOrder.status,
            total: updatedOrder.total,
            totalAmount: updatedOrder.totalAmount,
        });

        if (updatedOrder.payment_status !== updateData.payment_status) {
            console.error('⚠️ Warning: payment_status mismatch after update!');
            console.error('Expected:', updateData.payment_status);
            console.error('Got:', updatedOrder.payment_status);
        } else {
            console.log('✅✅ Verified: Order status updated correctly');
        }

    } catch (error) {
        console.error('💥 Error updating order in PocketBase:', error);
        throw error;
    }
}

/**
 * Test endpoint to manually trigger a payment update
 * Useful for testing without Razorpay
 */
router.post('/test-payment-update', async (req: Request, res: Response) => {
    try {
        const { orderId, paymentId, amount, status } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId is required' });
        }

        const mockPayment = {
            id: paymentId || 'pay_test_123',
            order_id: orderId,
            amount: (amount || 290) * 100, // Convert to paise
            currency: 'INR',
            status: status || 'captured',
        };

        await updateOrderStatus(orderId, mockPayment, status || 'captured');

        res.json({
            success: true,
            message: 'Order updated successfully',
            orderId,
            status,
        });

    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
