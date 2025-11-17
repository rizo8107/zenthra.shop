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
import { Package, Info, Settings, Palette, Truck, Save, X, Upload, Image as ImageIcon } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { pb } from '@/lib/pocketbase';

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
  const [listOrder, setListOrder] = useState(product?.list_order !== undefined && product.list_order !== null ? String(product.list_order) : '');
  const [originalPrice, setOriginalPrice] = useState(product?.original_price !== undefined && product.original_price !== null ? String(product.original_price) : '');
  const [qikinkSku, setQikinkSku] = useState(product?.qikink_sku || '');
  const [printTypeId, setPrintTypeId] = useState(product?.print_type_id !== undefined && product.print_type_id !== null ? String(product.print_type_id) : '');
  const [productType, setProductType] = useState(product?.product_type || '');
  const [availableSizes, setAvailableSizes] = useState(product?.available_sizes || '');
  const [videoUrl, setVideoUrl] = useState(product?.videoUrl || '');
  const [videoThumbnail, setVideoThumbnail] = useState(product?.videoThumbnail || '');
  const [videoDescription, setVideoDescription] = useState(product?.videoDescription || '');
  const [review, setReview] = useState(product?.review !== undefined && product.review !== null ? String(product.review) : '');
  const [features, setFeatures] = useState(product?.features || '');
  const [tags, setTags] = useState(product?.tags || '');
  const [specifications, setSpecifications] = useState(product?.specifications || '');
  const [care, setCare] = useState(product?.care || '');
  const [careInstructions, setCareInstructions] = useState(product?.care_instructions || '');
  const [usageGuidelines, setUsageGuidelines] = useState(product?.usage_guidelines || '');

  // Variant states
  const [variants, setVariants] = useState<{
    sizes: Array<{
      name: string;
      value: string;
      unit: string;
      inStock: boolean;
      images: string[];
    }>;
    combos: Array<{
      name: string;
      value: string;
      type: string;
      items: number;
      discountType: string;
      discountValue: number;
      images: string[];
    }>;
  }>({ sizes: [], combos: [] });

  // Variant builder state (from CreateProductDialog)
  type SizeRow = {
    id: string;
    value: string;
    unit: string;
    useBasePrice?: boolean;
    sizePrice?: number;
    name?: string;
    inStock?: boolean;
  };
  
  type ComboRow = {
    id: string;
    name: string;
    value?: string;
    type?: 'bundle' | 'bogo' | 'custom' | 'buy_any_x';
    items?: number;
    discountType?: 'amount' | 'percent';
    discountValue?: number;
    priceOverride?: number;
  };

  const [sizeRows, setSizeRows] = useState<SizeRow[]>([]);
  const [comboRows, setComboRows] = useState<ComboRow[]>([]);
  const [selectedVariantSizeId, setSelectedVariantSizeId] = useState('');
  const [variantPreviewsBySize, setVariantPreviewsBySize] = useState<Record<string, string[]>>({});
  const [variantFilesBySize, setVariantFilesBySize] = useState<Record<string, File[]>>({});
  const [variantFilenamesBySize, setVariantFilenamesBySize] = useState<Record<string, string[]>>({});

  // Helper functions
  const generateRowId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://placehold.co/300x300/e2e8f0/64748b?text=No+Image';

    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    const pocketbaseUrl =
      pb.baseUrl ||
      (import.meta as any).env?.VITE_POCKETBASE_URL ||
      'https://backend-pocketbase.p3ibd8.easypanel.host';

    if (imagePath.includes('/')) {
      return `${pocketbaseUrl}/api/files/products/${imagePath}`;
    }

    return `${pocketbaseUrl}/api/files/${product?.collectionId || 'products'}/${product?.id}/${imagePath}`;
  };

  const buildVariantsFromRows = () => {
    const variantsObj: any = {};
    if (sizeRows.length) {
      variantsObj.sizes = sizeRows.map(s => ({
        name: s.name || (s.unit ? `${s.value} ${s.unit}` : s.value),
        value: String(s.value),
        unit: s.unit,
        inStock: s.inStock !== false,
        images: variantFilenamesBySize[s.id] || [],
      }));
    }
    if (comboRows.length) {
      variantsObj.combos = comboRows.map(cb => ({
        name: cb.name,
        value: cb.value || slugify(cb.name),
        type: cb.type || 'bundle',
        items: cb.items,
        discountType: cb.discountType,
        discountValue: cb.discountValue,
        images: []
      }));
    }
    setVariants(variantsObj);
  };

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
      setListOrder(product.list_order !== undefined && product.list_order !== null ? String(product.list_order) : '');
      setOriginalPrice(product.original_price !== undefined && product.original_price !== null ? String(product.original_price) : '');
      setQikinkSku(product.qikink_sku || '');
      setPrintTypeId(product.print_type_id !== undefined && product.print_type_id !== null ? String(product.print_type_id) : '');
      setProductType(product.product_type || '');
      setAvailableSizes(product.available_sizes || '');
      setVideoUrl(product.videoUrl || '');
      setVideoThumbnail(product.videoThumbnail || '');
      setVideoDescription(product.videoDescription || '');
      setReview(product.review !== undefined && product.review !== null ? String(product.review) : '');
      setFeatures(product.features || '');
      setTags(product.tags || '');
      setSpecifications(product.specifications || '');
      setCare(product.care || '');
      setCareInstructions(product.care_instructions || '');
      setUsageGuidelines(product.usage_guidelines || '');
      
      // Initialize variants and variant builder rows
      if (product.variants && typeof product.variants === 'object' && product.variants !== null) {
        const variantData = product.variants as unknown as {
          sizes?: Array<{ name?: string; value?: string; unit?: string; inStock?: boolean; images?: string[] }>;
          combos?: Array<{ name?: string; value?: string; type?: string; items?: number; discountType?: string; discountValue?: number }>;
        };

        setVariants({
          sizes: variantData.sizes || [],
          combos: variantData.combos || [],
        });

        // Initialize size rows and existing images for editing
        if (variantData.sizes && variantData.sizes.length > 0) {
          const newSizeRows: SizeRow[] = [];
          const initialFilenames: Record<string, string[]> = {};
          const initialPreviews: Record<string, string[]> = {};

          variantData.sizes.forEach((size) => {
            const id = generateRowId();
            newSizeRows.push({
              id,
              value: size.value || '',
              unit: size.unit || 'ml',
              name: size.name || '',
              inStock: size.inStock !== false,
              useBasePrice: true,
            });

            if (Array.isArray(size.images) && size.images.length > 0) {
              initialFilenames[id] = size.images;
              initialPreviews[id] = size.images.map((img) => getImageUrl(img));
            }
          });

          setSizeRows(newSizeRows);
          setVariantFilenamesBySize(initialFilenames);
          setVariantPreviewsBySize(initialPreviews);

          if (newSizeRows.length > 0) {
            setSelectedVariantSizeId(newSizeRows[0].id);
          }
        } else {
          setSizeRows([]);
          setVariantFilenamesBySize({});
          setVariantPreviewsBySize({});
        }

        // Initialize combo rows for editing
        if (variantData.combos && variantData.combos.length > 0) {
          const newComboRows: ComboRow[] = variantData.combos.map((combo) => ({
            id: generateRowId(),
            name: combo.name || '',
            value: combo.value || '',
            type: (combo.type as ComboRow['type']) || 'bundle',
            items: combo.items || 2,
            discountType: (combo.discountType as ComboRow['discountType']) || 'amount',
            discountValue: combo.discountValue || 0,
          }));
          setComboRows(newComboRows);
        } else {
          setComboRows([]);
        }
      } else {
        setVariants({ sizes: [], combos: [] });
        setSizeRows([]);
        setComboRows([]);
        setVariantFilenamesBySize({});
        setVariantPreviewsBySize({});
      }
    }
  }, [product]);

  // Rebuild variants when rows change
  useEffect(() => {
    buildVariantsFromRows();
  }, [sizeRows, comboRows, variantFilenamesBySize]);

  // Image handling functions
  const handleSizeRowImageUpload = (sizeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setVariantPreviewsBySize(prev => ({
      ...prev,
      [sizeId]: [...(prev[sizeId] || []), ...newPreviews],
    }));

    // Store files
    setVariantFilesBySize(prev => ({
      ...prev,
      [sizeId]: [...(prev[sizeId] || []), ...files],
    }));

    // Store filenames
    setVariantFilenamesBySize(prev => ({
      ...prev,
      [sizeId]: [...(prev[sizeId] || []), ...files.map(f => f.name)],
    }));
  };

  const removeVariantImage = (sizeId: string, index: number) => {
    // Remove preview URL and revoke it
    setVariantPreviewsBySize(prev => {
      const urls = prev[sizeId] || [];
      if (urls[index]) {
        URL.revokeObjectURL(urls[index]);
      }
      return {
        ...prev,
        [sizeId]: urls.filter((_, i) => i !== index),
      };
    });

    // Remove file
    setVariantFilesBySize(prev => ({
      ...prev,
      [sizeId]: (prev[sizeId] || []).filter((_, i) => i !== index),
    }));

    // Remove filename
    setVariantFilenamesBySize(prev => ({
      ...prev,
      [sizeId]: (prev[sizeId] || []).filter((_, i) => i !== index),
    }));
  };

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

      const parsedListOrder = listOrder && !isNaN(Number(listOrder)) ? Number(listOrder) : undefined;
      const parsedOriginalPrice = originalPrice && !isNaN(Number(originalPrice)) ? Number(originalPrice) : undefined;
      const parsedPrintTypeId = printTypeId && !isNaN(Number(printTypeId)) ? Number(printTypeId) : undefined;
      const parsedReview = review && !isNaN(Number(review)) ? Number(review) : undefined;

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
        list_order: parsedListOrder,
        original_price: parsedOriginalPrice,
        qikink_sku: qikinkSku || undefined,
        print_type_id: parsedPrintTypeId,
        product_type: productType || undefined,
        available_sizes: availableSizes || undefined,
        videoUrl: videoUrl || undefined,
        videoThumbnail: videoThumbnail || undefined,
        videoDescription: videoDescription || undefined,
        review: parsedReview,
        features: features || undefined,
        tags: tags || undefined,
        specifications: specifications || undefined,
        care: care || undefined,
        care_instructions: careInstructions || undefined,
        usage_guidelines: usageGuidelines || undefined,
        variants: variants.sizes.length > 0 || variants.combos.length > 0 ? JSON.stringify(variants) : undefined,
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
      <DialogContent className="w-full h-[95vh] max-w-[96vw] sm:max-w-[96vw] xl:max-w-[96vw] overflow-hidden flex flex-col">
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
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="variants" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Variants
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-1 h-[calc(95vh-200px)]">
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

              <TabsContent value="variants" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sizes</Label>
                    <div className="space-y-2">
                      {sizeRows.map((s) => (
                        <div key={s.id} className="rounded-md border p-3 bg-card/40 grid grid-cols-12 gap-3 items-center relative">
                          <div className="col-span-12 sm:col-span-3">
                            <Input
                              value={s.value}
                              onChange={(e) => {
                                const { value } = e.target;
                                const targetId = s.id;
                                setSizeRows(prev => prev.map(row => row.id === targetId ? { ...row, value } : row));
                              }}
                              placeholder="100"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-3">
                            <Select
                              value={s.unit || 'ml'}
                              onValueChange={(val) => {
                                const targetId = s.id;
                                setSizeRows(prev => prev.map(row => row.id === targetId ? { ...row, unit: val } : row));
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ml">ml</SelectItem>
                                <SelectItem value="g">g</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="L">L</SelectItem>
                                <SelectItem value="pcs">pcs</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12 sm:col-span-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!!s.useBasePrice}
                                onCheckedChange={(val) => {
                                  const targetId = s.id;
                                  setSizeRows(prev => prev.map(row => row.id === targetId
                                    ? { ...row, useBasePrice: val, sizePrice: val ? undefined : row.sizePrice }
                                    : row));
                                }}
                              />
                              <span className="text-sm">Use base price</span>
                            </div>
                          </div>
                          <div className="col-span-12 sm:col-span-2">
                            {!s.useBasePrice && (
                              <Input
                                className="w-28"
                                type="number"
                                value={s.sizePrice ?? '' as any}
                                onChange={(e) => {
                                  const targetId = s.id;
                                  const nextPrice = e.target.value ? Number(e.target.value) : undefined;
                                  setSizeRows(prev => prev.map(row => row.id === targetId ? { ...row, sizePrice: nextPrice } : row));
                                }}
                                placeholder="Price"
                              />
                            )}
                          </div>
                          <div className="hidden sm:block col-span-1 text-xs text-muted-foreground">
                            {s.value && s.unit ? `${s.value} ${s.unit}` : ''}
                          </div>
                          <div className="col-span-12 text-xs text-muted-foreground">
                            {(() => {
                              const base = Number(price) || 0;
                              const final = s.useBasePrice ? base : (s.sizePrice ?? base);
                              return `Final price for this size will be ₹${final.toFixed(2)}`;
                            })()}
                          </div>
                          <div className="absolute top-2 right-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const removedId = s.id;
                                setSizeRows(prev => {
                                  const next = prev.filter(row => row.id !== removedId);
                                  if (removedId === selectedVariantSizeId) {
                                    setSelectedVariantSizeId(next[0]?.id ?? '');
                                  } else if (next.length === 0) {
                                    setSelectedVariantSizeId('');
                                  }
                                  return next;
                                });
                                setVariantFilesBySize(prev => {
                                  const next = { ...prev };
                                  delete next[removedId];
                                  return next;
                                });
                                setVariantPreviewsBySize(prev => {
                                  const next = { ...prev };
                                  (prev[removedId] || []).forEach(url => URL.revokeObjectURL(url));
                                  delete next[removedId];
                                  return next;
                                });
                                setVariantFilenamesBySize(prev => {
                                  const next = { ...prev };
                                  delete next[removedId];
                                  return next;
                                });
                              }}
                            >Remove</Button>
                          </div>
                          <div className="col-span-12 flex items-center gap-2">
                            <label htmlFor={`size-upload-${s.id}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
                              <Upload className="h-4 w-4" /> Upload images for {s.name || (s.unit ? `${s.value} ${s.unit}` : s.value) || 'size'}
                            </label>
                            <input
                              id={`size-upload-${s.id}`}
                              type="file"
                              accept="image/*"
                              multiple
                              className="sr-only"
                              onChange={(e)=>handleSizeRowImageUpload(s.id, e)}
                            />
                            <span className="text-xs text-muted-foreground">{(variantFilenamesBySize[s.id] || []).length} selected</span>
                          </div>
                          {(variantPreviewsBySize[s.id] || []).length > 0 && (
                            <div className="col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {(variantPreviewsBySize[s.id] || []).map((url, idx)=> (
                                <div key={idx} className="relative group overflow-hidden rounded-md border">
                                  <AspectRatio ratio={1/1}>
                                    <img src={url} alt="Variant preview" className="object-cover w-full h-full" onError={(e)=>{ (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/darkgray/white?text=Preview+Not+Found'; }} />
                                  </AspectRatio>
                                  <button type="button" onClick={()=>removeVariantImage(s.id, idx)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const newRow: SizeRow = { id: generateRowId(), value: '', unit: 'ml', useBasePrice: true };
                          setSizeRows(prev => [...prev, newRow]);
                          setSelectedVariantSizeId(newRow.id);
                        }}
                      >Add Size</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Combos</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'Buy 1 Get 1', value:'bogo', type:'bogo'}])}>Add BOGO</Button>
                      <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'2-Pack', value:'2-pack', type:'bundle', items:2}])}>Add 2‑Pack</Button>
                      <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'3-Pack', value:'3-pack', type:'bundle', items:3}])}>Add 3‑Pack</Button>
                      <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'4-Pack', value:'4-pack', type:'bundle', items:4}])}>Add 4‑Pack</Button>
                      <Button type="button" variant="secondary" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'',value:'',type:'bundle'}])}>Add Custom</Button>
                    </div>
                    <div className="space-y-2">
                      {comboRows.map((cb) => (
                        <div key={cb.id} className="rounded-md border p-3 bg-card/40 grid grid-cols-12 gap-3 items-center relative">
                          <div className="col-span-3">
                            <Input
                              value={cb.name}
                              onChange={(e) => {
                                const targetId = cb.id;
                                const { value } = e.target;
                                setComboRows(prev => prev.map(row => row.id === targetId ? { ...row, name: value, value: row.value || slugify(value) } : row));
                              }}
                              placeholder="2-Pack"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-2">
                            <Select
                              value={cb.type || 'bundle'}
                              onValueChange={(val) => {
                                const targetId = cb.id;
                                setComboRows(prev => prev.map(row => row.id === targetId ? { ...row, type: val as any } : row));
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bundle">bundle</SelectItem>
                                <SelectItem value="bogo">bogo</SelectItem>
                                <SelectItem value="custom">custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12 sm:col-span-2">
                            <Input
                              type="number"
                              value={cb.items ?? '' as any}
                              onChange={(e)=>{
                                const targetId = cb.id;
                                const items = e.target.value ? Number(e.target.value) : undefined;
                                setComboRows(prev => prev.map(row => row.id === targetId ? { ...row, items } : row));
                              }}
                              placeholder="Items"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-2">
                            <Select
                              value={cb.discountType || undefined as any}
                              onValueChange={(val)=>{
                                const targetId = cb.id;
                                setComboRows(prev => prev.map(row => row.id === targetId ? { ...row, discountType: val as any } : row));
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Discount" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amount">Amount</SelectItem>
                                <SelectItem value="percent">Percent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12 sm:col-span-2">
                            <Input
                              type="number"
                              value={cb.discountValue ?? '' as any}
                              onChange={(e)=>{
                                const targetId = cb.id;
                                const discountValue = e.target.value ? Number(e.target.value) : undefined;
                                setComboRows(prev => prev.map(row => row.id === targetId ? { ...row, discountValue } : row));
                              }}
                              placeholder="Value"
                            />
                          </div>
                          <div className="absolute top-2 right-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const removedId = cb.id;
                                setComboRows(prev => prev.filter(row => row.id !== removedId));
                              }}
                            >Remove</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Additional Fields</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="list_order" className="text-sm font-medium">List Order</Label>
                              <Input
                                id="list_order"
                                value={listOrder}
                                onChange={(e) => setListOrder(e.target.value)}
                                placeholder="e.g., 10"
                                type="number"
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="original_price" className="text-sm font-medium">Original Price</Label>
                              <Input
                                id="original_price"
                                value={originalPrice}
                                onChange={(e) => setOriginalPrice(e.target.value)}
                                placeholder="e.g., 999.99"
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="review" className="text-sm font-medium">Review Rating (0-5)</Label>
                              <Input
                                id="review"
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                                placeholder="0"
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                className="h-10"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="qikink_sku" className="text-sm font-medium">Qikink SKU</Label>
                              <Input
                                id="qikink_sku"
                                value={qikinkSku}
                                onChange={(e) => setQikinkSku(e.target.value)}
                                placeholder="SKU"
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="product_type" className="text-sm font-medium">Product Type</Label>
                              <Input
                                id="product_type"
                                value={productType}
                                onChange={(e) => setProductType(e.target.value)}
                                placeholder="e.g., Apparel"
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="print_type_id" className="text-sm font-medium">Print Type ID</Label>
                              <Input
                                id="print_type_id"
                                value={printTypeId}
                                onChange={(e) => setPrintTypeId(e.target.value)}
                                placeholder="e.g., 123"
                                type="number"
                                className="h-10"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="available_sizes" className="text-sm font-medium">Available Sizes</Label>
                            <Textarea
                              id="available_sizes"
                              value={availableSizes}
                              onChange={(e) => setAvailableSizes(e.target.value)}
                              placeholder="Enter sizes or JSON"
                              className="resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="video_url" className="text-sm font-medium">Video URL</Label>
                              <Input
                                id="video_url"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://..."
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="video_thumbnail" className="text-sm font-medium">Video Thumbnail</Label>
                              <Input
                                id="video_thumbnail"
                                value={videoThumbnail}
                                onChange={(e) => setVideoThumbnail(e.target.value)}
                                placeholder="https://..."
                                className="h-10"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="video_description" className="text-sm font-medium">Video Description</Label>
                            <Textarea
                              id="video_description"
                              value={videoDescription}
                              onChange={(e) => setVideoDescription(e.target.value)}
                              placeholder="Describe the video"
                              className="resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="features" className="text-sm font-medium">Features</Label>
                            <Textarea
                              id="features"
                              value={features}
                              onChange={(e) => setFeatures(e.target.value)}
                              placeholder="Features or JSON"
                              className="resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
                            <Textarea
                              id="tags"
                              value={tags}
                              onChange={(e) => setTags(e.target.value)}
                              placeholder="Tags or JSON"
                              className="resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="care" className="text-sm font-medium">Care</Label>
                            <Textarea
                              id="care"
                              value={care}
                              onChange={(e) => setCare(e.target.value)}
                              placeholder="Care information"
                              className="resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="care_instructions" className="text-sm font-medium">Detailed Care Instructions</Label>
                            <Textarea
                              id="care_instructions"
                              value={careInstructions}
                              onChange={(e) => setCareInstructions(e.target.value)}
                              placeholder="Detailed care JSON or text"
                              className="resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="usage_guidelines" className="text-sm font-medium">Usage Guidelines</Label>
                            <Textarea
                              id="usage_guidelines"
                              value={usageGuidelines}
                              onChange={(e) => setUsageGuidelines(e.target.value)}
                              placeholder="Usage guidelines"
                              className="resize-none"
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
