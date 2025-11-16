import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { CreateProductData } from '@/types/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Alert, AlertDescription } from '@/components/ui/alert';


const generateRowId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const renameFile = (file: File, newName: string) => new File([file], newName, {
  type: file.type,
  lastModified: file.lastModified,
});

// Define the type for ProductFormValues
type ProductFormValues = {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  category?: string;
  status: 'active' | 'inactive';
  material?: string;
  dimensions?: string;
  features?: string;
  variants?: string;
  colors?: string;
  tags?: string;
  care?: string;
  specifications?: string;
  care_instructions?: string;
  usage_guidelines?: string;
  bestseller?: boolean;
  new?: boolean;
  inStock?: boolean;
  review?: number;
  // Newly requested fields
  list_order?: number;
  original_price?: number;
  qikink_sku?: string;
  print_type_id?: number;
  product_type?: string;
  available_colors?: string;
  available_sizes?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  videoDescription?: string;
  tn_shipping_enabled?: boolean;
  free_shipping?: boolean;
};

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProductData | FormData) => Promise<void>;
}

export function CreateProductDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  // Variant images state (per size value)
  const [selectedVariantSizeId, setSelectedVariantSizeId] = useState<string>("");
  const [variantFilesBySize, setVariantFilesBySize] = useState<Record<string, File[]>>({});
  const [variantPreviewsBySize, setVariantPreviewsBySize] = useState<Record<string, string[]>>({});
  const [variantFilenamesBySize, setVariantFilenamesBySize] = useState<Record<string, string[]>>({});
  // Combo images state (per combo value)
  const [comboFilesByKey, setComboFilesByKey] = useState<Record<string, File[]>>({});
  const [comboPreviewsByKey, setComboPreviewsByKey] = useState<Record<string, string[]>>({});
  const [comboFilenamesByKey, setComboFilenamesByKey] = useState<Record<string, string[]>>({});
  
  // Category options - includes common product categories
  const CATEGORY_OPTIONS = ['soap', 'powder', 'gel', 'oil', 'other', 'totes', 'crossbody', 'backpack'] as const;
  
  // Define form schema
  const formSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    price: z.number().min(0.01, 'Price must be greater than 0'),
    stock: z.number().optional(),
    category: z.enum(CATEGORY_OPTIONS).optional(),
    status: z.enum(['active', 'inactive']),
    material: z.string().optional(),
    dimensions: z.string().optional(),
    features: z.string().optional(),
    variants: z.string().optional(),
    colors: z.string().optional(),
    tags: z.string().optional(),
    care: z.string().optional(),
    specifications: z.string().optional(),
    care_instructions: z.string().optional(),
    usage_guidelines: z.string().optional(),
    bestseller: z.boolean().default(false),
    new: z.boolean().default(false),
    inStock: z.boolean().default(true),
    review: z.number().min(0).max(5).optional(),
    // New fields
    list_order: z.number().optional(),
    original_price: z.number().optional(),
    qikink_sku: z.string().optional(),
    print_type_id: z.number().optional(),
    product_type: z.string().optional(),
    available_colors: z.string().optional(),
    available_sizes: z.string().optional(),
    videoUrl: z.string().optional(),
    videoThumbnail: z.string().optional(),
    videoDescription: z.string().optional(),
    tn_shipping_enabled: z.boolean().default(true),
    free_shipping: z.boolean().default(false),
  });


  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  type ColorRow = { name: string; hex: string; value: string; inStock?: boolean };
  type SizeRow = { id: string; name?: string; value: string; unit?: string; useBasePrice?: boolean; sizePrice?: number; inStock?: boolean };
  type ComboRow = { id: string; name: string; value: string; type?: 'bogo'|'bundle'|'custom'; items?: number; priceOverride?: number; description?: string; discountType?: 'amount'|'percent'; discountValue?: number };
  const [colorRows, setColorRows] = useState<ColorRow[]>([]);
  const [sizeRows, setSizeRows] = useState<SizeRow[]>([]);
  const [comboRows, setComboRows] = useState<ComboRow[]>([]);

  const buildVariantsFromRows = () => {
    const variants: any = {};
    if (colorRows.length) variants.colors = colorRows.map(c => ({ name: c.name, value: c.value || slugify(c.name || ''), hex: c.hex, inStock: c.inStock !== false }));
    if (sizeRows.length) variants.sizes = sizeRows.map(s => ({
      name: s.name || (s.unit ? `${s.value} ${s.unit}` : s.value),
      value: String(s.value),
      unit: s.unit,
      inStock: s.inStock !== false,
      priceOverride: s.useBasePrice ? undefined : (typeof s.sizePrice === 'number' ? s.sizePrice : undefined),
      images: variantFilenamesBySize[s.id] || [],
    }));
    if (comboRows.length) variants.combos = comboRows.map(cb => ({ name: cb.name, value: cb.value || slugify(cb.name), type: cb.type || 'bundle', items: cb.items, priceOverride: cb.priceOverride, description: cb.description, discountType: cb.discountType, discountValue: cb.discountValue, images: comboFilenamesByKey[cb.id] || [] }));
    const json = JSON.stringify(variants);
    form.setValue('variants', json);
  };
  
  // Initialize form
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      stock: undefined,
      category: undefined,
      status: 'active',
      material: '',
      dimensions: '',
      features: '',
      variants: '',
      colors: '',
      tags: '',
      care: '',
      specifications: '',
      care_instructions: '',
      usage_guidelines: '',
      bestseller: false,
      new: false,
      inStock: true,
      review: 0,
      list_order: undefined,
      original_price: undefined,
      qikink_sku: '',
      print_type_id: undefined,
      product_type: '',
      available_colors: '',
      available_sizes: '',
      videoUrl: '',
      videoThumbnail: '',
      videoDescription: '',
      tn_shipping_enabled: true,
      free_shipping: false,
    },
  });

  // Rebuild variants JSON when rows change (after form exists)
  useEffect(() => { buildVariantsFromRows(); }, [colorRows, sizeRows, comboRows, variantFilenamesBySize, comboFilenamesByKey]);
  // Initialize selected variant size when sizes are present
  useEffect(() => {
    if (!sizeRows.length) {
      if (selectedVariantSizeId) setSelectedVariantSizeId("");
      return;
    }
    const hasSelected = sizeRows.some(row => row.id === selectedVariantSizeId);
    if (!hasSelected) {
      setSelectedVariantSizeId(sizeRows[0].id);
    } else if (!selectedVariantSizeId) {
      setSelectedVariantSizeId(sizeRows[0].id);
    }
  }, [sizeRows, selectedVariantSizeId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      // Create preview URLs for the new files
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      
      // Update state with new files and preview URLs
      setUploadedImages(prev => [...prev, ...newFiles]);
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeImage = (index: number) => {
    // Remove the image and its preview URL
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Variant images upload for the chosen size
  const handleVariantImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sizeKey = selectedVariantSizeId.trim();
    if (!sizeKey) return;
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files).map((file, index) => {
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase() || 'jpg'}` : '';
      const unique = generateRowId();
      return renameFile(file, `${sizeKey}-${unique}-${index}${ext}`);
    });

    setVariantFilesBySize(prev => ({
      ...prev,
      [sizeKey]: [...(prev[sizeKey] || []), ...newFiles],
    }));

    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setVariantPreviewsBySize(prev => ({
      ...prev,
      [sizeKey]: [...(prev[sizeKey] || []), ...newPreviews],
    }));

    // Store filenames to embed into variants JSON
    setVariantFilenamesBySize(prev => ({
      ...prev,
      [sizeKey]: [...(prev[sizeKey] || []), ...newFiles.map(f => f.name)],
    }));
  };

  // Helper: upload for a specific size row directly
  const handleSizeRowImageUpload = (sizeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const key = String(sizeId || '').trim();
    if (!key || !e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files).map((file, index) => {
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase() || 'jpg'}` : '';
      const unique = generateRowId();
      return renameFile(file, `${key}-${unique}-${index}${ext}`);
    });
    setVariantFilesBySize(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles] }));
    const previews = newFiles.map(f => URL.createObjectURL(f));
    setVariantPreviewsBySize(prev => ({ ...prev, [key]: [...(prev[key] || []), ...previews] }));
    setVariantFilenamesBySize(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles.map(f => f.name)] }));
  };

  // Combo uploads per-row
  const handleComboImageUpload = (comboId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const key = String(comboId || '').trim();
    if (!key || !e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files).map((file, index) => {
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase() || 'jpg'}` : '';
      const unique = generateRowId();
      return renameFile(file, `${key}-${unique}-${index}${ext}`);
    });
    setComboFilesByKey(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles] }));
    const previews = newFiles.map(f => URL.createObjectURL(f));
    setComboPreviewsByKey(prev => ({ ...prev, [key]: [...(prev[key] || []), ...previews] }));
    setComboFilenamesByKey(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles.map(f => f.name)] }));
  };
  const removeComboImage = (key: string, index: number) => {
    setComboFilesByKey(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
    const url = (comboPreviewsByKey[key] || [])[index];
    if (url) URL.revokeObjectURL(url);
    setComboPreviewsByKey(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
    setComboFilenamesByKey(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
    buildVariantsFromRows();
  };

  const removeVariantImage = (sizeId: string, index: number) => {
    setVariantFilesBySize(prev => ({
      ...prev,
      [sizeId]: (prev[sizeId] || []).filter((_, i) => i !== index),
    }));
    const url = (variantPreviewsBySize[sizeId] || [])[index];
    if (url) URL.revokeObjectURL(url);
    setVariantPreviewsBySize(prev => ({
      ...prev,
      [sizeId]: (prev[sizeId] || []).filter((_, i) => i !== index),
    }));
    setVariantFilenamesBySize(prev => ({
      ...prev,
      [sizeId]: (prev[sizeId] || []).filter((_, i) => i !== index),
    }));
    // Update variants JSON reflecting removal
    buildVariantsFromRows();
  };

  // Function to convert comma-separated text to JSON array
  const formatJsonField = (value: string, isArray = true) => {
    if (!value.trim()) return '';
    
    try {
      // Check if it's already valid JSON
      JSON.parse(value);
      return value;
    } catch (e) {
      // Not valid JSON, try to convert from comma-separated text
      if (isArray) {
        const items = value.split(',').map(item => item.trim());
        return JSON.stringify(items);
      } else if (value.includes(',')) {
        // For colors, create an object with available and primary
        const colors = value.split(',').map(color => color.trim());
        if (colors.length > 0) {
          return JSON.stringify({
            available: colors,
            primary: colors[0]
          });
        }
      }
      return value;
    }
  };

  const handleJsonFieldBlur = (e: React.FocusEvent<HTMLTextAreaElement>, isArray = true) => {
    const { name, value } = e.target;
    const formattedValue = formatJsonField(value, isArray);
    
    if (formattedValue && formattedValue !== value) {
      form.setValue(name as keyof ProductFormValues, formattedValue);
    }
  };

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Format JSON fields before submission
      const processedValues = { ...values };
      
      // Process array fields with typed keys to avoid TS "never" error
      const arrayFields = ['features', 'tags', 'care', 'available_colors', 'available_sizes'] as const;
      arrayFields.forEach((field) => {
        const value = processedValues[field];
        if (value) {
          // format as JSON array string
          processedValues[field] = formatJsonField(value, true) as unknown as ProductFormValues[typeof field];
        }
      });
      
      // Process object fields with typed keys
      const objectFields = ['variants', 'colors', 'specifications', 'care_instructions', 'usage_guidelines'] as const;
      objectFields.forEach((field) => {
        const value = processedValues[field];
        if (value) {
          processedValues[field] = formatJsonField(value, false) as unknown as ProductFormValues[typeof field];
        }
      });
      
      // Format JSON fields properly
      const productData: CreateProductData = {
        name: processedValues.name,
        description: processedValues.description,
        price: processedValues.price,
        category: processedValues.category,
        material: processedValues.material,
        dimensions: processedValues.dimensions,
        bestseller: processedValues.bestseller,
        new: processedValues.new,
        inStock: processedValues.inStock,
        status: processedValues.status,
        tn_shipping_enabled: processedValues.tn_shipping_enabled,
        free_shipping: processedValues.free_shipping,
      };

      if (processedValues.care) {
        productData.care = processedValues.care;
      }

      if (processedValues.tags) {
        productData.tags = processedValues.tags;
      }

      if (processedValues.variants) {
        productData.variants = processedValues.variants;
      }

      if (processedValues.colors) {
        productData.colors = processedValues.colors;
      }

      if (processedValues.specifications) {
        productData.specifications = processedValues.specifications;
      }

      if (processedValues.care_instructions) {
        productData.care_instructions = processedValues.care_instructions;
      }

      if (processedValues.usage_guidelines) {
        productData.usage_guidelines = processedValues.usage_guidelines;
      }

      // Handle stock
      if (processedValues.stock !== undefined) {
        productData.stock = processedValues.stock;
      }

      // Handle new optional scalar fields
      if (processedValues.list_order !== undefined) productData.list_order = processedValues.list_order;
      if (processedValues.original_price !== undefined) productData.original_price = processedValues.original_price;
      if (processedValues.qikink_sku) productData.qikink_sku = processedValues.qikink_sku;
      if (processedValues.print_type_id !== undefined) productData.print_type_id = processedValues.print_type_id;
      if (processedValues.product_type) productData.product_type = processedValues.product_type;
      if (processedValues.available_colors) productData.available_colors = processedValues.available_colors;
      if (processedValues.available_sizes) productData.available_sizes = processedValues.available_sizes;
      if (processedValues.videoUrl) productData.videoUrl = processedValues.videoUrl;
      if (processedValues.videoThumbnail) productData.videoThumbnail = processedValues.videoThumbnail;
      if (processedValues.videoDescription) productData.videoDescription = processedValues.videoDescription;

      // If there are images, send multipart/form-data directly to the products collection
      if (uploadedImages.length > 0 || Object.keys(variantFilesBySize).length > 0) {
        const formData = new FormData();
        // Append scalar fields
        Object.entries(productData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
        // Append image files under the 'images' field (multiple)
        uploadedImages.forEach((file) => { formData.append('images', file); });
        // Append variant files as well
        Object.values(variantFilesBySize).forEach(files => { files.forEach(f => formData.append('images', f)); });
        Object.values(comboFilesByKey).forEach(files => { files.forEach(f => formData.append('images', f)); });
        // Ensure latest variants JSON with filenames
        buildVariantsFromRows();
        formData.set('variants', form.getValues('variants') || '');
        // Pass FormData to onSubmit; the hook will send it as-is
        await onSubmit(formData);
      } else {
        // No images: submit JSON payload
        await onSubmit(productData);
      }
      
      // Reset form and state
      form.reset();
      // Clean up image preview URLs to prevent memory leaks
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setUploadedImages([]);
      setImagePreviewUrls([]);
      // Clean variant previews
      Object.values(variantPreviewsBySize).flat().forEach(url => URL.revokeObjectURL(url));
      setVariantFilesBySize({});
      setVariantPreviewsBySize({});
      setVariantFilenamesBySize({});
      setComboFilesByKey({});
      setComboPreviewsByKey({});
      setComboFilenamesByKey({});
      setSelectedVariantSizeId("");
      onOpenChange(false);
      toast.success('Product created successfully');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[95vh] max-w-[96vw] sm:max-w-[96vw] xl:max-w-[96vw] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Product</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-6 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="attributes">Attributes</TabsTrigger>
                <TabsTrigger value="care">Care & Usage</TabsTrigger>
                <TabsTrigger value="specs">Specifications</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto px-1">
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <Input {...field} placeholder="Product name" />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <Textarea
                            {...field}
                            placeholder="Product description"
                            className="resize-none"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              placeholder="0.00"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="original_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Original Price</FormLabel>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              placeholder="0.00"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock</FormLabel>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Available quantity"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Product Status</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="inStock"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>In Stock</FormLabel>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="new"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>New</FormLabel>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bestseller"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Bestseller</FormLabel>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="tn_shipping_enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Allow TN Shipping</FormLabel>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="free_shipping"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Free Shipping</FormLabel>
                                <FormDescription>
                                  Enable free shipping for this product
                                </FormDescription>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Product Images
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group overflow-hidden rounded-md border">
                            <AspectRatio ratio={1 / 1}>
                              <img
                                src={url}
                                alt={`Product image ${index + 1}`}
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/darkgray/white?text=Image+Not+Found';
                                }}
                              />
                            </AspectRatio>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                              aria-label={`Remove image ${index + 1}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center justify-center rounded-md border border-dashed p-4 h-full min-h-[150px]">
                          <label htmlFor="image-upload" className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">Upload Image</span>
                              <span className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB</span>
                            </div>
                            <input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              multiple
                              className="sr-only"
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium" htmlFor="variant-size-select">Variant Images — Size</label>
                          <select
                            id="variant-size-select"
                            className="h-8 rounded-md border bg-background px-2 text-sm"
                            value={selectedVariantSizeId}
                            onChange={(e) => setSelectedVariantSizeId(e.target.value)}
                          >
                            <option value="" disabled>Select a size</option>
                            {sizeRows.map((s) => (
                              <option key={s.id} value={s.id}>{s.name || (s.unit ? `${s.value} ${s.unit}` : s.value)}</option>
                            ))}
                          </select>
                          <div className="ml-auto">
                            <label htmlFor="variant-image-upload" className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
                              <Upload className="h-4 w-4" /> Upload for size
                            </label>
                            <input
                              id="variant-image-upload"
                              type="file"
                              accept="image/*"
                              multiple
                              className="sr-only"
                              onChange={handleVariantImageUpload}
                              disabled={!selectedVariantSizeId}
                            />
                          </div>
                        </div>
                        {selectedVariantSizeId ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(variantPreviewsBySize[selectedVariantSizeId] || []).map((url, index) => (
                              <div key={index} className="relative group overflow-hidden rounded-md border">
                                <AspectRatio ratio={1 / 1}>
                                  <img
                                    src={url}
                                    alt={`Variant image ${index + 1}`}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/darkgray/white?text=Image+Not+Found';
                                    }}
                                  />
                                </AspectRatio>
                                <button
                                  type="button"
                                  onClick={() => removeVariantImage(selectedVariantSizeId, index)}
                                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                                  aria-label={`Remove variant image ${index + 1}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Alert>
                            <AlertDescription>Select a size first, then upload images for that variant.</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="space-y-4 mt-0">

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="list_order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>List Order</FormLabel>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="e.g., 123"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="original_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Original Price</FormLabel>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="e.g., 999.99"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="qikink_sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qikink SKU</FormLabel>
                          <Input {...field} placeholder="e.g., SKU-123" />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="print_type_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Print Type ID</FormLabel>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="e.g., 123"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="product_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <Input {...field} placeholder="e.g., Apparel" />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <Textarea
                          {...field}
                          placeholder='Enter features separated by commas or as JSON array'
                          onBlur={(e) => handleJsonFieldBlur(e, true)}
                        />
                        <FormDescription>
                          Enter features as comma-separated values or a JSON array of strings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FormLabel>Variants (Interactive)</FormLabel>
                      <div className="space-y-3">
                        {false && (
                          <div className="space-y-2">
                            <FormLabel className="text-sm">Colors</FormLabel>
                            <div className="space-y-2">
                              {colorRows.map((c, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-4">
                                    <Input value={c.name} onChange={(e)=>{ const v=[...colorRows]; v[i]={...v[i],name:e.target.value, value: v[i].value || slugify(e.target.value)}; setColorRows(v); }} placeholder="Red" />
                                  </div>
                                  <div className="col-span-3">
                                    <Input type="color" value={c.hex || '#ffffff'} onChange={(e)=>{ const v=[...colorRows]; v[i]={...v[i],hex:e.target.value}; setColorRows(v); }} />
                                  </div>
                                  <div className="col-span-3 text-xs text-muted-foreground truncate">
                                    slug: {c.value || slugify(c.name || '')}
                                  </div>
                                  <div className="col-span-2 flex gap-2 justify-end">
                                    <Button type="button" variant="outline" onClick={()=>{ const v=[...colorRows]; v.splice(i,1); setColorRows(v); }}>Remove</Button>
                                  </div>
                                </div>
                              ))}
                              <Button type="button" variant="secondary" onClick={()=>setColorRows([...colorRows,{name:'',hex:'#ff0000',value:''}])}>Add Color</Button>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <FormLabel className="text-sm">Sizes</FormLabel>
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
                                    const base = Number(form.watch('price')) || 0;
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
                          <FormLabel className="text-sm">Combos</FormLabel>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'Buy 1 Get 1', value:'bogo', type:'bogo'}])}>Add BOGO</Button>
                            <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'2-Pack', value:'2-pack', type:'bundle', items:2}])}>Add 2‑Pack</Button>
                            <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'3-Pack', value:'3-pack', type:'bundle', items:3}])}>Add 3‑Pack</Button>
                            <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'4-Pack', value:'4-pack', type:'bundle', items:4}])}>Add 4‑Pack</Button>
                            <Button type="button" variant="secondary" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'',value:'',type:'bundle'}])}>Add Custom</Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'2-Pack', value:'2-pack-10off', type:'bundle', items:2, discountType:'percent', discountValue:10}])}>2‑Pack −10%</Button>
                            <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'3-Pack', value:'3-pack-15off', type:'bundle', items:3, discountType:'percent', discountValue:15}])}>3‑Pack −15%</Button>
                            <Button type="button" variant="outline" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'4-Pack', value:'4-pack-20off', type:'bundle', items:4, discountType:'percent', discountValue:20}])}>4‑Pack −20%</Button>
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
                                <div className="col-span-12 sm:col-span-1">
                                  <Input
                                    type="number"
                                    value={cb.priceOverride ?? '' as any}
                                    onChange={(e)=>{
                                      const targetId = cb.id;
                                      const priceOverride = e.target.value ? Number(e.target.value) : undefined;
                                      setComboRows(prev => prev.map(row => row.id === targetId ? { ...row, priceOverride } : row));
                                    }}
                                    placeholder="Price"
                                  />
                                </div>
                                <div className="col-span-0 md:col-span-0 lg:col-span-0"></div>
                                <div className="absolute top-2 right-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const removedId = cb.id;
                                      setComboRows(prev => prev.filter(row => row.id !== removedId));
                                      setComboFilesByKey(prev => {
                                        const next = { ...prev };
                                        delete next[removedId];
                                        return next;
                                      });
                                      setComboPreviewsByKey(prev => {
                                        const next = { ...prev };
                                        (prev[removedId] || []).forEach(url => URL.revokeObjectURL(url));
                                        delete next[removedId];
                                        return next;
                                      });
                                      setComboFilenamesByKey(prev => {
                                        const next = { ...prev };
                                        delete next[removedId];
                                        return next;
                                      });
                                    }}
                                  >Remove</Button>
                                </div>
                                <div className="col-span-12 flex items-center gap-2">
                                  <label htmlFor={`combo-upload-${cb.id}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
                                    <Upload className="h-4 w-4" /> Upload images for {cb.name || cb.value || 'combo'}
                                  </label>
                                  <input
                                    id={`combo-upload-${cb.id}`}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="sr-only"
                                    onChange={(e)=>handleComboImageUpload(cb.id, e)}
                                  />
                                  <span className="text-xs text-muted-foreground">{(comboFilenamesByKey[cb.id] || []).length} selected</span>
                                </div>
                                {(comboPreviewsByKey[cb.id] || []).length > 0 && (
                                  <div className="col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {(comboPreviewsByKey[cb.id] || []).map((url, idx)=> (
                                      <div key={idx} className="relative group overflow-hidden rounded-md border">
                                        <AspectRatio ratio={1/1}>
                                          <img src={url} alt="Combo preview" className="object-cover w-full h-full" onError={(e)=>{ (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/darkgray/white?text=Preview+Not+Found'; }} />
                                        </AspectRatio>
                                        <button type="button" onClick={()=>removeComboImage(cb.id, idx)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70" aria-label="Remove combo image">
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="variants"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <Textarea {...field} />
                        </FormItem>
                      )}
                    />
                  </div>

                  {false && (
                    <FormField
                      control={form.control}
                      name="colors"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Colors</FormLabel>
                          <Textarea
                            {...field}
                            placeholder='Enter colors separated by commas or as JSON object'
                            onBlur={(e) => handleJsonFieldBlur(e, false)}
                          />
                          <FormDescription>
                            Enter colors as comma-separated values or a JSON object with "available" array and "primary" color
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <Textarea
                          {...field}
                          placeholder='Enter tags separated by commas or as JSON array'
                          onBlur={(e) => handleJsonFieldBlur(e, true)}
                        />
                        <FormDescription>
                          Enter tags as comma-separated values or a JSON array of strings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    {false && (
                      <FormField
                        control={form.control}
                        name="available_colors"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available Colors</FormLabel>
                            <Textarea
                              {...field}
                              placeholder='Enter colors separated by commas or as JSON array'
                              onBlur={(e) => handleJsonFieldBlur(e, true)}
                            />
                            <FormDescription>
                              Enter colors as comma-separated values or a JSON array of strings
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="available_sizes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Available Sizes</FormLabel>
                          <Textarea
                            {...field}
                            placeholder='Enter sizes separated by commas or as JSON array'
                            onBlur={(e) => handleJsonFieldBlur(e, true)}
                          />
                          <FormDescription>
                            Enter sizes as comma-separated values or a JSON array of strings
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="review"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Rating (0-5)</FormLabel>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="videoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video URL</FormLabel>
                          <Input {...field} placeholder="https://..." />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="videoThumbnail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video Thumbnail URL</FormLabel>
                          <Input {...field} placeholder="https://..." />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="videoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video Description</FormLabel>
                        <Textarea {...field} className="min-h-[120px]" placeholder="Describe the video" />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="attributes" className="space-y-4 mt-0">
                  {/* This tab will be for future attributes */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Attributes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Additional product attributes will be added here in the future.</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="care" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="care"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Care Instructions</FormLabel>
                        <Textarea
                          {...field}
                          placeholder='Enter care instructions separated by commas or as JSON array'
                          onBlur={(e) => handleJsonFieldBlur(e, true)}
                        />
                        <FormDescription>
                          Enter care instructions as comma-separated values or a JSON array of strings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="care_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detailed Care Instructions</FormLabel>
                        <Textarea
                          {...field}
                          className="min-h-[150px]"
                          placeholder='Enter as JSON object or use the format described below'
                          onBlur={(e) => handleJsonFieldBlur(e, false)}
                        />
                        <FormDescription>
                          Enter as JSON object with "cleaning" and "storage" arrays or use the proper JSON format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="usage_guidelines"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usage Guidelines</FormLabel>
                        <Textarea
                          {...field}
                          className="min-h-[150px]"
                          placeholder='Enter as JSON object or use the format described below'
                          onBlur={(e) => handleJsonFieldBlur(e, false)}
                        />
                        <FormDescription>
                          Enter as JSON object with "recommended_use" and "pro_tips" arrays or use the proper JSON format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="specs" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="specifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Specifications</FormLabel>
                        <Textarea
                          {...field}
                          className="min-h-[200px]"
                          placeholder='Enter as JSON object or use the format described below'
                          onBlur={(e) => handleJsonFieldBlur(e, false)}
                        />
                        <FormDescription>
                          Enter product specifications as a JSON object with key-value pairs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </div>
            </Tabs>

            <Alert className="mt-6 bg-muted/50">
              <AlertDescription>
                For fields like Features, Colors, and Tags, you can enter simple comma-separated values and they will be automatically converted to the required JSON format.
              </AlertDescription>
            </Alert>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
