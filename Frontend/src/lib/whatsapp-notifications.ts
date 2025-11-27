/**
 * WhatsApp Notification Service
 * Sends WhatsApp messages via Evolution API for order events
 */

import { pocketbase } from './pocketbase';

// Types
interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'document';
  mediaUrl?: string;
  mediaCaption?: string;
  isActive: boolean;
}

interface OrderData {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  total: number;
  subtotal?: number;
  shipping_cost?: number;
  status?: string;
  payment_status?: string;
  tracking_link?: string;
  shipping_carrier?: string;
}

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Get Evolution API configuration from plugins
async function getEvolutionConfig() {
  try {
    const plugins = await pocketbase.collection('plugins').getFullList();
    const evolutionPlugin = plugins.find((p: any) => p.key === 'evolution_api');
    
    if (!evolutionPlugin?.enabled || !evolutionPlugin?.config) {
      console.log('Evolution API not configured or disabled');
      return null;
    }
    
    const config = typeof evolutionPlugin.config === 'string' 
      ? JSON.parse(evolutionPlugin.config) 
      : evolutionPlugin.config;
    
    return {
      baseUrl: config.baseUrl,
      apiKey: config.tokenOrKey,
      instanceName: config.defaultSender,
    };
  } catch (error) {
    console.error('Failed to get Evolution config:', error);
    return null;
  }
}

// Get WhatsApp template by name
async function getTemplate(templateName: string): Promise<WhatsAppTemplate | null> {
  try {
    const templates = await pocketbase.collection('whatsapp_templates').getList(1, 1, {
      filter: `name="${templateName}" && isActive=true`,
    });
    
    if (templates.items.length === 0) {
      console.log(`No active template found for: ${templateName}`);
      return null;
    }
    
    return templates.items[0] as unknown as WhatsAppTemplate;
  } catch (error) {
    console.error('Failed to get template:', error);
    return null;
  }
}

// Format phone number to include country code
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // If 10 digits, add India country code
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

// Replace template variables with actual values
function processTemplate(content: string, variables: Record<string, string>): string {
  let processed = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, value);
  });
  return processed;
}

// Send text message via Evolution API
async function sendTextMessage(
  phone: string,
  message: string,
  orderId?: string
): Promise<SendMessageResponse> {
  const config = await getEvolutionConfig();
  if (!config) {
    return { success: false, error: 'Evolution API not configured' };
  }
  
  try {
    const url = `${config.baseUrl}/message/sendText/${config.instanceName}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: JSON.stringify({
        number: formatPhoneNumber(phone),
        text: message,
        options: {
          delay: 1200,
          presence: 'composing',
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Evolution API error:', error);
      return { success: false, error };
    }
    
    const result = await response.json();
    console.log('WhatsApp message sent:', result);
    
    // Log activity
    await logWhatsAppActivity(orderId || '', phone, message, 'sent');
    
    return { success: true, messageId: result.key?.id };
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    await logWhatsAppActivity(orderId || '', phone, '', 'failed', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send media message via Evolution API
async function sendMediaMessage(
  phone: string,
  mediaUrl: string,
  caption?: string,
  mediaType: 'image' | 'video' | 'document' = 'image',
  orderId?: string
): Promise<SendMessageResponse> {
  const config = await getEvolutionConfig();
  if (!config) {
    return { success: false, error: 'Evolution API not configured' };
  }
  
  try {
    const url = `${config.baseUrl}/message/sendMedia/${config.instanceName}`;
    
    // Evolution API requires this specific format with mediatype
    const body = {
      number: formatPhoneNumber(phone),
      mediatype: mediaType, // Required by Evolution API
      media: mediaUrl,
      caption: caption || '',
      options: {
        delay: 1200,
        presence: 'composing',
      },
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Evolution API media error:', error);
      return { success: false, error };
    }
    
    const result = await response.json();
    console.log('WhatsApp media sent:', result);
    
    return { success: true, messageId: result.key?.id };
  } catch (error) {
    console.error('Failed to send WhatsApp media:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Log WhatsApp activity to PocketBase (optional - won't fail if collection doesn't exist)
async function logWhatsAppActivity(
  orderId: string,
  recipient: string,
  message: string,
  status: 'sent' | 'failed',
  errorMessage?: string
) {
  try {
    // Try to log directly - don't check collections (requires admin access)
    await pocketbase.collection('whatsapp_activity').create({
      order_id: orderId,
      recipient: recipient,
      message_content: message.substring(0, 500),
      status: status,
      error_message: errorMessage || '',
      created: new Date().toISOString(),
    });
  } catch (error) {
    // Silently fail - logging shouldn't block main flow
    console.log(`WhatsApp activity [${status}]: ${orderId} -> ${recipient}`);
  }
}

// ==================== ORDER EVENT NOTIFICATIONS ====================

/**
 * Send order confirmation message
 */
export async function sendOrderConfirmation(order: OrderData): Promise<SendMessageResponse> {
  if (!order.customer_phone) {
    return { success: false, error: 'No customer phone number' };
  }
  
  // Try to get template from PocketBase
  const template = await getTemplate('ORDER_CONFIRMATION');
  
  let message: string;
  if (template) {
    message = processTemplate(template.content, {
      customerName: order.customer_name,
      orderId: order.id.slice(0, 8),
      amount: order.total.toString(),
      storeName: 'Zenthra Shop',
    });
    
    // If template has media, send media message with caption (not separate text)
    if (template.messageType !== 'text' && template.mediaUrl) {
      return sendMediaMessage(
        order.customer_phone,
        template.mediaUrl,
        message, // Full message as caption
        template.messageType as 'image' | 'video' | 'document',
        order.id
      );
    }
  } else {
    // Default message
    message = `🎉 *Order Confirmed* 🎉\n\nHi ${order.customer_name},\n\nYour order #${order.id.slice(0, 8)} has been confirmed!\n\nTotal: ₹${order.total}\n\nThank you for shopping with us. We'll update you when your order ships.`;
  }
  
  // Only send text if no media template
  return sendTextMessage(order.customer_phone, message, order.id);
}

