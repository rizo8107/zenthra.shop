import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon } from 'lucide-react';
import { useCoupons, Coupon } from '@/hooks/useCoupons';
import { CouponCrudDialog } from '@/components/dialogs/CouponCrudDialog';

type DialogMode = 'create' | 'edit';

const columns = (onEdit: (coupon: Coupon) => void) => [
  {
    header: 'Code',
    accessorKey: 'code',
    cell: (item: Coupon) => (
      <div className="flex items-center gap-2">
        <span className="font-semibold">{item.code}</span>
        {!item.active && <Badge variant="secondary">Inactive</Badge>}
      </div>
    ),
  },
  {
    header: 'Discount',
    accessorKey: 'discount_value',
    cell: (item: Coupon) => (
      <span>
        {item.discount_type === 'percentage'
          ? `${item.discount_value}%`
          : `₹${item.discount_value}`}
      </span>
    ),
  },
  {
    header: 'Schedule',
    accessorKey: 'start_date',
    cell: (item: Coupon) => (
      <div className="text-sm text-muted-foreground">
        <div>Start: {new Date(item.start_date).toLocaleDateString()}</div>
        <div>End: {new Date(item.end_date).toLocaleDateString()}</div>
      </div>
    ),
  },
  {
    header: 'Usage',
    accessorKey: 'usage',
    cell: (item: Coupon) => (
      <span>
        {item.current_uses || 0}
        {item.max_uses ? ` / ${item.max_uses}` : ''}
      </span>
    ),
  },
  {
    header: 'Display',
    accessorKey: 'display_on_checkout',
    cell: (item: Coupon) => (
      <Badge variant={item.display_on_checkout ? 'default' : 'outline'}>
        {item.display_on_checkout ? 'Shown at Checkout' : 'Hidden'}
      </Badge>
    ),
  },
  {
    header: 'Actions',
    accessorKey: 'actions',
    cell: (item: Coupon) => (
      <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
        Edit
      </Button>
    ),
  },
];

const CouponsPage = () => {
  const { coupons, isLoading, error, createCoupon, updateCoupon, deleteCoupon, refetch } = useCoupons();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  const handleCreateClick = () => {
    setSelectedCoupon(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
            <p className="text-sm text-muted-foreground">Create and manage discount codes.</p>
          </div>
          <Button onClick={handleCreateClick}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Coupon
          </Button>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Failed to load coupons: {error.message}
          </div>
        )}

        <DataTable
          columns={columns(handleEdit)}
          data={coupons}
          isLoading={isLoading}
          searchField="code"
        />

        <CouponCrudDialog
          mode={dialogMode}
          open={dialogOpen}
          coupon={selectedCoupon}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedCoupon(null);
            }
          }}
          onCreate={async (data) => {
            await createCoupon.mutateAsync(data);
            await refetch();
          }}
          onUpdate={async (id, data) => {
            await updateCoupon.mutateAsync({ id, data });
            await refetch();
          }}
          onDelete={async (id) => {
            await deleteCoupon.mutateAsync(id);
            await refetch();
          }}
        />
      </div>
    </AdminLayout>
  );
};

export default CouponsPage;
