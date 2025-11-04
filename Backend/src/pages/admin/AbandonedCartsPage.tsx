import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  AlertTriangle,
  ShoppingBag,
  Clock3,
  ChevronRight,
  ChevronLeft,
  Users as UsersIcon,
  IndianRupee,
  Target,
  Hourglass,
} from 'lucide-react';
import { useAbandonedCarts } from '@/hooks/useAbandonedCarts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AbandonedCartDetail } from '@/lib/types';
import { useUsers, CreateUserData } from '@/hooks/useUsers';

const abandonedUserFormSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  passwordConfirm: z.string().min(8),
  emailVisibility: z.boolean().default(true),
  verified: z.boolean().default(false),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ['passwordConfirm'],
});

type AbandonedTableSort = 'value' | 'orders' | 'recency' | 'name';

type TopMetric = 'value' | 'orders';

const sortLabels: Record<AbandonedTableSort, string> = {
  value: 'Pending value',
  orders: 'Order count',
  recency: 'Most recent',
  name: 'Name A-Z',
};

const topMetricLabels: Record<TopMetric, string> = {
  value: 'Value',
  orders: 'Orders',
};

type AbandonedTimelineRowProps = {
  order: AbandonedCartDetail;
  formatCurrency: (value: number) => string;
  formatDate: (value: string | null) => string;
};