/**
 * Send payment success message
 */
export async function sendPaymentSuccess(order: OrderData): Promise<SendMessageResponse> {
  if (!order.customer_phone) {
    return { success: false, error: 'No customer phone number' };
  }
  
  const template = await getTemplate('PAYMENT_SUCCESS');
  
  let message: string;
  if (template) {
    message = processTemplate(template.content, {
      customerName: order.customer_name,
      orderId: order.id.slice(0, 8),
      amount: order.total.toString(),
    });
  } else {
    message = `✅ *Payment Successful* ✅\n\nHi ${order.customer_name},\n\nYour payment of ₹${order.total} for order #${order.id.slice(0, 8)} has been received.\n\nWe're now preparing your order for shipping. You'll get updates soon!\n\nThank you for your purchase!`;
  }
  
  return sendTextMessage(order.customer_phone, message, order.id);
}

/**
 * Send payment failed message
 */
export async function sendPaymentFailed(order: OrderData, retryUrl?: string): Promise<SendMessageResponse> {
  if (!order.customer_phone) {
    return { success: false, error: 'No customer phone number' };
  }
  
  const template = await getTemplate('PAYMENT_FAILED');
  const defaultRetryUrl = `${window.location.origin}/checkout?retry=${order.id}`;
  
  let message: string;
  if (template) {
    message = processTemplate(template.content, {
      customerName: order.customer_name,
      orderId: order.id.slice(0, 8),
      amount: order.total.toString(),
      retryUrl: retryUrl || defaultRetryUrl,
    });
  } else {
    message = `❌ *Payment Failed* ❌\n\nHi ${order.customer_name},\n\nWe couldn't process your payment of ₹${order.total} for order #${order.id.slice(0, 8)}.\n\nPlease try again: ${retryUrl || defaultRetryUrl}\n\nIf you need help, reply to this message.`;
  }
  
  return sendTextMessage(order.customer_phone, message, order.id);
}

/**
 * Send order shipped message
 */
export async function sendOrderShipped(
  order: OrderData,
  trackingLink?: string,
  carrier?: string
): Promise<SendMessageResponse> {
  if (!order.customer_phone) {
    return { success: false, error: 'No customer phone number' };
  }
  
  const template = await getTemplate('ORDER_SHIPPED');
  const defaultTrackingLink = order.tracking_link || `${window.location.origin}/track/${order.id}`;
  const defaultCarrier = order.shipping_carrier || carrier || 'Our Delivery Partner';
  
  let message: string;
  if (template) {
    message = processTemplate(template.content, {
      customerName: order.customer_name,
      orderId: order.id.slice(0, 8),
      trackingLink: trackingLink || defaultTrackingLink,
      carrier: defaultCarrier,
    });
  } else {
    message = `🚚 *Order Shipped* 🚚\n\nHi ${order.customer_name},\n\nGreat news! Your order #${order.id.slice(0, 8)} has been shipped.\n\nCarrier: ${defaultCarrier}\nTracking: ${trackingLink || defaultTrackingLink}\n\nThank you for your patience!`;
  }
  
  return sendTextMessage(order.customer_phone, message, order.id);
}

/**
 * Send order delivered message
 */
export async function sendOrderDelivered(order: OrderData): Promise<SendMessageResponse> {
  if (!order.customer_phone) {
    return { success: false, error: 'No customer phone number' };
  }
  
  const template = await getTemplate('ORDER_DELIVERED');
  const feedbackLink = `${window.location.origin}/feedback/${order.id}`;
  
  let message: string;
  if (template) {
    message = processTemplate(template.content, {
      customerName: order.customer_name,
      orderId: order.id.slice(0, 8),
      feedbackLink: feedbackLink,
    });
  } else {
    message = `📦 *Order Delivered* 📦\n\nHi ${order.customer_name},\n\nYour order #${order.id.slice(0, 8)} has been delivered!\n\nWe hope you love your purchase. Please share your feedback: ${feedbackLink}\n\nThank you for shopping with us!`;
  }
  
  return sendTextMessage(order.customer_phone, message, order.id);
}

// Export the send functions for direct use
export { sendTextMessage, sendMediaMessage, getEvolutionConfig };
