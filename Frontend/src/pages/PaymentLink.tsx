import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pocketbase } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  ShoppingBag,
  LockIcon,
  CheckCircle,
  AlertTriangle,
  Package,
  Clock,
  XCircle,
} from "lucide-react";
import { getRazorpayKeyId, RazorpayResponse } from "@/lib/razorpay";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  captureRazorpayPayment,
  openRazorpayCheckout,
  getRazorpayKeySecret,
  loadRazorpayScript,
} from "@/lib/razorpay-client";
import { sendWebhookEvent } from '@/lib/webhooks';
// AddressAutocomplete has different props, using manual inputs instead

// Helper to get proper image URL from PocketBase
const getProductImageUrl = (productId: string, imageUrl: string): string => {
  if (!imageUrl) return '';
  
  // If it's already a full URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a PocketBase file reference, construct the full URL
  // Format: {baseUrl}/api/files/{collectionId}/{recordId}/{filename}
  const pbBaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'https://pocketbase.viruthi.in';
  return `${pbBaseUrl}/api/files/products/${productId}/${imageUrl}`;
};

interface PaymentLinkData {
  id: string;
  title: string;
  description: string;
  items: {
    product_id: string;
    product_name: string;
    product_image: string;
    quantity: number;
    unit_price: number;
  }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: 'active' | 'used' | 'expired';
  expires_at: string | null;
  prefill_name: string;
  prefill_phone: string;
  prefill_email: string;
  link_code: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function PaymentLink() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // States
  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState<PaymentLinkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  
  // Load Razorpay script
  useEffect(() => {
    loadRazorpayScript()
      .then(() => setRazorpayLoaded(true))
      .catch((err) => console.error("Failed to load Razorpay:", err));
  }, []);
  
  // Load payment link data
  useEffect(() => {
    async function loadPaymentLink() {
      if (!code) {
        setError("Invalid payment link");
        setLoading(false);
        return;
      }
      
      console.log("[PaymentLink] Loading payment link with code:", code);
      
      try {
        // Try to find by link_code field
        let result;
        try {
          result = await pocketbase.collection('payment_links').getFirstListItem(
            `link_code="${code}"`
          );
        } catch (filterErr) {
          console.log("[PaymentLink] Filter search failed, trying direct ID lookup");
          // If filter fails, try getting by ID directly (in case code IS the ID)
          try {
            result = await pocketbase.collection('payment_links').getOne(code);
          } catch (idErr) {
            console.error("[PaymentLink] Both lookups failed:", filterErr, idErr);
            throw new Error("Payment link not found");
          }
        }
        
        console.log("[PaymentLink] Found payment link:", result);
        
        // Check if expired
        if (result.expires_at && new Date(result.expires_at) < new Date()) {
          setError("This payment link has expired");
          setLoading(false);
          return;
        }
        
        // Check if already used
        if (result.status === 'used') {
          setError("This payment link has already been used");
          setLoading(false);
          return;
        }
        
        // Parse items - handle both string and object
        let parsedItems = [];
        try {
          if (typeof result.items === 'string') {
            parsedItems = JSON.parse(result.items || '[]');
          } else if (Array.isArray(result.items)) {
            parsedItems = result.items;
          }
        } catch (parseErr) {
          console.error("[PaymentLink] Failed to parse items:", parseErr);
          parsedItems = [];
        }
        
        const linkData: PaymentLinkData = {
          id: result.id,
          title: result.title || 'Payment',
          description: result.description || '',
          items: parsedItems,
          subtotal: Number(result.subtotal) || 0,
          discount: Number(result.discount) || 0,
          shipping: Number(result.shipping) || 0,
          total: Number(result.total) || 0,
          status: result.status || 'active',
          expires_at: result.expires_at || null,
          prefill_name: result.prefill_name || '',
          prefill_phone: result.prefill_phone || '',
          prefill_email: result.prefill_email || '',
          link_code: result.link_code || code,
        };
        
        console.log("[PaymentLink] Parsed link data:", linkData);
        setLinkData(linkData);
        
        // Prefill form data
        setFormData(prev => ({
          ...prev,
          name: linkData.prefill_name,
          phone: linkData.prefill_phone,
          email: linkData.prefill_email,
        }));
        
      } catch (err) {
        console.error("[PaymentLink] Failed to load payment link:", err);
        setError("Payment link not found");
      } finally {
        setLoading(false);
      }
    }
    
    loadPaymentLink();
  }, [code]);
  
