import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Coupon, CouponFormInput } from '@/hooks/useCoupons';

const numberOrUndefined = () =>
  z.preprocess((val) => {
    if (val === '' || val === null || typeof val === 'undefined') return undefined;
    const parsed = Number(val);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, z.number().nonnegative().optional());

const couponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters'),
  description: z.string().max(200).optional().or(z.literal('')),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.preprocess((val) => Number(val), z.number().positive('Enter a value greater than 0')),
  start_date: z.string(),
  end_date: z.string(),
  active: z.boolean(),
  display_on_checkout: z.boolean(),
  display_priority: numberOrUndefined(),
  min_order_value: numberOrUndefined(),
  max_uses: numberOrUndefined(),
  current_uses: numberOrUndefined(),
});

export type CouponFormValues = z.infer<typeof couponSchema>;

type Mode = 'create' | 'edit';

interface CouponCrudDialogProps {
  mode: Mode;
  open: boolean;
  coupon?: Coupon | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CouponFormInput) => Promise<void>;
  onUpdate: (id: string, data: CouponFormInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function CouponCrudDialog({
  mode,
  open,
  coupon,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: CouponCrudDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date().toISOString().slice(0, 16),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      active: true,
      display_on_checkout: true,
      display_priority: 50,
      min_order_value: undefined,
      max_uses: undefined,
      current_uses: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (coupon) {
        reset({
          code: coupon.code,
          description: coupon.description || '',
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          start_date: coupon.start_date?.slice(0, 16) || new Date().toISOString().slice(0, 16),
          end_date: coupon.end_date?.slice(0, 16) || new Date().toISOString().slice(0, 16),
          active: coupon.active,
          display_on_checkout: coupon.display_on_checkout,
          display_priority: coupon.display_priority,
          min_order_value: coupon.min_order_value,
          max_uses: coupon.max_uses,
          current_uses: coupon.current_uses,
        });
      } else {
        reset();
      }
    }
  }, [coupon, open, reset]);

  const serializeDateForPocketBase = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  };

  const onSubmit = async (values: CouponFormValues) => {
    const payload: CouponFormInput = {
      code: values.code,
      description: values.description || undefined,
      discount_type: values.discount_type,
      discount_value: values.discount_value,
      start_date: serializeDateForPocketBase(values.start_date),
      end_date: serializeDateForPocketBase(values.end_date),
      active: values.active,
      display_on_checkout: values.display_on_checkout,
      display_priority: values.display_priority,
      min_order_value: values.min_order_value,
      max_uses: values.max_uses,
      current_uses: values.current_uses,
    };

    if (mode === 'edit' && coupon) {
      await onUpdate(coupon.id, payload);
    } else {
      await onCreate(payload);
    }

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!coupon?.id || !onDelete) return;
    await onDelete(coupon.id);
    onOpenChange(false);
  };

  const discountType = watch('discount_type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
          <DialogDescription>
            Configure coupon details, usage limits, and availability.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" placeholder="WELCOME10" {...register('code')} />
              {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Discount Type *</Label>
              <Select value={discountType} onValueChange={(value) => setValue('discount_type', value as 'percentage' | 'fixed')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">Discount Value *</Label>
              <Input
                id="discount_value"
                type="number"
                step="0.01"
                min="0"
                {...register('discount_value', { valueAsNumber: true })}
              />
              {errors.discount_value && <p className="text-sm text-red-500">{errors.discount_value.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_order_value">Minimum Order Value</Label>
              <Input id="min_order_value" type="number" step="0.01" min="0" {...register('min_order_value', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} placeholder="Short description for internal use" {...register('description')} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input id="start_date" type="datetime-local" {...register('start_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input id="end_date" type="datetime-local" {...register('end_date')} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_uses">Maximum Uses</Label>
              <Input id="max_uses" type="number" min="0" {...register('max_uses', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_uses">Current Uses</Label>
              <Input id="current_uses" type="number" min="0" {...register('current_uses', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_priority">Display Priority</Label>
              <Input id="display_priority" type="number" min="0" {...register('display_priority', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Enable or disable coupon usage</p>
              </div>
              <Switch checked={watch('active')} onCheckedChange={(checked) => setValue('active', checked)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Display on Checkout</p>
                <p className="text-xs text-muted-foreground">Show as suggestion to customers</p>
              </div>
              <Switch
                checked={watch('display_on_checkout')}
                onCheckedChange={(checked) => setValue('display_on_checkout', checked)}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            {mode === 'edit' && onDelete && coupon?.id ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                Delete Coupon
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Coupon'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
