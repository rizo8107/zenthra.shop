import { useQuery } from '@tanstack/react-query';
import { getAbandonedCartAnalytics } from '@/lib/pocketbase';
import type { AbandonedCartAnalytics } from '@/lib/types';

export function useAbandonedCarts() {
  const { data, isLoading, error } = useQuery<AbandonedCartAnalytics>({
    queryKey: ['abandoned-cart-analytics'],
    queryFn: async () => {
      try {
        return await getAbandonedCartAnalytics();
      } catch (err) {
        console.error('Error fetching abandoned cart analytics:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    analytics: data,
    isLoading,
    error,
  };
}
