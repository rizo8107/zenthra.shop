import { pb } from '@/lib/pocketbase';

/**
 * Generates a formatted order ID like O1234, O1235, etc.
 * Checks existing orders to ensure uniqueness.
 */
export async function generateOrderId(): Promise<string> {
  try {
    // Get the latest order with a formatted order_number to determine the next number
    const existingOrders = await pb.collection('orders').getList(1, 1, {
      sort: '-created',
      filter: 'order_number != ""',
    });

    let nextNumber = 1;
    
    if (existingOrders.items.length > 0) {
      const latestOrder = existingOrders.items[0];
      const latestOrderNumber = latestOrder.order_number;
      
      if (latestOrderNumber && typeof latestOrderNumber === 'string') {
        // Extract number from format like "O1234"
        const match = latestOrderNumber.match(/O(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
    }

    // Format as O1234, O1235, etc.
    return `O${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating order ID:', error);
    // Fallback to timestamp-based ID if PocketBase query fails
    const timestamp = Date.now().toString().slice(-4);
    return `O${timestamp}`;
  }
}

/**
 * Generates a unique order ID by checking for conflicts
 */
export async function generateUniqueOrderId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const orderId = await generateOrderId();
    
    try {
      // Check if this order ID already exists
      const existing = await pb.collection('orders').getList(1, 1, {
        filter: `order_number = "${orderId}"`,
      });
      
      if (existing.items.length === 0) {
        return orderId;
      }
      
      attempts++;
    } catch (error) {
      // If query fails, assume the ID is unique
      return orderId;
    }
  }
  
  // Fallback to timestamp if we can't generate unique ID
  const timestamp = Date.now().toString().slice(-6);
  return `O${timestamp}`;
}
