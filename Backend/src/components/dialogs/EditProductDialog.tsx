import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Product, UpdateProductData } from '@/types/schema';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Package, Info, Settings, Palette, Truck, Save, X } from 'lucide-react';

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSubmit: (data: { id: string; data: UpdateProductData }) => Promise<unknown>;
}

export function EditProductDialog({ open, onOpenChange, product, onSubmit }: EditProductDialogProps) {
  // Initialize form states with product data
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '');
  const [stock, setStock] = useState(product?.stock ? String(product.stock) : '');
  const [category, setCategory] = useState(product?.category || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(product?.status as 'active' | 'inactive' || 'active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Additional product fields
  const [material, setMaterial] = useState(product?.material || '');
  const [dimensions, setDimensions] = useState(product?.dimensions || '');
  const [bestseller, setBestseller] = useState(product?.bestseller || false);
  const [isNew, setIsNew] = useState(product?.new || false);
  const [inStock, setInStock] = useState(product?.inStock !== undefined ? product.inStock : true);
  const [tnShippingEnabled, setTnShippingEnabled] = useState(product?.tn_shipping_enabled !== undefined ? product.tn_shipping_enabled : true);
  const [freeShipping, setFreeShipping] = useState(product?.free_shipping || false);

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price ? String(product.price) : '');
      setStock(product.stock ? String(product.stock) : '');
      setCategory(product.category || '');
      setStatus(product.status as 'active' | 'inactive' || 'active');
      setBestseller(product.bestseller || false);
      setIsNew(product.new || false);
      setInStock(product.inStock !== undefined ? product.inStock : true);
      setTnShippingEnabled(product.tn_shipping_enabled !== undefined ? product.tn_shipping_enabled : true);
      setFreeShipping(product.free_shipping || false);
      setMaterial(product.material || '');
      setDimensions(product.dimensions || '');
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id) return;

    try {
      setIsSubmitting(true);
      
      // Validate form fields
      if (!name) {
        toast.error('Product name is required');
        return;
      }

      if (!price || isNaN(Number(price)) || Number(price) <= 0) {
        toast.error('Please enter a valid price');
        return;
      }

      // Prepare the data object
      const updateData: UpdateProductData = {
        name,
        description: description || undefined,
        price: Number(price),
        stock: stock ? Number(stock) : undefined,
        category: category || undefined,
        status,
        material: material || undefined,
        dimensions: dimensions || undefined,
        bestseller,
        new: isNew,
        inStock,
        tn_shipping_enabled: tnShippingEnabled,
        free_shipping: freeShipping,
      };

      await onSubmit({ id: product.id, data: updateData });
      
      onOpenChange(false);
      toast.success('Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">Edit Product</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Update product information and settings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                {product.status}
              </Badge>
              <div className="text-right">
                <div className="text-lg font-bold">₹{(typeof product.price === 'number' ? product.price : 0).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Current Price</div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-1">
              <TabsContent value="basic" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">General Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Product Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter product name"
                        className="h-10"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter product description"
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-medium">Price (₹) *</Label>
                        <Input
                          id="price"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0.00"
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-10"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="stock" className="text-sm font-medium">Stock Quantity</Label>
                        <Input
                          id="stock"
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                          placeholder="Available quantity"
                          type="number"
                          min="0"
                          className="h-10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                        <Select value={status} onValueChange={(value) => setStatus(value as 'active' | 'inactive')}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                Active
                              </div>
                            </SelectItem>
                            <SelectItem value="inactive">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                Inactive
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 mt-0">
                <Accordion type="multiple" className="w-full space-y-4">
                  <AccordionItem value="details">
                    <AccordionTrigger className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Product Details
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Product Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                              <Input
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Product category"
                                className="h-10"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="material" className="text-sm font-medium">Material</Label>
                              <Input
                                id="material"
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                                placeholder="Product material"
                                className="h-10"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="dimensions" className="text-sm font-medium">Dimensions</Label>
                            <Input
                              id="dimensions"
                              value={dimensions}
                              onChange={(e) => setDimensions(e.target.value)}
                              placeholder="Product dimensions"
                              className="h-10"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="attributes">
                    <AccordionTrigger className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Product Attributes
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Product Attributes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">In Stock</Label>
                                <p className="text-xs text-muted-foreground">Product availability</p>
                              </div>
                              <Switch
                                checked={inStock}
                                onCheckedChange={setInStock}
                              />
                            </div>
                            
                            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">New Product</Label>
                                <p className="text-xs text-muted-foreground">Mark as new arrival</p>
                              </div>
                              <Switch
                                checked={isNew}
                                onCheckedChange={setIsNew}
                              />
                            </div>
                            
                            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Bestseller</Label>
                                <p className="text-xs text-muted-foreground">Mark as bestseller</p>
                              </div>
                              <Switch
                                checked={bestseller}
                                onCheckedChange={setBestseller}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="shipping">
                    <AccordionTrigger className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Shipping Configuration
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Shipping Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Tamil Nadu Shipping</Label>
                                <p className="text-xs text-muted-foreground">Allow shipping to Tamil Nadu</p>
                              </div>
                              <Switch
                                checked={tnShippingEnabled}
                                onCheckedChange={setTnShippingEnabled}
                              />
                            </div>
                            
                            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Free Shipping</Label>
                                <p className="text-xs text-muted-foreground">Enable free delivery</p>
                              </div>
                              <Switch
                                checked={freeShipping}
                                onCheckedChange={setFreeShipping}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <Separator className="my-4" />

          <DialogFooter>
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
              className="px-6 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Update Product
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
