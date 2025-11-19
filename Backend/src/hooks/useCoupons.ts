import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';
import { toast } from 'sonner';

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  active: boolean;
  display_on_checkout: boolean;
  display_priority?: number;
  min_order_value?: number;
  max_uses?: number;
  current_uses?: number;
  created?: string;
  updated?: string;
}

export type CouponFormInput = Omit<Coupon, 'id' | 'created' | 'updated'>;

interface CouponsQueryParams {
  page?: number;
  perPage?: number;
  sort?: string;
  searchTerm?: string;
}

const DEFAULT_PAGE_SIZE = 20;

export function useCoupons(params: CouponsQueryParams = {}) {
  const queryClient = useQueryClient();
  const {
    page = 1,
    perPage = DEFAULT_PAGE_SIZE,
    sort = '-created',
    searchTerm = '',
  } = params;

  const { data, isLoading, error, refetch } = useQuery<{ items: Coupon[]; totalItems: number; totalPages: number }>({
    queryKey: ['coupons', page, perPage, sort, searchTerm],
    queryFn: async () => {
      await ensureAdminAuth();

      const filters: string[] = [];
      if (searchTerm) {
        filters.push(`code ~ "${searchTerm}" || description ~ "${searchTerm}"`);
      }

      const options: Record<string, unknown> = { sort };
      if (filters.length) {
        options.filter = filters.join(' && ');
      }

      const result = await pb.collection('coupons').getList(page, perPage, options);
      const items = result.items.map((record) => record as unknown as Coupon);

      return {
        items,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / perPage),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const createCoupon = useMutation({
    mutationFn: async (payload: CouponFormInput) => {
      await ensureAdminAuth();
      return pb.collection('coupons').create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon created successfully');
    },
    onError: (err: Error) => {
      toast.error(`Failed to create coupon: ${err.message}`);
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CouponFormInput }) => {
      await ensureAdminAuth();
      return pb.collection('coupons').update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon updated successfully');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update coupon: ${err.message}`);
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      await ensureAdminAuth();
      await pb.collection('coupons').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete coupon: ${err.message}`);
    },
  });

  return {
    coupons: data?.items ?? [],
    totalItems: data?.totalItems ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    error,
    refetch,
    createCoupon,
    updateCoupon,
    deleteCoupon,
  };
}
