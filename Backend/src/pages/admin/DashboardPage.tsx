import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal';
import { DashboardMetrics, Order, OrderStatus, ProductSalesSummary } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { getDashboardMetrics, getMonthlyRevenueData, getOrders, getProductSalesSummary, updateOrderStatus, type RevenueGroupBy } from '@/lib/pocketbase';
import { mapPocketBaseOrderToOrder } from '@/lib/mapper';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Clock, Check, DollarSign, TrendingUp, Calendar } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<{ label: string; revenue: number }[]>([]);
  const [revenueRange, setRevenueRange] = useState<'day' | 'week' | 'month'>('month');
  const [revenueDateRange, setRevenueDateRange] = useState<DateRange | undefined>(undefined);
  const [isRevenueLoading, setIsRevenueLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productSales, setProductSales] = useState<ProductSalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const [productDateRange, setProductDateRange] = useState<DateRange | undefined>(undefined);
  const [productSearch, setProductSearch] = useState('');
  const [productTopN, setProductTopN] = useState<number>(15);

  // Fetch dashboard data
  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        setIsRevenueLoading(true);

        const startDate = revenueDateRange?.from
          ? new Date(revenueDateRange.from.setHours(0, 0, 0, 0)).toISOString()
          : undefined;
        const endDate = revenueDateRange?.to
          ? new Date(revenueDateRange.to.setHours(23, 59, 59, 999)).toISOString()
          : undefined;

        const response = await getMonthlyRevenueData({
          startDate,
          endDate,
          groupBy: revenueRange as RevenueGroupBy,
        });
        setRevenueData(response);
      } catch (error) {
        console.error('Error fetching revenue data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load revenue data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsRevenueLoading(false);
      }
    };

    void fetchRevenue();
  }, [revenueRange, revenueDateRange, toast]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch metrics
        const metricsData = await getDashboardMetrics();
        setMetrics(metricsData);

        // Fetch revenue data for chart (default: current year, monthly)
        const revenueDataResponse = await getMonthlyRevenueData();
        setRevenueData(revenueDataResponse);

        // Fetch product sales summary
        const productSalesResponse = await getProductSalesSummary();
        setProductSales(productSalesResponse);

        // Fetch recent orders
        const ordersResponse = await getOrders(10); // Limit to 10 recent orders
        const mappedOrders = ordersResponse.items.map(mapPocketBaseOrderToOrder);
        setOrders(mappedOrders);

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data. Please try again.',
          variant: 'destructive'
        });
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  useEffect(() => {
    const fetchProductSales = async () => {
      setIsProductLoading(true);
      try {
        const startDate = productDateRange?.from
          ? new Date(productDateRange.from.setHours(0, 0, 0, 0)).toISOString()
          : undefined;
        const endDate = productDateRange?.to
          ? new Date(productDateRange.to.setHours(23, 59, 59, 999)).toISOString()
          : undefined;

        const response = await getProductSalesSummary({ startDate, endDate });
        setProductSales(response);
      } catch (error) {
        console.error('Error fetching product sales:', error);
        toast({
          title: 'Error',
          description: 'Failed to load product sales data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsProductLoading(false);
      }
    };

    void fetchProductSales();
  }, [productDateRange, toast]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      // Update order status in PocketBase
      await updateOrderStatus(orderId, status);

      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: status as OrderStatus, updated: new Date().toISOString() } 
            : order
        )
      );
      
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: status as OrderStatus,
          updated: new Date().toISOString()
        });
      }
      
      toast({
        title: 'Order Updated',
        description: `Order ${orderId.slice(0, 8)} status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update order status. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const topNValue = productTopN > 0 ? String(productTopN) : 'all';

  const visibleProductItems = useMemo(() => {
    if (!productSales) return [] as ProductSalesSummary['items'];
    const search = productSearch.trim().toLowerCase();
    const filtered = productSales.items.filter((item) =>
      item.name.toLowerCase().includes(search)
    );
    if (productTopN > 0) {
      return filtered.slice(0, productTopN);
    }
    return filtered;
  }, [productSales, productSearch, productTopN]);

  const visibleSummary = useMemo(() => {
    const totalUnits = visibleProductItems.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalRevenue = visibleProductItems.reduce((sum, item) => sum + item.totalRevenue, 0);
    return {
      products: visibleProductItems.length,
      units: totalUnits,
      revenue: totalRevenue,
    };
  }, [visibleProductItems]);

  const resetProductFilters = () => {
    setProductDateRange(undefined);
    setProductSearch('');
    setProductTopN(15);
  };

  const resetRevenueFilters = () => {
    setRevenueRange('month');
    setRevenueDateRange(undefined);
  };

  return (
    <AdminLayout>
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your store performance</p>
          </div>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Product Sales</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-3">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary/90 to-purple-600 text-primary-foreground shadow-lg">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <CardHeader className="pb-1 sm:pb-2 px-4 sm:px-6 pt-3 sm:pt-4">
                <CardDescription className="text-xs sm:text-sm text-white/70">Total Orders</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-semibold text-white flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
                  {metrics ? metrics.total_orders : '—'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-[11px] sm:text-xs text-white/80">All time orders</CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg">
              <div className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full bg-white/15 p-1.5 sm:p-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <CardHeader className="pb-1 sm:pb-2 px-4 sm:px-6 pt-3 sm:pt-4">
                <CardDescription className="text-xs sm:text-sm text-white/70">Pending Orders</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-semibold">{metrics ? metrics.pending_orders : '—'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-[11px] sm:text-xs text-white/80">Need attention</CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg">
              <div className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full bg-white/15 p-1.5 sm:p-2">
                <Check className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <CardHeader className="pb-1 sm:pb-2 px-4 sm:px-6 pt-3 sm:pt-4">
                <CardDescription className="text-xs sm:text-sm text-white/70">Completed Orders</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-semibold">{metrics ? metrics.completed_orders : '—'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-[11px] sm:text-xs text-white/80">Successfully delivered</CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 text-white shadow-lg">
              <div className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full bg-white/15 p-1.5 sm:p-2">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <CardHeader className="pb-1 sm:pb-2 px-4 sm:px-6 pt-3 sm:pt-4">
                <CardDescription className="text-xs sm:text-sm text-white/70">Total Revenue</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-semibold">{metrics ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.total_revenue) : '—'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-[11px] sm:text-xs text-white/80">vs last month</CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 text-white shadow-lg">
              <div className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full bg-white/15 p-1.5 sm:p-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <CardHeader className="pb-1 sm:pb-2 px-4 sm:px-6 pt-3 sm:pt-4">
                <CardDescription className="text-xs sm:text-sm text-white/70">Average Order Value</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-semibold">{metrics ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.average_order_value) : '—'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-[11px] sm:text-xs text-white/80">vs last month</CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 text-white shadow-lg">
              <div className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full bg-white/15 p-1.5 sm:p-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <CardHeader className="pb-1 sm:pb-2 px-4 sm:px-6 pt-3 sm:pt-4">
                <CardDescription className="text-xs sm:text-sm text-white/70">Revenue Today</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-semibold">{metrics ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(metrics.revenue_today) : '—'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-[11px] sm:text-xs text-white/80">From today's orders</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>
                  Revenue over time ({revenueRange === 'day' ? 'Daily' : revenueRange === 'week' ? 'Weekly' : 'Monthly'})
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground">Range</Label>
                  <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setRevenueRange('day')}
                      className={`px-2 py-1 rounded-sm ${revenueRange === 'day' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    >
                      Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevenueRange('week')}
                      className={`px-2 py-1 rounded-sm ${revenueRange === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    >
                      Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevenueRange('month')}
                      className={`px-2 py-1 rounded-sm ${revenueRange === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    >
                      Month
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground">Custom range</Label>
                  <DateRangePicker value={revenueDateRange} onChange={setRevenueDateRange} />
                  <Button variant="ghost" size="sm" onClick={resetRevenueFilters}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="h-80 min-w-[600px]">
                  {isRevenueLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : revenueData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No revenue data for the selected range.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={revenueData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                        <Bar dataKey="revenue" fill="#0c8ee8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
            <OrdersTable
              orders={orders}
              isLoading={isLoading}
              onViewOrder={handleViewOrder}
              onUpdateStatus={handleUpdateOrderStatus}
            />
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Refine product performance by timeframe or keyword.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 flex-1">
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium">Date range</Label>
                    <DateRangePicker value={productDateRange} onChange={setProductDateRange} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium">Search products</Label>
                    <Input
                      placeholder="Search by product name"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium">Show top</Label>
                    <Select
                      value={topNValue}
                      onValueChange={(value) =>
                        setProductTopN(value === 'all' ? 0 : Number(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Top products" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">Top 10</SelectItem>
                        <SelectItem value="15">Top 15</SelectItem>
                        <SelectItem value="25">Top 25</SelectItem>
                        <SelectItem value="50">Top 50</SelectItem>
                        <SelectItem value="all">Show All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={resetProductFilters}>Reset</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Sales Summary</CardTitle>
              <CardDescription>Aggregated performance across all orders</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Card key={idx} className="animate-pulse">
                      <CardContent className="space-y-3 py-6">
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                        <div className="h-6 w-24 bg-gray-200 rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : productSales ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Products Shown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold">{visibleSummary.products}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {productSales.totalProductsSold} total within selected range
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Units Sold (visible)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold">{visibleSummary.units}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {productSales.totalItemsSold} total units in date range
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Top Product
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {visibleProductItems.length > 0 ? (
                        <div>
                          <p className="text-lg font-semibold">{visibleProductItems[0].name}</p>
                          <p className="text-sm text-muted-foreground">
                            {visibleProductItems[0].totalQuantity} units • {formatCurrency(visibleProductItems[0].totalRevenue)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No product sales data available yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Units Sold by Product</CardTitle>
              <CardDescription>Visual breakdown of quantities sold</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              {isProductLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : visibleProductItems.length > 0 ? (
                <div className="h-[320px] sm:h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={visibleProductItems}
                      layout="vertical"
                      margin={{ top: 20, right: 24, left: 16, bottom: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'totalRevenue' ? formatCurrency(Number(value)) : value,
                          name === 'totalRevenue' ? 'Revenue' : 'Units',
                        ]}
                      />
                      <Bar dataKey="totalQuantity" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No products match the current filters.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Performance Details</CardTitle>
              <CardDescription>Comprehensive view of quantities and revenue</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {visibleProductItems.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-6">Product</th>
                      <th className="py-2 pr-6">Units Sold</th>
                      <th className="py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProductItems.map((item) => (
                      <tr key={item.productId} className="border-t">
                        <td className="py-2 pr-6 font-medium">{item.name}</td>
                        <td className="py-2 pr-6">{item.totalQuantity}</td>
                        <td className="py-2">{formatCurrency(item.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground">No product sales recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      </Tabs>
    </AdminLayout>
  );
};

export default DashboardPage;
