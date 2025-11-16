import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, DollarSign, Hash, CheckCircle } from 'lucide-react';
import { CreateRazorpayOrderData } from '@/hooks/useRazorpayOrders';

const formSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  razorpay_order_id: z.string().min(1, 'Razorpay Order ID is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  currency: z.string().default('INR'),
  status: z.enum(['created', 'paid', 'failed']).default('created'),
});

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateRazorpayOrderData) => Promise<void>;
}

export function CreatePaymentDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreatePaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currency: 'INR',
      status: 'created',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      // Ensure all required fields are present
      const paymentData: CreateRazorpayOrderData = {
        order_id: values.order_id,
        razorpay_order_id: values.razorpay_order_id,
        amount: values.amount,
        currency: values.currency,
        status: values.status,
      };
      await onSubmit(paymentData);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedAmount = form.watch('amount');
  const displayAmount = watchedAmount ? (watchedAmount / 100).toFixed(2) : '0.00';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Add New Payment</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new payment record in the system
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Preview */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-900">Payment Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">Amount</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-900">₹{displayAmount}</div>
                  <div className="text-xs text-blue-600">{watchedAmount || 0} paise</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="order_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Order ID</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., ORD-2024-001"
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="razorpay_order_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Razorpay Order ID</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., order_xyz123"
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Amount (in paise)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              placeholder="e.g., 50000"
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            Enter amount in paise (₹1 = 100 paise)
                          </p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="INR">INR (₹)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="created">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-yellow-500"></Badge>
                                  Created
                                </div>
                              </SelectItem>
                              <SelectItem value="paid">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-500"></Badge>
                                  Paid
                                </div>
                              </SelectItem>
                              <SelectItem value="failed">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-red-500"></Badge>
                                  Failed
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Create Payment
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
