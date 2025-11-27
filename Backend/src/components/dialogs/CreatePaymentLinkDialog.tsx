import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import {
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  Check,
  ShoppingBag,
  MessageCircle,
  Send,
} from 'lucide-react';
// Direct Evolution API call (no proxy)

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  images?: string[];
  stock?: number;
  status?: string;
}

interface LineItem {
  product: Product;
  quantity: number;
  customPrice?: number;
}

interface PaymentLink {
  id: string;
  title: string;
  description: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: 'active' | 'used' | 'expired';
  expires_at: string | null;
  prefill_name: string;
  prefill_phone: string;
  prefill_email: string;
  created: string;
  link_code: string;
}

interface CreatePaymentLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (link: PaymentLink) => void;
}

export function CreatePaymentLinkDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePaymentLinkDialogProps) {
  const { toast } = useToast();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [prefillName, setPrefillName] = useState('');
  const [prefillPhone, setPrefillPhone] = useState('');
  const [prefillEmail, setPrefillEmail] = useState('');
  
  // Product search
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  
  // Creation state
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);
  
  // Load products when dialog opens, search panel opens, or search changes
  useEffect(() => {
    async function loadProducts() {
      if (!open) return;
      
      setLoadingProducts(true);
      try {
        const options: Record<string, unknown> = {};
        
        // Only add filter if there's a search query
        if (searchQuery.trim()) {
          options.filter = `name ~ "${searchQuery}" || id ~ "${searchQuery}"`;
        }
        
        console.log('[PaymentLink] Loading products with options:', options);
        const result = await pb.collection('products').getList(1, 50, options);
        console.log('[PaymentLink] Loaded products:', result.items.length);
        setProducts(result.items as unknown as Product[]);
      } catch (error) {
        console.error('[PaymentLink] Failed to load products:', error);
        // Try without any options as fallback
        try {
          console.log('[PaymentLink] Trying fallback without options...');
          const result = await pb.collection('products').getList(1, 50);
          console.log('[PaymentLink] Fallback loaded products:', result.items.length);
          setProducts(result.items as unknown as Product[]);
        } catch (fallbackError) {
          console.error('[PaymentLink] Fallback also failed:', fallbackError);
          setProducts([]);
        }
      } finally {
        setLoadingProducts(false);
      }
    }
    
    loadProducts();
  }, [open, showProductSearch, searchQuery]);
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const price = item.customPrice ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);
  
  const total = Math.max(0, subtotal - discount + shipping);
  
  // Add product to items
  const addProduct = useCallback((product: Product) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setShowProductSearch(false);
    setSearchQuery('');
  }, []);
  
  // Update item quantity
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setItems(prev =>
        prev.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);
  
  // Update custom price
  const updateCustomPrice = useCallback((productId: string, price: number | undefined) => {
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, customPrice: price } : item
      )
    );
  }, []);
  
  // Remove item
  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);
  
  // Generate unique link code
  const generateLinkCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };
  
  // Create payment link
  const handleCreate = async () => {
    if (items.length === 0) {
      toast({
        title: 'No products',
        description: 'Please add at least one product',
        variant: 'destructive',
      });
      return;
    }
    
    setCreating(true);
    try {
      // Calculate expiration date
      let expiresAt: string | null = null;
      if (expiresIn !== 'never') {
        const now = new Date();
        switch (expiresIn) {
          case '1h':
            now.setHours(now.getHours() + 1);
            break;
          case '24h':
            now.setHours(now.getHours() + 24);
            break;
          case '7d':
            now.setDate(now.getDate() + 7);
            break;
          case '30d':
            now.setDate(now.getDate() + 30);
            break;
        }
        expiresAt = now.toISOString();
      }
      
      const linkCode = generateLinkCode();
      
      const linkData = {
        title: title || `Payment Link #${linkCode}`,
        description,
        items: JSON.stringify(items.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_image: item.product.image || (item.product.images?.[0] ?? ''),
          quantity: item.quantity,
          unit_price: item.customPrice ?? item.product.price,
        }))),
        subtotal,
        discount,
        shipping,
        total,
        status: 'active',
        expires_at: expiresAt,
        prefill_name: prefillName,
        prefill_phone: prefillPhone,
        prefill_email: prefillEmail,
        link_code: linkCode,
      };
      
      const record = await pb.collection('payment_links').create(linkData);
      
      const paymentLink: PaymentLink = {
        id: record.id,
        title: record.title,
        description: record.description,
        items,
        subtotal,
        discount,
        shipping,
        total,
        status: 'active',
        expires_at: expiresAt,
        prefill_name: prefillName,
        prefill_phone: prefillPhone,
        prefill_email: prefillEmail,
        created: record.created,
        link_code: linkCode,
      };
      
      setCreatedLink(paymentLink);
      onCreated?.(paymentLink);
      
      toast({
        title: '✅ Payment Link Created',
        description: 'Share this link with your customer',
      });
    } catch (error) {
      console.error('Failed to create payment link:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create payment link',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };
  
  // Get full link URL - Frontend runs on port 8080, Backend on 8081
  const getLinkUrl = (code: string) => {
    // Replace backend port with frontend port
    let baseUrl = window.location.origin;
    // Handle common port mappings
    baseUrl = baseUrl.replace(':8081', ':8080');  // Production-like
    baseUrl = baseUrl.replace(':5173', ':5174');  // Vite dev
    baseUrl = baseUrl.replace(':3001', ':3000');  // Common dev ports
    return `${baseUrl}/pay/${code}`;
  };
  
  // Copy link to clipboard
  const copyLink = async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(getLinkUrl(createdLink.link_code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: 'Payment link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      });
    }
  };
  
  // Send payment link via WhatsApp using Evolution API directly
  const sendViaWhatsApp = async () => {
    if (!createdLink || !createdLink.prefill_phone) {
      toast({
        title: 'No phone number',
        description: 'Please provide a customer phone number to send via WhatsApp',
        variant: 'destructive',
      });
      return;
    }
    
    setSendingWhatsApp(true);
    try {
      // Get Evolution API config from plugins
      console.log('[PaymentLink] Fetching Evolution API config...');
      const plugins = await pb.collection('plugins').getFullList();
      const evolutionPlugin = plugins.find(p => p.key === 'evolution_api');
      
      console.log('[PaymentLink] Evolution plugin found:', evolutionPlugin);
      
      if (!evolutionPlugin?.config) {
        throw new Error('Evolution API not configured. Please configure it in Admin → WhatsApp settings.');
      }
      
      const config = typeof evolutionPlugin.config === 'string' 
        ? JSON.parse(evolutionPlugin.config) 
        : evolutionPlugin.config;
      
      console.log('[PaymentLink] Evolution config:', config);
      
      // Get config values - handle different field naming conventions
      const baseUrl = config.baseUrl || config.base_url || config.url;
      const apiKey = config.tokenOrKey || config.apiKey || config.api_key || config.key;
      const instanceName = config.defaultSender || config.instanceName || config.instance_name || config.instance;
      
      console.log('[PaymentLink] Resolved config:', {
        baseUrl: baseUrl ? '✓' : '✗',
        apiKey: apiKey ? '✓' : '✗',
        instanceName: instanceName ? '✓' : '✗',
      });
      
      if (!baseUrl || !apiKey || !instanceName) {
        throw new Error(`Evolution API configuration incomplete. Missing: ${!baseUrl ? 'baseUrl ' : ''}${!apiKey ? 'apiKey ' : ''}${!instanceName ? 'instanceName' : ''}`);
      }
      
      // Format phone number (add 91 if needed)
      let phone = createdLink.prefill_phone.replace(/\D/g, '');
      if (phone.length === 10) {
        phone = `91${phone}`;
      }
      
      const linkUrl = getLinkUrl(createdLink.link_code);
      const itemsList = createdLink.items
        .map(item => `• ${item.product.name} x${item.quantity}`)
        .join('\n');
      
      const message = `🛒 *Payment Link*\n\n` +
        `Hi ${createdLink.prefill_name || 'there'}! 👋\n\n` +
        `Here's your payment link for:\n${itemsList}\n\n` +
        `💰 *Total: ₹${createdLink.total.toLocaleString('en-IN')}*\n\n` +
        `🔗 Click here to pay:\n${linkUrl}\n\n` +
        `This link ${createdLink.expires_at ? `expires on ${new Date(createdLink.expires_at).toLocaleDateString('en-IN')}` : 'does not expire'}.\n\n` +
        `Thank you for shopping with us! 🙏`;
      
      // Call Evolution API directly
      const apiUrl = `${baseUrl}/message/sendText/${instanceName}`;
      console.log('[PaymentLink] Sending WhatsApp via Evolution API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          number: phone,
          text: message,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('[PaymentLink] Evolution API error:', errorData);
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[PaymentLink] WhatsApp sent successfully:', result);
      
      setWhatsAppSent(true);
      toast({
        title: '✅ Sent via WhatsApp',
        description: `Payment link sent to ${createdLink.prefill_phone}`,
      });
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
      toast({
        title: 'Failed to send',
        description: error instanceof Error ? error.message : 'Could not send WhatsApp message',
        variant: 'destructive',
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setItems([]);
    setDiscount(0);
    setShipping(0);
    setExpiresIn('never');
    setPrefillName('');
    setPrefillPhone('');
    setPrefillEmail('');
    setCreatedLink(null);
    setCopied(false);
    setWhatsAppSent(false);
  };
  
  // Handle close
  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };
  
  // Get product image URL
  const getProductImage = (product: Product) => {
    const image = product.image || product.images?.[0];
    if (!image) return null;
    if (image.startsWith('http')) return image;
    return pb.files.getUrl({ id: product.id, collectionId: 'products', collectionName: 'products' }, image, { thumb: '100x100' });
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            {createdLink ? 'Payment Link Created' : 'Create Payment Link'}
          </DialogTitle>
          <DialogDescription>
            {createdLink
              ? 'Share this link with your customer to collect payment'
              : 'Create a shareable checkout link for your customer'}
          </DialogDescription>
        </DialogHeader>
        
        {createdLink ? (
          // Success view
          <div className="space-y-6 py-4">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{createdLink.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Total: ₹{createdLink.total.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    value={getLinkUrl(createdLink.link_code)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={copyLink} variant="outline" size="icon" title="Copy link">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Open link"
                    onClick={() => window.open(getLinkUrl(createdLink.link_code), '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* WhatsApp Send Option */}
            {createdLink.prefill_phone && (
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">Send via WhatsApp</p>
                        <p className="text-sm text-muted-foreground">
                          Send to {createdLink.prefill_phone}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={sendViaWhatsApp}
                      disabled={sendingWhatsApp || whatsAppSent}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {sendingWhatsApp ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : whatsAppSent ? (
                        <Check className="w-4 h-4 mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {whatsAppSent ? 'Sent!' : 'Send'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {!createdLink.prefill_phone && (
              <p className="text-sm text-muted-foreground text-center">
                💡 Tip: Add a phone number when creating the link to enable WhatsApp sending
              </p>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Create Another
              </Button>
              <Button onClick={() => handleClose(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        ) : (
          // Form view
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="title">Link Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="e.g. Order for John"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="expires">Expires</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add notes for the customer..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5"
                rows={2}
              />
            </div>
            
            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Products</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductSearch(!showProductSearch)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>
              
              {showProductSearch && (
                <Card className="mb-3">
                  <CardContent className="pt-4">
                    <div className="relative mb-3">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {loadingProducts ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      ) : products.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No products found
                        </p>
                      ) : (
                        products.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => addProduct(product)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left"
                          >
                            {getProductImage(product) ? (
                              <img
                                src={getProductImage(product)!}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                ₹{product.price.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </button>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {items.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No products added yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <Card key={item.product.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {getProductImage(item.product) ? (
                            <img
                              src={getProductImage(item.product)!}
                              alt={item.product.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                value={item.customPrice ?? item.product.price}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  updateCustomPrice(item.product.id, isNaN(val) ? undefined : val);
                                }}
                                className="w-24 h-7 text-sm"
                                min={0}
                              />
                              <span className="text-sm text-muted-foreground">×</span>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                                className="w-16 h-7 text-sm"
                                min={1}
                              />
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-medium">
                              ₹{((item.customPrice ?? item.product.price) * item.quantity).toLocaleString('en-IN')}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(item.product.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="discount">Discount (₹)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="mt-1.5"
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="shipping">Shipping (₹)</Label>
                <Input
                  id="shipping"
                  type="number"
                  value={shipping}
                  onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                  className="mt-1.5"
                  min={0}
                />
              </div>
            </div>
            
            {/* Prefill Customer Info */}
            <div>
              <Label className="mb-2 block">Prefill Customer Info (optional)</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  placeholder="Name"
                  value={prefillName}
                  onChange={(e) => setPrefillName(e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={prefillPhone}
                  onChange={(e) => setPrefillPhone(e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={prefillEmail}
                  onChange={(e) => setPrefillEmail(e.target.value)}
                />
              </div>
            </div>
            
            {/* Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {shipping > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>₹{shipping.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base pt-2 border-t">
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleClose(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || items.length === 0}
                className="flex-1"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Create Link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
