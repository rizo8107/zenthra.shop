import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product } from '@/types/schema';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Package,
  Info,
  Image as ImageIcon,
  Settings,
  Truck,
  Calendar,
  DollarSign,
  Package2,
  Star,
  Eye,
  Palette
} from 'lucide-react';
import { pb } from '@/lib/pocketbase';

interface ViewProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onDelete?: () => Promise<void>;
}

export function ViewProductDialog({ open, onOpenChange, product, onDelete }: ViewProductDialogProps) {
  // Helper function to safely render field values that might be objects or strings
  const renderFieldValue = (value: unknown): string => {
    if (!value) return 'Not specified';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return 'Invalid data format';
      }
    }
    return String(value);
  };

  if (!product) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No product selected</p>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Format image URL for PocketBase
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
    
    // Check if the image path is already a full URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // Get PocketBase URL from environment or use default
    const pocketbaseUrl = pb.baseUrl || import.meta.env.VITE_POCKETBASE_URL || 'https://backend-pocketbase.p3ibd8.easypanel.host';
    
    // Handle both format: "filename.jpg" and "recordId/filename.jpg"
    if (imagePath.includes('/')) {
      // Already has recordId/filename format
      return `${pocketbaseUrl}/api/files/products/${imagePath}`;
    }
    
    // Just filename - construct full path using collectionId and record id
    return `${pocketbaseUrl}/api/files/${product.collectionId || 'products'}/${product.id}/${imagePath}`;
  };

  // Get product images (ensure it's an array)
  const images = product.images ? 
    (Array.isArray(product.images) ? product.images : [product.images]) : 
    [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                {product.name}
                {product.new && <Badge variant="secondary" className="bg-blue-100 text-blue-800">New</Badge>}
                {product.bestseller && <Badge variant="default" className="bg-yellow-100 text-yellow-800">Bestseller</Badge>}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Created on {formatDate(product.created || new Date().toISOString())}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={product.inStock ? 'default' : 'destructive'} className={product.inStock ? 'bg-green-100 text-green-800' : ''}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </Badge>
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">₹{(product.price || 0).toFixed(2)}</div>
                {product.review && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {product.review}/5
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="variants" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Variants
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Images
            </TabsTrigger>
            <TabsTrigger value="shipping" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Shipping
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-1">
            <TabsContent value="overview" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Product Name</Label>
                        <p className="text-sm font-medium">{product.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                        <p className="text-sm">{product.category || 'Uncategorized'}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Price</Label>
                        <p className="text-sm font-medium text-green-600">₹{(product.price || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Stock</Label>
                        <p className="text-sm">{product.stock || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status}
                        </Badge>
                        {product.inStock && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>}
                        {product.new && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">New</Badge>}
                        {product.bestseller && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Bestseller</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timestamps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Created</Label>
                      <p className="text-sm">{formatDate(product.created || new Date().toISOString())}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Last Updated</Label>
                      <p className="text-sm">{formatDate(product.updated || new Date().toISOString())}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Product ID</Label>
                      <p className="text-xs font-mono bg-muted px-2 py-1 rounded">{product.id}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {product.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {product.description}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="variants" className="space-y-6 mt-0">
              {(() => {
                // Parse variants data
                let variants = { sizes: [], combos: [] };
                if (product.variants) {
                  try {
                    if (typeof product.variants === 'string') {
                      variants = JSON.parse(product.variants);
                    } else if (typeof product.variants === 'object') {
                      variants = product.variants as any;
                    }
                  } catch (error) {
                    console.error('Error parsing variants:', error);
                  }
                }

                return (
                  <>
                    {/* Sizes Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Available Sizes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {variants.sizes && variants.sizes.length > 0 ? (
                          <div className="space-y-3">
                            {variants.sizes.map((size: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{size.name}</span>
                                    <Badge variant={size.inStock ? "default" : "secondary"}>
                                      {size.inStock ? "In Stock" : "Out of Stock"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Value: {size.value} | Unit: {size.unit}
                                  </p>
                                  {size.images && size.images.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {size.images.length} image(s) attached
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
                            <p className="text-muted-foreground">No sizes configured</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Combos Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Package2 className="h-4 w-4" />
                          Combo Offers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {variants.combos && variants.combos.length > 0 ? (
                          <div className="space-y-3">
                            {variants.combos.map((combo: any, index: number) => (
                              <div key={index} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium">{combo.name}</span>
                                  <Badge variant="secondary">{combo.type}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                  <div>Items: {combo.items}</div>
                                  <div>Value: {combo.value}</div>
                                  <div>Discount: {combo.discountValue} ({combo.discountType})</div>
                                  <div>Images: {combo.images ? combo.images.length : 0}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
                            <p className="text-muted-foreground">No combo offers configured</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </TabsContent>

            <TabsContent value="details" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Product Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Material</Label>
                        <p className="text-sm">{product.material || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Dimensions</Label>
                        <p className="text-sm">{product.dimensions || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Product Type</Label>
                        <p className="text-sm">{product.product_type || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Review Rating</Label>
                        <div className="flex items-center gap-2">
                          {product.review ? (
                            <>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{product.review}/5</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">No reviews yet</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">List Order</Label>
                        <p className="text-sm">{product.list_order ?? 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Original Price</Label>
                        <p className="text-sm">{product.original_price !== undefined && product.original_price !== null ? `₹${product.original_price.toFixed?.(2) ?? product.original_price}` : 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Qikink SKU</Label>
                        <p className="text-sm">{product.qikink_sku || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Available Sizes</Label>
                        <p className="text-sm whitespace-pre-wrap break-words">{renderFieldValue(product.available_sizes)}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Tags</Label>
                        <p className="text-sm whitespace-pre-wrap break-words">{renderFieldValue(product.tags)}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Features</Label>
                        <p className="text-sm whitespace-pre-wrap break-words">{renderFieldValue(product.features)}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Specifications</Label>
                        <p className="text-sm whitespace-pre-wrap break-words">{renderFieldValue(product.specifications)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Care</Label>
                      <p className="text-sm whitespace-pre-wrap break-words">{renderFieldValue(product.care)}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Detailed Care Instructions</Label>
                      <p className="text-sm whitespace-pre-wrap break-words">{renderFieldValue(product.care_instructions)}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Usage Guidelines</Label>
                      <p className="text-sm whitespace-pre-wrap break-words">{renderFieldValue(product.usage_guidelines)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Video URL</Label>
                      <p className="text-sm break-all">{product.videoUrl || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Video Thumbnail</Label>
                      <p className="text-sm break-all">{product.videoThumbnail || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Video Description</Label>
                      <p className="text-sm whitespace-pre-wrap break-words">{product.videoDescription || 'Not specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="images" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Product Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {images && images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {images.map((image: string, index: number) => (
                        <div key={index} className="overflow-hidden rounded-lg border bg-muted">
                          <AspectRatio ratio={1 / 1}>
                            <img 
                              src={getImageUrl(image)}
                              alt={`${product.name} - Image ${index + 1}`}
                              className="object-cover w-full h-full transition-transform hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/e2e8f0/64748b?text=Image+Not+Found';
                              }}
                            />
                          </AspectRatio>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No images available for this product</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipping" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Shipping Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <Label className="text-sm font-medium">Tamil Nadu Shipping</Label>
                          <p className="text-xs text-muted-foreground">Shipping to Tamil Nadu</p>
                        </div>
                        <Badge variant={product.tn_shipping_enabled ? 'default' : 'secondary'}>
                          {product.tn_shipping_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <Label className="text-sm font-medium">Free Shipping</Label>
                          <p className="text-xs text-muted-foreground">Free delivery option</p>
                        </div>
                        <Badge variant={product.free_shipping ? 'default' : 'secondary'} className={product.free_shipping ? 'bg-green-100 text-green-800' : ''}>
                          {product.free_shipping ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator className="my-4" />

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="px-6">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
