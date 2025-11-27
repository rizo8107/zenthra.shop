/**
 * WhatsApp Notification Service for Backend Admin
 * Fetches templates from PocketBase and sends via Evolution API
 */

import { pb } from './pocketbase';
import { sendWhatsAppMessage, sendWhatsAppMediaMessage, formatPhoneNumber } from './evolution';

// Template interface
interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'document';
  mediaUrl?: string;
  mediaCaption?: string;
  isActive: boolean;
}

// Order interface
interface OrderData {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  total: number | string;
  subtotal?: number | string;
  shipping_cost?: number | string;
  status?: string;
  payment_status?: string;
  tracking_link?: string;
  shipping_carrier?: string;
  refund_amount?: number | string;
}

// Get template from PocketBase
async function getTemplate(templateName: string): Promise<WhatsAppTemplate | null> {
  try {
    const templates = await pb.collection('whatsapp_templates').getList(1, 1, {
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

// Replace template variables
function processTemplate(content: string, variables: Record<string, string>): string {
  let processed = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, value || '');
  });
  return processed;
}

// Send notification using template
async function sendTemplatedNotification(
  templateName: string,
  phone: string,
  variables: Record<string, string>,
  orderId: string,
  fallbackMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await getTemplate(templateName);
    
    let message: string;
    let mediaUrl: string | undefined;
    let messageType: 'text' | 'image' | 'video' | 'document' = 'text';
    
    if (template) {
      message = processTemplate(template.content, variables);
      mediaUrl = template.mediaUrl;
      messageType = template.messageType || 'text';
      
      // If template has media, send media message WITH caption (not separate text)
      if (messageType !== 'text' && mediaUrl) {
        try {
          // Send media with the message content as caption
          await sendWhatsAppMediaMessage({
            phone: formatPhoneNumber(phone),
            mediaUrl: mediaUrl,
            caption: message, // Use the full message as caption
            mediaType: messageType,
            orderId: orderId,
          });
          console.log(`✅ WhatsApp ${templateName} (media) sent to ${phone}`);
          return { success: true }; // Return here - don't send separate text
        } catch (mediaError) {
          console.error('Failed to send media message, falling back to text:', mediaError);
          // Fall through to send text message instead
        }
      }
    } else {
      // Use fallback message
      message = fallbackMessage;
    }
    
    // Send text message (only if no media or media failed)
    await sendWhatsAppMessage({
      phone: phone,
      message: message,
      orderId: orderId,
      templateName: templateName,
    });
    
    console.log(`✅ WhatsApp ${templateName} sent to ${phone}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send ${templateName}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ==================== ORDER EVENT NOTIFICATIONS ====================

/**
 * Send order confirmation
 */
export async function notifyOrderConfirmation(order: OrderData): Promise<void> {
  if (!order.customer_phone) return;
  
  const variables = {
    customerName: order.customer_name,
    orderId: order.id.slice(0, 8),
    amount: String(order.total),
    storeName: 'Zenthra Shop',
  };
  
  const fallback = `🎉 *Order Confirmed* 🎉\n\nHi ${order.customer_name},\n\nYour order #${order.id.slice(0, 8)} has been confirmed!\n\nTotal: ₹${order.total}\n\nThank you for shopping with us.`;
  
  await sendTemplatedNotification('ORDER_CONFIRMATION', order.customer_phone, variables, order.id, fallback);
}

/**
 * Send payment success notification
 */
export async function notifyPaymentSuccess(order: OrderData): Promise<void> {
  if (!order.customer_phone) return;
  
  const variables = {
    customerName: order.customer_name,
    orderId: order.id.slice(0, 8),
    amount: String(order.total),
  };
  
  const fallback = `✅ *Payment Successful* ✅\n\nHi ${order.customer_name},\n\nYour payment of ₹${order.total} for order #${order.id.slice(0, 8)} has been received.\n\nThank you for your purchase!`;
  
  await sendTemplatedNotification('PAYMENT_SUCCESS', order.customer_phone, variables, order.id, fallback);
}

/**
 * Send payment failed notification
 */
export async function notifyPaymentFailed(order: OrderData, retryUrl?: string): Promise<void> {
  if (!order.customer_phone) return;
  
  const url = retryUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/checkout?retry=${order.id}`;
  
  const variables = {
    customerName: order.customer_name,
    orderId: order.id.slice(0, 8),
    amount: String(order.total),
    retryUrl: url,
  };
  
  const fallback = `❌ *Payment Failed* ❌\n\nHi ${order.customer_name},\n\nWe couldn't process your payment for order #${order.id.slice(0, 8)}.\n\nPlease try again: ${url}`;
  
  await sendTemplatedNotification('PAYMENT_FAILED', order.customer_phone, variables, order.id, fallback);
}

/**
 * Send order shipped notification
 */
export async function notifyOrderShipped(order: OrderData, trackingLink?: string, carrier?: string): Promise<void> {
  if (!order.customer_phone) return;
  
  const tracking = trackingLink || order.tracking_link || `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${order.id}`;
  const shipCarrier = carrier || order.shipping_carrier || 'Our Delivery Partner';
  
  const variables = {
    customerName: order.customer_name,
    orderId: order.id.slice(0, 8),
    trackingLink: tracking,
    carrier: shipCarrier,
    estimatedDelivery: '3-5 business days',
  };
  
  const fallback = `🚚 *Order Shipped* 🚚\n\nHi ${order.customer_name},\n\nGreat news! Your order #${order.id.slice(0, 8)} has been shipped.\n\nCarrier: ${shipCarrier}\nTracking: ${tracking}\n\nThank you for your patience!`;
  
  await sendTemplatedNotification('ORDER_SHIPPED', order.customer_phone, variables, order.id, fallback);
}

/**
 * Send out for delivery notification
 */
export async function notifyOutForDelivery(order: OrderData): Promise<void> {
  if (!order.customer_phone) return;
  
  const variables = {
    customerName: order.customer_name,
    orderId: order.id.slice(0, 8),
  };
  
  const fallback = `🚚 *Out for Delivery* 🚚\n\nHi ${order.customer_name},\n\nYour order #${order.id.slice(0, 8)} is out for delivery today!\n\nPlease ensure someone is available to receive it.`;
  
  await sendTemplatedNotification('OUT_FOR_DELIVERY', order.customer_phone, variables, order.id, fallback);
}

/**
 * Send order delivered notification
 */
export async function notifyOrderDelivered(order: OrderData): Promise<void> {
  if (!order.customer_phone) return;
  
  const feedbackLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/feedback/${order.id}`;
  
  const variables = {
    customerName: order.customer_name,
    orderId: order.id.slice(0, 8),
    feedbackLink: feedbackLink,
  };
  
  const fallback = `📦 *Order Delivered* 📦\n\nHi ${order.customer_name},\n\nYour order #${order.id.slice(0, 8)} has been delivered!\n\nWe hope you love your purchase. Share your feedback: ${feedbackLink}\n\nThank you!`;
  
  await sendTemplatedNotification('ORDER_DELIVERED', order.customer_phone, variables, order.id, fallback);
}

/**
 * Send order cancelled notification
 */
export async function notifyOrderCancelled(order: OrderData): Promise<void> {
  if (!order.customer_phone) return;
  
  const variables = {
    customerName: order.customer_name,
    orderId: order.id.slice(0, 8),
  };
  
  const fallback = `❌ *Order Cancelled* ❌\n\nHi ${order.customer_name},\n\nYour order #${order.id.slice(0, 8)} has been cancelled.\n\nIf you have any questions, please contact our support team.`;
  
  await sendTemplatedNotification('ORDER_CANCELLED', order.customer_phone, variables, order.id, fallback);
}

/**
 * Send refund confirmation notification
 */
export async function notifyRefundProcessed(order: OrderData, refundAmount?: number | string): Promise<void> {
  if (!order.customer_phone) return;
  
  const amount = refundAmount || order.refund_amount || order.total;
  
  const variables = {
    customerName: order.customer_name,
    orderId: order.id.slice(0, 8),
    refundAmount: String(amount),
  };
  
  const fallback = `💰 *Refund Processed* 💰\n\nHi ${order.customer_name},\n\nWe've processed your refund of ₹${amount} for order #${order.id.slice(0, 8)}.\n\nThe amount should appear in your account within 5-7 business days.\n\nThank you for your patience.`;
  
  await sendTemplatedNotification('REFUND_CONFIRMATION', order.customer_phone, variables, order.id, fallback);
}

// Export all notification functions
export {
  getTemplate,
  processTemplate,
  sendTemplatedNotification,
};
