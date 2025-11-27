import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { columns } from '@/components/tables/payments/columns';
import { useRazorpayOrders } from '@/hooks/useRazorpayOrders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import { format } from 'date-fns';
import {
  PlusIcon,
  Link2,
  CreditCard,
  Copy,
  ExternalLink,
  Trash2,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { CreatePaymentDialog } from '@/components/dialogs/CreatePaymentDialog';
import { CreatePaymentLinkDialog } from '@/components/dialogs/CreatePaymentLinkDialog';

interface PaymentLink {
  id: string;
  title: string;
  link_code: string;
  total: number;
  status: 'active' | 'used' | 'expired';
  prefill_name: string;
  prefill_phone: string;
  prefill_email: string;
  expires_at: string | null;
  created: string;
  order_id?: string;
}

const PaymentsPage = () => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentLinkDialogOpen, setIsPaymentLinkDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('payments');
  
  // Payment links state
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  
  const { razorpayOrders, isLoading, error, createRazorpayOrder } = useRazorpayOrders();

  // Load payment links
  const loadPaymentLinks = async () => {
    try {
      setLoadingLinks(true);
      const records = await pb.collection('payment_links').getList(1, 100, {
        sort: '-created',
      });
      setPaymentLinks(records.items as unknown as PaymentLink[]);
    } catch (error) {
      console.error('Failed to load payment links:', error);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'links') {
      loadPaymentLinks();
    }
  }, [activeTab]);

  // Get payment link URL
  const getPaymentLinkUrl = (code: string) => {
    let baseUrl = window.location.origin;
    try {
      const url = new URL(baseUrl);
      const hostParts = url.hostname.split('.');
      if (hostParts.length > 2) {
        const subdomain = hostParts[0].toLowerCase();
        if (['admin', 'backend', 'api', 'app'].includes(subdomain)) {
          hostParts.shift();
          url.hostname = hostParts.join('.');
          baseUrl = url.origin;
        }
      }
    } catch (e) {
      console.error('Error parsing URL:', e);
    }
    baseUrl = baseUrl.replace(':8081', ':8080');
    return `${baseUrl}/pay/${code}`;
  };

  // Copy link to clipboard
  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(getPaymentLinkUrl(code));
      toast({ title: 'Copied!', description: 'Payment link copied to clipboard' });
    } catch {
      toast({ title: 'Failed', description: 'Could not copy link', variant: 'destructive' });
    }
  };

  // Delete payment link
  const deletePaymentLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment link?')) return;
    try {
      await pb.collection('payment_links').delete(id);
      toast({ title: 'Deleted', description: 'Payment link deleted' });
      loadPaymentLinks();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete payment link', variant: 'destructive' });
    }
  };

  // Get status badge
  const getStatusBadge = (status: string, expiresAt: string | null) => {
    // Check if expired
    if (expiresAt && new Date(expiresAt) < new Date() && status === 'active') {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700"><Clock className="w-3 h-3 mr-1" /> Expired</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'used':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><CheckCircle className="w-3 h-3 mr-1" /> Used</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Transform payments data
  const tableData = razorpayOrders.map(order => ({
    id: order.id,
    razorpay_order_id: order.razorpay_order_id,
    amount: order.amount,
    status: order.status,
    payment_id: order.payment_id,
    created: order.created,
    updated: order.updated,
  }));

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Payments</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-2">
              <Link2 className="h-4 w-4" />
              Payment Links
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </div>
            
            {error ? (
              <div className="p-4 text-destructive">Error loading payments: {error.message}</div>
            ) : (
              <DataTable
                columns={columns}
                data={tableData}
                isLoading={isLoading}
                searchField="razorpay_order_id"
              />
            )}
          </TabsContent>

          {/* Payment Links Tab */}
          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Payment Links
                  </CardTitle>
                  <CardDescription>
                    Create and manage shareable payment links for customers
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadPaymentLinks}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loadingLinks ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button onClick={() => setIsPaymentLinkDialogOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Link
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLinks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : paymentLinks.length === 0 ? (
                  <div className="text-center py-8">
                    <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No payment links created yet</p>
                    <Button onClick={() => setIsPaymentLinkDialogOpen(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Your First Link
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentLinks.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{link.title}</p>
                              <p className="text-xs text-muted-foreground font-mono">{link.link_code}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ₹{link.total.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            {link.prefill_name || link.prefill_phone || link.prefill_email ? (
                              <div className="text-sm">
                                {link.prefill_name && <p>{link.prefill_name}</p>}
                                {link.prefill_phone && <p className="text-muted-foreground">{link.prefill_phone}</p>}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(link.status, link.expires_at)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(link.created), 'dd MMM yyyy, h:mm a')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => copyLink(link.link_code)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(getPaymentLinkUrl(link.link_code), '_blank')}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Open Link
                                </DropdownMenuItem>
                                {link.order_id && (
                                  <DropdownMenuItem onClick={() => window.location.href = `/admin/orders?id=${link.order_id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Order
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => deletePaymentLink(link.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CreatePaymentDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={createRazorpayOrder.mutateAsync}
        />

        <CreatePaymentLinkDialog
          open={isPaymentLinkDialogOpen}
          onOpenChange={setIsPaymentLinkDialogOpen}
          onCreated={() => loadPaymentLinks()}
        />
      </div>
    </AdminLayout>
  );
};

export default PaymentsPage;
