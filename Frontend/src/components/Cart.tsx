import { useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductImage } from '@/components/ProductImage';
import { CartCrossSell } from '@/components/CartCrossSell';

interface CartProps {
  children?: ReactNode;
}

export function Cart({ children }: CartProps) {
  const { items, removeItem, updateQuantity, isLoading, subtotal, total, itemCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId);
      return;
    }
    updateQuantity(productId, newQuantity);
  };

  const handleRemoveItem = (productId: string) => {
    removeItem(productId);
  };

  const handleCheckout = () => {
    // Save cart state before navigating
    localStorage.setItem('checkout_cart', JSON.stringify({
      items,
      subtotal,
      total,
      itemCount
    }));
    setIsOpen(false);
  };

  const handleCloseCart = () => {
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="icon" className="relative">
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="text-center space-y-1">
          <SheetTitle className="text-lg">Shopping Cart ({itemCount} items)</SheetTitle>
          <SheetDescription className="text-muted-foreground">View and manage items in your shopping cart</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium mb-2">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">
                Add items to your cart to see them here
              </p>
            </div>
            <Button asChild>
              <Link to="/shop" onClick={() => setIsOpen(false)}>Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={`${item.productId}-${item.color}-${index}`} className="flex gap-3 rounded-xl border border-gray-100 p-3">
                    <div className="relative aspect-square h-20 w-20">
                      {item.product && item.product.images && item.product.images[0] ? (
                        <ProductImage
                          url={item.product.images[0]}
                          alt={item.product.name}
                          className="rounded-lg object-cover"
                          width={80}
                          height={80}
                          size="thumbnail"
                          useResponsive={false}
                        />
                      ) : (
                        <div className="bg-muted w-full h-full rounded-lg flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <Link
                          to={`/product/${item.productId}`}
                          className="font-medium hover:text-primary line-clamp-2"
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="inline-flex items-center gap-2">
                            {item.product?.name || 'Product'}
                            {(() => {
                              const sizeValue = item.options?.size;
                              if (!sizeValue) return null;
                              const sizes = (item.product as any)?.variants?.sizes || [];
                              const match = Array.isArray(sizes) ? sizes.find((s: any) => String(s.value) === String(sizeValue)) : undefined;
                              const unit = match?.unit ? ` ${match.unit}` : '';
                              const label = `${sizeValue}${unit}`.trim();
                              return label ? (
                                <Badge className="rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px]">{label}</Badge>
                              ) : null;
                            })()}
                          </span>
                        </Link>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {item.options && Object.keys(item.options).length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                          {/* Special handling for Buy Any X bundle */}
                          {item.options.comboType === 'buy_any_x' && (
                            <>
                              {item.options.combo && (
                                <Badge className="rounded-full bg-blue-50 text-blue-800 border-blue-200 px-2 py-0.5">
                                  {item.options.combo}
                                </Badge>
                              )}
                              {item.options.discountType && item.options.discountValue && (
                                <Badge variant="outline" className="border-green-200 text-green-700 px-2 py-0.5">
                                  {item.options.discountType === 'percent'
                                    ? `${item.options.discountValue}% off`
                                    : `₹${item.options.discountValue} off`}
                                </Badge>
                              )}
                              {item.options.variants && (() => {
                                try {
                                  const parsed = JSON.parse(item.options!.variants as string) as string[];
                                  return parsed.map((variant, idx) => {
                                    const [type, val] = variant.split('-');
                                    const label = type === 'size' ? 'Size' : 'Variant';
                                    return (
                                      <Badge key={idx} variant="outline" className="px-2 py-0.5">
                                        {label}: {val}
                                      </Badge>
                                    );
                                  });
                                } catch {
                                  return null;
                                }
                              })()}
                            </>
                          )}

                          {/* Generic options (skip internal combo metadata) */}
                          {Object.entries(item.options)
                            .filter(([key]) => !['comboType', 'discountType', 'discountValue', 'variants', 'combo'].includes(key))
                            .map(([key, value]) => (
                              <Badge key={key} variant="outline" className="px-2 py-0.5">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <div className="ml-auto font-semibold">
                          ₹{(((typeof item.unitPrice === 'number' ? item.unitPrice : Number(item.product?.price) || 0)) * (Number(item.quantity) || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-2">
                  <CartCrossSell onClose={handleCloseCart} />
                </div>
              </div>
            </ScrollArea>

            <div className="space-y-4 pt-6">
              <Separator />
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal</span>
                  <span className="font-medium">₹{(subtotal || 0).toFixed(2)}</span>
                </div>
                {/* Shipping will be calculated at checkout */}
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>₹{(total || 0).toFixed(2)}</span>
                </div>
              </div>
              
              {(total || 0) < 150 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-3">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                    <p className="text-sm font-medium text-amber-800">
                      Minimum order value is ₹150 (Current: ₹{(total || 0).toFixed(2)})
                    </p>
                  </div>
                </div>
              )}
              
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700" disabled={items.length === 0 || (total || 0) < 150}>
                <Link to="/checkout" onClick={handleCheckout}>
                  Proceed to Checkout (₹{(total || 0).toFixed(2)})
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsOpen(false)}
              >
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}