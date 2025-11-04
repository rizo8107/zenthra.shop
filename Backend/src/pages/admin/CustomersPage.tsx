import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  UserPlus,
  TrendingUp,
  ShoppingBag,
  Clock3,
  ChevronRight,
  ChevronLeft,
  Users as UsersIcon,
  IndianRupee,
  BarChart3,
  TimerReset,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useUsers, CreateUserData } from '@/hooks/useUsers';
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
import type { CustomerOrderDetail } from '@/lib/types';

type OrderTimelineRowProps = {
  order: CustomerOrderDetail;
  formatCurrency: (value: number) => string;
  formatDate: (value: string | null) => string;
};

const OrderTimelineRow: React.FC<OrderTimelineRowProps> = ({ order, formatCurrency, formatDate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasProducts = (order.products?.length ?? 0) > 0;

  const toggleExpanded = () => {
    if (!hasProducts) return;
    setIsExpanded((prev) => !prev);
  };

  const expandableProps = hasProducts
    ? { onClick: toggleExpanded, 'aria-expanded': isExpanded }
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
            <Badge variant="outline" className="capitalize">{order.status}</Badge>
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

type CustomerTableSort = 'spend' | 'orders' | 'recency' | 'name';

const sortLabels: Record<CustomerTableSort, string> = {
  spend: 'Total spend',
  orders: 'Order count',
  recency: 'Most recent',
  name: 'Name A-Z',
};

const userFormSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  passwordConfirm: z.string().min(8),
  emailVisibility: z.boolean().default(true),
  verified: z.boolean().default(false),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
});

const CustomersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [tableSort, setTableSort] = useState<CustomerTableSort>('spend');
  const [topMetric, setTopMetric] = useState<'spend' | 'orders'>('spend');
  const [page, setPage] = useState(1);
  const { users, totalUsers, isLoading, error, createUser, deleteUser, analytics, isAnalyticsLoading } = useUsers();

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
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
          return b.totalOrders - a.totalOrders;
        case 'recency': {
          const timeA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const timeB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          return timeB - timeA;
        }
        case 'name':
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'spend':
        default:
          return b.totalSpend - a.totalSpend;
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

  const selectedOrders: CustomerOrderDetail[] = useMemo(() => {
    if (!selectedSummary || !analytics?.orderDetails) return [];
    return analytics.orderDetails[selectedSummary.userId] ?? [];
  }, [analytics?.orderDetails, selectedSummary]);

  const topCustomers = useMemo(() => {
    if (topMetric === 'orders') {
      return analytics?.topCustomersByOrders ?? [];
    }
    return analytics?.topCustomersBySpend ?? [];
  }, [analytics?.topCustomersByOrders, analytics?.topCustomersBySpend, topMetric]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser.mutateAsync(id);
    }
  };

  const onSubmit = async (data: z.infer<typeof userFormSchema>) => {
    await createUser.mutateAsync(data as CreateUserData);
    setIsCreateDialogOpen(false);
    form.reset();
  };

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground">Understand buying habits, identify champions, and act on recent activity.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search customers..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new user by filling the details below.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <FormLabel>Confirm Password</FormLabel>
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
                          <FormLabel>Email Visibility</FormLabel>
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
                          <FormLabel>Verified</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createUser.isPending}
                    >
                      {createUser.isPending ? 'Creating...' : 'Create User'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary/90 to-purple-600 text-primary-foreground shadow-lg">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Total customers</CardDescription>
              <CardTitle className="text-3xl font-semibold text-white">{analytics?.totalCustomers ?? 0}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-white/80">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                <span>{analytics?.totalOrders ?? 0} orders tracked</span>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                +{filteredCustomers.length}
              </Badge>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 via-indigo-500 to-sky-500 text-white shadow-lg">
            <div className="absolute right-4 top-4 rounded-full bg-white/15 p-2">
              <IndianRupee className="h-5 w-5" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Lifetime revenue</CardDescription>
              <CardTitle className="text-3xl font-semibold">{formatCurrency(analytics?.totalRevenue ?? 0)}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-white/80">
              <TrendingUp className="h-4 w-4" /> Top 5 contribute {formatCurrency((analytics?.topCustomersBySpend ?? []).reduce((sum, item) => sum + item.totalSpend, 0))}
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg">
            <div className="absolute right-4 top-4 rounded-full bg-white/15 p-2">
              <BarChart3 className="h-5 w-5" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Orders per customer</CardDescription>
              <CardTitle className="text-3xl font-semibold">
                {analytics?.totalCustomers && analytics.totalCustomers > 0
                  ? (analytics.totalOrders / analytics.totalCustomers).toFixed(1)
                  : '0.0'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-white/80">
              <ShoppingBag className="h-4 w-4" /> Avg order {formatCurrency(selectedSummary?.averageOrderValue ?? 0)}
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white shadow-lg">
            <div className="absolute right-4 top-4 rounded-full bg-white/15 p-2">
              <TimerReset className="h-5 w-5" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Recency spotlight</CardDescription>
              <CardTitle className="text-3xl font-semibold">{formatDays(selectedSummary?.daysSinceLastOrder ?? null)}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-white/80">
              <Clock3 className="h-4 w-4" /> Since {formatDate(selectedSummary?.lastOrderDate ?? null)}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Customer Orders</CardTitle>
                <CardDescription>Track frequency, spend, and last activity.</CardDescription>
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
                    <DropdownMenuRadioGroup value={tableSort} onValueChange={(value) => setTableSort(value as CustomerTableSort)}>
                      <DropdownMenuRadioItem value="spend">{sortLabels.spend}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="orders">{sortLabels.orders}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="recency">{sortLabels.recency}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name">{sortLabels.name}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Badge variant="secondary" className="bg-primary/15 text-primary">
                  {filteredCustomers.length} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading || isAnalyticsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">Loading customers…</div>
              ) : error ? (
                <div className="py-6 text-center text-sm text-destructive">Failed to load customers.</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No customers match the current filters.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Customer</th>
                          <th className="px-4 py-3 text-left font-medium">Orders</th>
                          <th className="px-4 py-3 text-left font-medium">Total spend</th>
                          <th className="px-4 py-3 text-left font-medium">Avg order</th>
                          <th className="px-4 py-3 text-left font-medium">First order</th>
                          <th className="px-4 py-3 text-left font-medium">Last order</th>
                          <th className="px-4 py-3 text-left font-medium">Gap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCustomers.map((customer, idx) => (
                          <tr
                            key={customer.userId}
                            className={`${selectedSummary?.userId === customer.userId ? 'border-l-2 border-primary bg-primary/10' : idx % 2 === 0 ? 'bg-muted/30' : ''} transition-colors hover:bg-muted/50`}
                            onClick={() => setSelectedCustomerId(customer.userId)}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">{customer.email || '—'}</div>
                            </td>
                            <td className="px-4 py-3 font-medium">{customer.totalOrders}</td>
                            <td className="px-4 py-3">{formatCurrency(customer.totalSpend)}</td>
                            <td className="px-4 py-3">{formatCurrency(customer.averageOrderValue)}</td>
                            <td className="px-4 py-3">{formatDate(customer.firstOrderDate)}</td>
                            <td className="px-4 py-3">{formatDate(customer.lastOrderDate)}</td>
                            <td className="px-4 py-3">{formatDays(customer.averageGapDays)}</td>
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
            <Card className="border border-primary/10 bg-primary/5 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Top customers</CardTitle>
                  <CardDescription>
                    {topMetric === 'orders' ? 'Based on lifetime orders.' : 'Based on lifetime spend.'}
                  </CardDescription>
                </div>
                <div className="inline-flex rounded-md border border-primary/20 bg-primary/10">
                  <Button
                    type="button"
                    variant={topMetric === 'spend' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setTopMetric('spend')}
                  >
                    Spend
                  </Button>
                  <Button
                    type="button"
                    variant={topMetric === 'orders' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setTopMetric('orders')}
                  >
                    Orders
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No paid customers yet.</p>
                ) : (
                  topCustomers.map((customer, idx) => {
                    const badgeLabel = topMetric === 'orders'
                      ? `${customer.totalOrders} orders`
                      : formatCurrency(customer.totalSpend);
                    return (
                      <div key={customer.userId} className="flex items-center justify-between rounded-md border border-primary/10 bg-background/60 p-3 shadow-sm">
                        <div>
                          <div className="font-medium">{idx + 1}. {customer.name}</div>
                          <div className="text-xs text-muted-foreground">{customer.email || '—'} · {customer.totalOrders} orders</div>
                        </div>
                        <Badge variant="secondary" className="whitespace-nowrap bg-primary/15 text-primary hover:bg-primary/20">{badgeLabel}</Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order timeline</CardTitle>
                <CardDescription>
                  {selectedSummary ? `${selectedSummary.name} · ${selectedSummary.totalOrders} orders` : 'Pick a customer to explore orders.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders for the selected customer.</p>
                ) : (
                  selectedOrders.map((order) => (
                    <OrderTimelineRow
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
            <CardTitle>User Directory</CardTitle>
            <CardDescription>Manage authenticated users in PocketBase.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6 text-muted-foreground">Loading users…</div>
            ) : error ? (
              <div className="py-6 text-center text-sm text-destructive">Error loading users</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Created</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant={user.verified ? 'secondary' : 'outline'}>
                            {user.verified ? 'Verified' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(user.created).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            disabled={deleteUser.isPending}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CustomersPage;
