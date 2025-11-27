import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';
import { Order, Product, UpdateOrderData as SchemaUpdateOrderData } from '@/types/schema';
import { toast } from 'sonner';
import {
  notifyOrderConfirmation,
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyOrderShipped,
  notifyOutForDelivery,
  notifyOrderDelivered,
  notifyOrderCancelled,
  notifyRefundProcessed,
} from '@/lib/whatsapp-service';

export interface CreateOrderData {
  user_id: string;
  status: string;
  total_amount: number;
  shipping_address?: string;
  items?: string[];
}

// Extend the UpdateOrderData interface to include all properties used in this file
interface UpdateOrderData extends SchemaUpdateOrderData {
  refund_amount?: number;
  payment_status?: 'pending' | 'paid' | 'failed';
}

export function useOrders() {
  const queryClient = useQueryClient();

  // Fetch all orders
  const { data, isLoading, error } = useQuery<{ items: Order[], totalItems: number }>({    
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        await ensureAdminAuth();
        console.log('Fetching orders...');
        // Load all orders so old/backdated records also appear in client search
        const fullList = await pb.collection('orders').getFullList({
          sort: '-created',
          expand: 'user_id,shipping_address,items',
        });
        console.log('Fetched orders count:', fullList.length);

        return {
          items: fullList as unknown as Order[],
          totalItems: fullList.length,
        };
      } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create order
  const createOrder = useMutation({
    mutationFn: async (data: CreateOrderData) => {
      try {
        await ensureAdminAuth();
        const record = await pb.collection('orders').create(data);
        return record;
      } catch (error) {
        console.error('Error creating order:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order created successfully');
      
      // Send WhatsApp order confirmation if customer phone is available
      try {
        const order = data as unknown as Order;
        if (order.customer_phone) {
          const expandedItems = Array.isArray(order.expand?.items) ? order.expand.items : [];
          const firstProductName = expandedItems[0]?.name || '';
          const productList = expandedItems.map((item) => item.name).join(', ');
          const itemsCount = expandedItems.length;

          void notifyOrderConfirmation({
            id: order.id,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            total: order.total,
            first_product_name: firstProductName,
            product_list: productList,
            items_count: itemsCount,
          }).catch(err => console.error('Failed to send WhatsApp confirmation:', err));
        }
      } catch (whatsappError) {
        console.error('Error sending WhatsApp notification:', whatsappError);
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });

  // Update order
  const updateOrder = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrderData }) => {
      try {
        await ensureAdminAuth();
        
        // Get the current order to compare status changes
        const currentOrder = await pb.collection('orders').getOne(id);
        const newStatus = data.status;
        const currentStatus = currentOrder.status;
        const paymentStatus = currentOrder.payment_status;
        
        // Update the order
        const record = await pb.collection('orders').update(id, data);
        
        // Handle WhatsApp notifications based on status changes
        if (newStatus && newStatus !== currentStatus && record.customer_phone) {
          const orderRecord = record as unknown as Order;
          const expandedItems = Array.isArray(orderRecord.expand?.items) ? orderRecord.expand.items : [];
          const firstProductName = expandedItems[0]?.name || '';
          const productList = expandedItems.map((item) => item.name).join(', ');
          const itemsCount = expandedItems.length;

          const orderData = {
            id: orderRecord.id,
            customer_name: orderRecord.customer_name,
            customer_phone: orderRecord.customer_phone,
            total: orderRecord.total,
            tracking_link: orderRecord.tracking_link,
            shipping_carrier: orderRecord.shipping_carrier,
            refund_amount: data.refund_amount || orderRecord.refund_amount,
            first_product_name: firstProductName,
            product_list: productList,
            items_count: itemsCount,
          };
          
          // Different notifications based on new status
          switch(newStatus) {
            case 'processing':
              // If payment is successful, send payment success notification
              if (paymentStatus === 'paid') {
                notifyPaymentSuccess(orderData).catch(err => 
                  console.error('Failed to send payment success notification:', err)
                );
              }
              break;
              
            case 'shipped':
              notifyOrderShipped(orderData).catch(err => 
                console.error('Failed to send order shipped notification:', err)
              );
              break;
              
            case 'out_for_delivery':
              notifyOutForDelivery(orderData).catch(err => 
                console.error('Failed to send out for delivery notification:', err)
              );
              break;
              
            case 'delivered':
              notifyOrderDelivered(orderData).catch(err => 
                console.error('Failed to send order delivered notification:', err)
              );
              break;
              
            case 'cancelled':
              // If refunded, send refund confirmation
              if (data.refund_amount || orderRecord.refund_amount) {
                notifyRefundProcessed(orderData, data.refund_amount || orderRecord.refund_amount).catch(err => 
                  console.error('Failed to send refund confirmation:', err)
                );
              } else {
                notifyOrderCancelled(orderData).catch(err => 
                  console.error('Failed to send cancellation notification:', err)
                );
              }
              break;
          }
        }
        
        // Handle payment status changes
        if (data.payment_status && data.payment_status !== paymentStatus && record.customer_phone) {
          const orderRecord = record as unknown as Order;
          const expandedItems = Array.isArray(orderRecord.expand?.items) ? orderRecord.expand.items : [];
          const firstProductName = expandedItems[0]?.name || '';
          const productList = expandedItems.map((item) => item.name).join(', ');
          const itemsCount = expandedItems.length;

          const orderData = {
            id: orderRecord.id,
            customer_name: orderRecord.customer_name,
            customer_phone: orderRecord.customer_phone,
            total: orderRecord.total,
            first_product_name: firstProductName,
            product_list: productList,
            items_count: itemsCount,
          };
          
          if (data.payment_status === 'paid') {
            notifyPaymentSuccess(orderData).catch(err => 
              console.error('Failed to send payment success notification:', err)
            );
          } else if (data.payment_status === 'failed') {
            notifyPaymentFailed(orderData).catch(err => 
              console.error('Failed to send payment failed notification:', err)
            );
          }
        }
        
        return record;
      } catch (error) {
        console.error('Error updating order:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });

  // Delete order
  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      try {
        await ensureAdminAuth();
        await pb.collection('orders').delete(id);
      } catch (error) {
        console.error('Error deleting order:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete order: ' + error.message);
    },
  });

  return {
    orders: data?.items || [],
    totalItems: data?.totalItems || 0,
    isLoading,
    error,
    createOrder,
    updateOrder,
    deleteOrder,
  };
}
