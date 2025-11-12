import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const router = express.Router();

// Get Razorpay credentials from environment variables
const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

// Create Basic Auth header for Razorpay API
const RAZORPAY_AUTH = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

/**
 * Create a new Razorpay order
 * POST /api/razorpay/create-order
 */
router.post('/create-order', async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;
    
    // validate
    const rupees = Number(amount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      res.status(400).json({ error: 'Invalid amount value' });
      return;
    }
    
    // ✅ convert to paise
    const amountPaise = Math.round(rupees * 100);
    
    console.log('Creating Razorpay order with details:', {
      amount: amountPaise,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        source: 'Konipai Website',
        ...notes
      }
    });
    
    // Direct API call to Razorpay
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${RAZORPAY_AUTH}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: currency || 'INR',
        receipt: receipt || `receipt_${Date.now()}`,
        notes: {
          source: 'Konipai Website',
          ...notes
        }
      })
    });
    
    console.log('Razorpay order creation response:', {
      status: response.status,
      statusText: response.statusText
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Razorpay API error:', errorData);
      throw new Error(`Razorpay API error: ${response.status} ${response.statusText}`);
    }
    
    const order = await response.json();
    console.log('Successfully created Razorpay order:', order.id);
    
    // Return order data with key_id to ensure client/server sync
    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      key_id: RAZORPAY_KEY_ID,   // send to client to guarantee same account
    });
    return;
  } catch (error) {
    console.error('Error in create-order endpoint:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create order'
    });
    return;
  }
});

/**
 * Verify a Razorpay payment
 * POST /api/razorpay/verify-payment
 */
router.post('/verify-payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }
    
    // Create the data string that was used to generate the signature
    const data = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    // Generate the expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(data)
      .digest('hex');
    
    // Compare the signatures
    const isValid = expectedSignature === razorpay_signature;
    
    if (!isValid) {
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }
    
    // Get payment details from Razorpay
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${RAZORPAY_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.text();
      console.error('Razorpay API error:', errorData);
      throw new Error(`Failed to fetch payment details: ${paymentResponse.status}`);
    }
    
    const paymentDetails = await paymentResponse.json();
    
    res.status(200).json({
      success: true,
      payment: paymentDetails
    });
    return;
  } catch (error) {
    console.error('Error in verify-payment endpoint:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to verify payment'
    });
    return;
  }
});

/**
 * Capture a Razorpay payment
 * POST /api/razorpay/capture-payment
 */
router.post('/capture-payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { payment_id, amount } = req.body;
    
    console.log('Capture payment request received:', { payment_id, amount });
    
    if (!payment_id) {
      res.status(400).json({ error: 'Payment ID is required' });
      return;
    }
    
    // Convert amount to paise if provided
    const amountInPaise = amount ? (amount < 100 ? Math.round(amount * 100) : Math.round(amount)) : undefined;
    
    // Prepare request body
    const captureBody: any = {};
    if (amountInPaise) {
      captureBody.amount = amountInPaise;
    }
    
    console.log('Sending capture request to Razorpay:', { 
      url: `https://api.razorpay.com/v1/payments/${payment_id}/capture`,
      body: captureBody
    });
    
    // Capture the payment using Razorpay API
    const response = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${RAZORPAY_AUTH}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(captureBody)
    });
    
    const responseText = await response.text();
    console.log('Razorpay capture response:', {
      status: response.status,
      statusText: response.statusText,
      responseText
    });
    
    if (!response.ok) {
      console.error('Razorpay API error:', responseText);
      throw new Error(`Failed to capture payment: ${response.status} - ${responseText}`);
    }
    
    const payment = JSON.parse(responseText);
    console.log('Successfully captured payment:', payment.id, 'Status:', payment.status);
    
    res.status(200).json({
      success: true,
      status: payment.status,
      payment
    });
    return;
  } catch (error) {
    console.error('Error in capture-payment endpoint:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to capture payment'
    });
    return;
  }
});

/**
 * Refund a Razorpay payment
 * POST /api/razorpay/refund-payment
 */
router.post('/refund-payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { payment_id, amount } = req.body;
    
    if (!payment_id) {
      res.status(400).json({ error: 'Payment ID is required' });
      return;
    }
    
    // Convert amount to paise if provided
    const amountInPaise = amount ? (amount < 100 ? Math.round(amount * 100) : Math.round(amount)) : undefined;
    
    // Prepare request body
    const refundBody: any = {};
    if (amountInPaise) {
      refundBody.amount = amountInPaise;
    }
    
    // Refund the payment using Razorpay API
    const response = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${RAZORPAY_AUTH}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(refundBody)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Razorpay API error:', errorData);
      throw new Error(`Failed to refund payment: ${response.status}`);
    }
    
    const refund = await response.json();
    console.log('Successfully refunded payment:', refund.id);
    
    res.status(200).json({
      success: true,
      refund
    });
    return;
  } catch (error) {
    console.error('Error in refund-payment endpoint:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to refund payment'
    });
    return;
  }
});

export default router;