const AbandonedTimelineRow: React.FC<AbandonedTimelineRowProps> = ({ order, formatCurrency, formatDate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasProducts = (order.products?.length ?? 0) > 0;

  const expandableProps = hasProducts
    ? { onClick: () => setIsExpanded((prev) => !prev), 'aria-expanded': isExpanded }
    : {};

  return (
    <div className="rounded-md border p-3 text-sm">
      <button
        type="button"
        {...expandableProps}
        className={`flex w-full flex-col gap-2 text-left ${hasProducts ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasProducts ? (
              <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            ) : (
              <span className="inline-block h-4 w-4" />
            )}
            <span className="font-medium">Order #{order.id.slice(0, 6)}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(order.created)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{formatCurrency(order.total)}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="capitalize">{order.status || 'pending'}</Badge>
            {order.paymentStatus && (
              <Badge variant="secondary" className="capitalize">{order.paymentStatus}</Badge>
            )}
            <span>{order.itemsCount} items</span>
          </div>
        </div>
      </button>

      {isExpanded && hasProducts && (
        <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3">
          {order.products?.map((product) => (
            <div key={`${order.id}-${product.productId}`} className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{product.name}</span>
              <span className="text-muted-foreground">×{product.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AbandonedCartsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [tableSort, setTableSort] = useState<AbandonedTableSort>('value');
  const [topMetric, setTopMetric] = useState<TopMetric>('value');
  const [page, setPage] = useState(1);
  const { analytics, isLoading, error } = useAbandonedCarts();

  // reuse existing user creation utilities for quick outreach
  const { createUser, deleteUser, updateUser } = useUsers();
  const form = useForm<z.infer<typeof abandonedUserFormSchema>>({
    resolver: zodResolver(abandonedUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirm: '',
      emailVisibility: true,
      verified: false,
    },
  });

  const filteredCustomers = useMemo(() => {
    const customers = analytics?.customers ?? [];
    const query = searchQuery.trim().toLowerCase();

    const filtered = query.length === 0
      ? [...customers]
      : customers.filter((customer) => {
          const name = customer.name?.toLowerCase() ?? '';
          const email = customer.email?.toLowerCase() ?? '';
          return name.includes(query) || email.includes(query);
        });

    filtered.sort((a, b) => {
      switch (tableSort) {
        case 'orders':
          return b.pendingOrders - a.pendingOrders;
        case 'recency': {
          const timeA = a.lastPendingDate ? new Date(a.lastPendingDate).getTime() : 0;
          const timeB = b.lastPendingDate ? new Date(b.lastPendingDate).getTime() : 0;
          return timeB - timeA;
        }
        case 'name':
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'value':
        default:
          return b.totalValue - a.totalValue;
      }
    });

    return filtered;
  }, [analytics?.customers, searchQuery, tableSort]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, tableSort]);

  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  const selectedSummary = useMemo(() => {
    const targetId = selectedCustomerId ?? filteredCustomers[0]?.userId;
    if (!targetId) return null;
    return filteredCustomers.find((customer) => customer.userId === targetId) ?? null;
  }, [filteredCustomers, selectedCustomerId]);

  useEffect(() => {
    if (paginatedCustomers.length === 0) {
      setSelectedCustomerId(null);
      return;
    }

    if (!paginatedCustomers.some((customer) => customer.userId === selectedCustomerId)) {
      setSelectedCustomerId(paginatedCustomers[0].userId);
    }
  }, [paginatedCustomers, selectedCustomerId]);

  const selectedOrders: AbandonedCartDetail[] = useMemo(() => {
    if (!selectedSummary || !analytics?.orderDetails) return [];
    return analytics.orderDetails[selectedSummary.userId] ?? [];
  }, [analytics?.orderDetails, selectedSummary]);

  const topCustomers = useMemo(() => {
    if (!analytics) return [];
    return topMetric === 'orders' ? analytics.topCustomersByOrders : analytics.topCustomersByValue;
  }, [analytics, topMetric]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  const formatDate = (value: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  };

  const formatDays = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '—';
    if (value < 1) {
      return '<1 day';
    }
    return `${Math.round(value)} days`;
  };

  const handleCreateUser = async (data: z.infer<typeof abandonedUserFormSchema>) => {
    await createUser.mutateAsync(data as CreateUserData);
    form.reset();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Abandoned carts</h1>
            <p className="text-muted-foreground">Identify shoppers who left before paying and follow up quickly.</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search abandoned customers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-rose-500 via-pink-500 to-purple-500 text-white shadow-lg">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Total at-risk customers</CardDescription>
              <CardTitle className="text-3xl font-semibold">{analytics?.totalCustomers ?? 0}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-white/80">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                <span>{analytics?.totalPendingOrders ?? 0} pending orders</span>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">Watch list</Badge>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white shadow-lg">
            <div className="absolute right-4 top-4 rounded-full bg-white/15 p-2">
              <IndianRupee className="h-5 w-5" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Open revenue</CardDescription>
              <CardTitle className="text-3xl font-semibold">{formatCurrency(analytics?.totalPendingValue ?? 0)}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-white/80">
              <AlertTriangle className="h-4 w-4" /> Value of orders waiting for payment
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 via-green-500 to-lime-500 text-white shadow-lg">
            <div className="absolute right-4 top-4 rounded-full bg-white/15 p-2">
              <Target className="h-5 w-5" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Orders per customer</CardDescription>
              <CardTitle className="text-3xl font-semibold">
                {analytics?.totalCustomers && analytics.totalCustomers > 0
                  ? (analytics.totalPendingOrders / analytics.totalCustomers).toFixed(1)
                  : '0.0'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-white/80">
              <ShoppingBag className="h-4 w-4" /> Avg pending value {formatCurrency(selectedSummary?.averageOrderValue ?? 0)}
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-lg">
            <div className="absolute right-4 top-4 rounded-full bg-white/15 p-2">
              <Hourglass className="h-5 w-5" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Recency spotlight</CardDescription>
              <CardTitle className="text-3xl font-semibold">{formatDays(selectedSummary?.daysSinceLastPending ?? null)}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-white/80">
              <Clock3 className="h-4 w-4" /> Last pending {formatDate(selectedSummary?.lastPendingDate ?? null)}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Abandoned customers</CardTitle>
                <CardDescription>Who left items unpaid and when.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      Sort: {sortLabels[tableSort]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Sort customers</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={tableSort} onValueChange={(value) => setTableSort(value as AbandonedTableSort)}>
                      <DropdownMenuRadioItem value="value">{sortLabels.value}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="orders">{sortLabels.orders}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="recency">{sortLabels.recency}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name">{sortLabels.name}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Badge variant="secondary" className="bg-rose-100/40 text-rose-400">
                  {filteredCustomers.length} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">Loading abandoned carts…</div>
              ) : error ? (
                <div className="py-6 text-center text-sm text-destructive">Failed to load abandoned carts.</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No customers match the current filters.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Customer</th>
                          <th className="px-4 py-3 text-left font-medium">Pending</th>
                          <th className="px-4 py-3 text-left font-medium">Value</th>
                          <th className="px-4 py-3 text-left font-medium">Avg order</th>
                          <th className="px-4 py-3 text-left font-medium">First pending</th>
                          <th className="px-4 py-3 text-left font-medium">Last pending</th>
                          <th className="px-4 py-3 text-left font-medium">Days since</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCustomers.map((customer, idx) => (
                          <tr
                            key={customer.userId}
                            className={`${selectedSummary?.userId === customer.userId ? 'border-l-2 border-rose-500 bg-rose-500/10' : idx % 2 === 0 ? 'bg-muted/30' : ''} transition-colors hover:bg-muted/50`}
                            onClick={() => setSelectedCustomerId(customer.userId)}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">{customer.email || '—'}</div>
                            </td>
                            <td className="px-4 py-3 font-medium">{customer.pendingOrders}</td>
                            <td className="px-4 py-3">{formatCurrency(customer.totalValue)}</td>
                            <td className="px-4 py-3">{formatCurrency(customer.averageOrderValue)}</td>
                            <td className="px-4 py-3">{formatDate(customer.firstPendingDate)}</td>
                            <td className="px-4 py-3">{formatDate(customer.lastPendingDate)}</td>
                            <td className="px-4 py-3">{formatDays(customer.daysSinceLastPending)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                    <span>
                      Showing {(paginatedCustomers.length > 0 ? (page - 1) * pageSize + 1 : 0)}-
                      {Math.min(page * pageSize, filteredCustomers.length)} of {filteredCustomers.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" /> Prev
                      </Button>
                      <span>
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages}
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border border-rose-500/20 bg-rose-500/10 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Top customers</CardTitle>
                  <CardDescription>
                    {topMetric === 'orders' ? 'Most pending orders.' : 'Highest pending value.'}
                  </CardDescription>
                </div>
                <div className="inline-flex rounded-md border border-rose-500/20 bg-rose-500/15">
                  {(['value', 'orders'] as TopMetric[]).map((metric) => (
                    <Button
                      key={metric}
                      type="button"
                      variant={topMetric === metric ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setTopMetric(metric)}
                    >
                      {topMetricLabels[metric]}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending customers yet.</p>
                ) : (
                  topCustomers.map((customer, idx) => {
                    const metricLabel = topMetric === 'orders'
                      ? `${customer.pendingOrders} pending`
                      : formatCurrency(customer.totalValue);
                    return (
                      <div key={customer.userId} className="flex items-center justify-between rounded-md border border-rose-500/20 bg-background/60 p-3 shadow-sm">
                        <div>
                          <div className="font-medium">{idx + 1}. {customer.name}</div>
                          <div className="text-xs text-muted-foreground">{customer.email || '—'} · {customer.pendingOrders} pending</div>
                        </div>
                        <Badge variant="secondary" className="whitespace-nowrap bg-rose-200/50 text-rose-600 hover:bg-rose-200/70">{metricLabel}</Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Pending timeline</CardTitle>
                <CardDescription>
                  {selectedSummary
                    ? `${selectedSummary.name} · ${selectedSummary.pendingOrders} pending`
                    : 'Select a customer to inspect unpaid orders.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending orders for the selected customer.</p>
                ) : (
                  selectedOrders.map((order) => (
                    <AbandonedTimelineRow
                      key={order.id}
                      order={order}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Quick outreach (optional)</CardTitle>
            <CardDescription>Spin up a temporary account to coordinate with the customer if needed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleCreateUser)}
                className="grid gap-4 sm:grid-cols-2"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="passwordConfirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emailVisibility"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Email visibility</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="verified"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Mark verified</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-2">
                  <Button type="submit" className="w-full sm:w-auto" disabled={createUser.isPending}>
                    {createUser.isPending ? 'Creating user…' : 'Create user'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AbandonedCartsPage;