  // Validate form
  useEffect(() => {
    const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zipCode'];
    const isAllFilled = requiredFields.every(
      field => formData[field as keyof FormData]?.trim()
    );
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(formData.email);
    
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = formData.phone.replace(/\D/g, '').replace(/^(\+?91)/, '');
    const isPhoneValid = phoneRegex.test(cleanPhone);
    
    const zipRegex = /^\d{6}$/;
    const isZipValid = zipRegex.test(formData.zipCode.trim());
    
    setIsFormValid(isAllFilled && isEmailValid && isPhoneValid && isZipValid);
  }, [formData]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkData || isSubmitting || !razorpayLoaded) return;
    
    try {
      setIsSubmitting(true);
      
      // Clean phone number
      const cleanPhone = formData.phone.replace(/\D/g, '').replace(/^(\+?91)/, '');
      
      // Create order in PocketBase
      const orderData = {
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: cleanPhone,
        shipping_address_text: JSON.stringify({
          street: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.zipCode,
          country: "India",
        }),
        products: JSON.stringify(linkData.items.map(item => ({
          productId: item.product_id,
          product: {
            id: item.product_id,
            name: item.product_name,
            price: item.unit_price,
            image: item.product_image,
          },
          quantity: item.quantity,
          unitPrice: item.unit_price,
        }))),
        subtotal: linkData.subtotal,
        shipping_cost: linkData.shipping,
        discount_amount: linkData.discount,
        total: linkData.total,
        status: "pending",
        payment_status: "pending",
        notes: `Order from payment link: ${linkData.title}`,
        payment_link_id: linkData.id,
        is_guest_order: true,
        created: new Date().toISOString(),
      };
      
      const order = await pocketbase.collection('orders').create(orderData);
      console.log("Order created:", order.id);
      
      // Create Razorpay order - pass amount in RUPEES (not paise)
      // The createRazorpayOrder function sends to backend which converts to paise
      const razorpayOrder = await createRazorpayOrder(
        linkData.total, // Amount in rupees - backend will convert to paise
        "INR",
        order.id
      );
      
      if (!razorpayOrder?.id) {
        throw new Error("Failed to create payment order");
      }
      
      // Update order with Razorpay order ID
      await pocketbase.collection('orders').update(order.id, {
        razorpay_order_id: razorpayOrder.id,
      });
      
      // Open Razorpay checkout
      // Get shop name from site settings or use default
      let shopName = "Karigai";
      try {
        const settings = await pocketbase.collection('site_settings').getFirstListItem('');
        shopName = settings.siteTitle || shopName;
      } catch {
        // Use default if settings not found
      }
      
      const response = await new Promise<RazorpayResponse>((resolve, reject) => {
        const options = {
          key: getRazorpayKeyId(),
          amount: razorpayOrder.amount, // Use the amount from the created order (already in paise)
          currency: "INR",
          name: shopName,
          description: linkData.title,
          order_id: razorpayOrder.id,
          prefill: {
            name: formData.name,
            email: formData.email,
            contact: cleanPhone,
          },
          theme: {
            color: "#166534", // Green theme
          },
          handler: function(response: RazorpayResponse) {
            resolve(response);
          },
          modal: {
            ondismiss: function() {
              reject(new Error("Payment cancelled"));
            },
          },
        };
        
        const rzp = new (window as typeof window & { Razorpay: new (options: unknown) => { open: () => void } }).Razorpay(options);
        rzp.open();
      });
      
      // Verify payment
      const verificationSuccess = await verifyRazorpayPayment(
        razorpayOrder.id,
        response.razorpay_payment_id || '',
        response.razorpay_signature || ''
      );
      
      // Capture payment - use amount from order (already in paise)
      const captureSuccess = await captureRazorpayPayment(
        response.razorpay_payment_id,
        razorpayOrder.amount
      );
      
      // Update order with payment details
      await pocketbase.collection('orders').update(order.id, {
        payment_status: "paid",
        status: "processing",
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        payment_method: "razorpay",
        payment_date: new Date().toISOString(),
        notes: `Payment received via Razorpay. Payment ID: ${response.razorpay_payment_id}. Verified: ${verificationSuccess ? "Yes" : "No"}. Captured: ${captureSuccess ? "Yes" : "Pending"}`,
      });
      
      // Mark payment link as used
      await pocketbase.collection('payment_links').update(linkData.id, {
        status: 'used',
        order_id: order.id,
      });
      
      // Send webhook
      await sendWebhookEvent({
        type: 'payment.succeeded',
        data: {
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: response.razorpay_payment_id,
                order_id: razorpayOrder.id,
                currency: "INR",
                status: "captured",
                captured: true,
              },
            },
            metadata: {
              pocketbase_order_id: order.id,
              payment_link_id: linkData.id,
            },
          },
        },
        metadata: { page: 'payment-link' }
      });
      
      setOrderId(order.id);
      setOrderSuccess(true);
      
      toast({
        title: "Payment Successful!",
        description: "Your order has been placed successfully.",
      });
      
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Link Unavailable</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go to Homepage</Button>
        </div>
      </div>
    );
  }
  
  // Success state
  if (orderSuccess && orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Order Placed Successfully!</h1>
          <p className="text-muted-foreground mb-2">
            Thank you for your order. We've sent a confirmation to {formData.email}.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Order ID: <span className="font-mono">{orderId}</span>
          </p>
          <Button onClick={() => navigate('/')}>Continue Shopping</Button>
        </div>
      </div>
    );
  }
  
  if (!linkData) return null;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{linkData.title}</h1>
              {linkData.description && (
                <p className="text-sm text-muted-foreground">{linkData.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <LockIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-lg border p-6 sticky top-24">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Order Summary
              </h2>
              
              <div className="space-y-4 mb-6">
                {linkData.items.map((item, index) => {
                  const imageUrl = getProductImageUrl(item.product_id, item.product_image);
                  return (
                    <div key={index} className="flex gap-3">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.product_name}
                          className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                          onError={(e) => {
                            // Hide broken image and show fallback
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center ${imageUrl ? 'hidden' : ''}`}>
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × ₹{item.unit_price.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <p className="font-medium">
                        ₹{(item.quantity * item.unit_price).toLocaleString('en-IN')}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{linkData.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {linkData.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{linkData.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {linkData.shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>₹{linkData.shipping.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>₹{linkData.total.toLocaleString('en-IN')}</span>
              </div>
              
              {linkData.expires_at && (
                <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span>
                    Expires: {new Date(linkData.expires_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Checkout Form */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold mb-6">Shipping Information</h2>
              
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="9876543210"
                      required
                      className="mt-1.5"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    required
                    className="mt-1.5"
                  />
                </div>
                
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main Street, Apartment 4B"
                    required
                    className="mt-1.5"
                  />
                </div>
                
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Chennai"
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Tamil Nadu"
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">PIN Code *</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="600001"
                      required
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!isFormValid || isSubmitting || !razorpayLoaded}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <LockIcon className="w-4 h-4 mr-2" />
                    Pay ₹{linkData.total.toLocaleString('en-IN')}
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                By placing this order, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
