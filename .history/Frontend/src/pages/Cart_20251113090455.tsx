import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { ProductImage } from '@/components/ProductImage';
import { Collections } from '@/lib/pocketbase';

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, total, itemCount } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId);
      return;
    }
    setIsLoading(true);
    updateQuantity(productId, newQuantity);
    setIsLoading(false);
  };

  const handleRemoveItem = (productId: string) => {
    removeItem(productId);
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Shopping Cart</h1>
            </div>

            {/* Empty Cart */}
            <Card className="text-center py-16">
              <CardContent>
                <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-600 mb-6">Add some products to get started!</p>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link to="/shop">Continue Shopping</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Shopping Cart</h1>
            <Badge variant="secondary" className="ml-auto">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, index) => (
                <Card key={`${item.productId}-${item.color}-${index}`} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
                        <ProductImage
                          url={item.product.images?.[0] || ''}
                          alt={item.product.name}
                          size="small"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 truncate">
                              <Link 
                                to={`/product/${item.product.id}`}
                                className="hover:text-primary transition-colors"
                              >
                                {item.product.name}
                              </Link>
                            </h3>
                            {(item.color || item.options) && (
                              <div className="flex gap-2 mt-1">
                                {item.color && (
                                  <Badge variant="outline" className="text-xs">
                                    Color: {item.color}
                                  </Badge>
                                )}
                                {item.options && Object.entries(item.options).map(([key, value]) => (
                                  <Badge key={key} variant="outline" className="text-xs">
                                    {key}: {value}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Price and Quantity */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">
                              ₹{(item.unitPrice || item.product.price).toFixed(2)}
                            </span>
                            {item.product.original_price && item.product.original_price > (item.unitPrice || item.product.price) && (
                              <span className="text-sm text-gray-500 line-through">
                                ₹{item.product.original_price.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                              disabled={isLoading || item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                              disabled={isLoading}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Item Total */}
                        <div className="text-right mt-2">
                          <span className="text-sm text-gray-600">
                            Subtotal: ₹{((item.unitPrice || item.product.price) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({itemCount} items)</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span className="text-primary">Free</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCheckout}
                    className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    Proceed to Checkout
                  </Button>

                  <Button 
                    variant="outline" 
                    asChild 
                    className="w-full mt-3"
                  >
                    <Link to="/shop">Continue Shopping</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
