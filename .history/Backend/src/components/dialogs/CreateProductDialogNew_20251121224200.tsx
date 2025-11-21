import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { CreateProductData, Product, UpdateProductData } from '@/types/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { X, Upload, Image as ImageIcon, Loader2, Eye, Pencil, Package, ArrowLeft, HelpCircle } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { pb } from '@/lib/pocketbase';
import { generateProductCopy } from '@/lib/gemini';
import { Progress } from '@/components/ui/progress';
import {
  compressImageToWebp,
  type CompressImageOptions,
} from '@/lib/imageCompression';

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
  // Selling Type mappings (virtual fields)
  selling_type?: 'in_store' | 'online' | 'both';
};

export type ProductDialogMode = 'create' | 'edit' | 'view';

interface CreateProductDialogProps {
  mode?: ProductDialogMode;
  product?: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (data: CreateProductData | FormData) => Promise<void>;
  onUpdate?: (payload: { id: string; data: UpdateProductData | FormData }) => Promise<unknown>;
  onDelete?: () => Promise<void>;
}

export function CreateProductDialog({
  mode = 'create',
  product,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: CreateProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  // Existing images for edit/view mode
  const [existingImages, setExistingImages] = useState<string[]>([]);
  
  // Variant images state (per size value)
  const [selectedVariantSizeId, setSelectedVariantSizeId] = useState<string>("");
  const [variantFilesBySize, setVariantFilesBySize] = useState<Record<string, File[]>>({});
  const [variantPreviewsBySize, setVariantPreviewsBySize] = useState<Record<string, string[]>>({});
  const [variantFilenamesBySize, setVariantFilenamesBySize] = useState<Record<string, string[]>>({});
  const [variantExistingBySize, setVariantExistingBySize] = useState<Record<string, string[]>>({});
  
  // Combo images state (per combo value)
  const [comboFilesByKey, setComboFilesByKey] = useState<Record<string, File[]>>({});
  const [comboPreviewsByKey, setComboPreviewsByKey] = useState<Record<string, string[]>>({});
  const [comboFilenamesByKey, setComboFilenamesByKey] = useState<Record<string, string[]>>({});
  const [uploadProgressByKey, setUploadProgressByKey] = useState<Record<string, number>>({});
  const [isCompressing, setIsCompressing] = useState(false);
  
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
    selling_type: z.enum(['in_store', 'online', 'both']).optional(),
  });


  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  type ColorRow = { name: string; hex: string; value: string; inStock?: boolean };
  type SizeRow = {
    id: string;
    name?: string;
    value: string;
    unit?: string;
    useBasePrice?: boolean;
    sizePrice?: number;
    originalPrice?: number;
    inStock?: boolean;
  };
  type ComboRow = { 
    id: string; 
    name: string; 
    value: string; 
    type?: 'bogo'|'bundle'|'custom'|'buy_any_x'; 
    items?: number; 
    priceOverride?: number; 
    description?: string; 
    discountType?: 'amount'|'percent'; 
    discountValue?: number;
    // New fields for "Buy Any X" functionality
    availableProducts?: string[]; // Array of product IDs that can be selected
    requiredQuantity?: number; // How many items user must select (e.g., 2 for "Buy Any 2")
    allowDuplicates?: boolean; // Whether user can select same product multiple times
  };
  const [colorRows, setColorRows] = useState<ColorRow[]>([]);
  const [sizeRows, setSizeRows] = useState<SizeRow[]>([]);
  const [comboRows, setComboRows] = useState<ComboRow[]>([]);
  
  // State for managing available products for "Buy Any X" combos
  const [availableProducts, setAvailableProducts] = useState<Array<{id: string, name: string, price: number}>>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [aiKeywords, setAiKeywords] = useState('');
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [showVariantPrompt, setShowVariantPrompt] = useState(false);
  const [variantRequest, setVariantRequest] = useState('');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [existingVideos, setExistingVideos] = useState<Array<{id: string, videos: string}>>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const buildVariantsFromRows = () => {
    const variants: any = {};
    if (colorRows.length) variants.colors = colorRows.map(c => ({ name: c.name, value: c.value || slugify(c.name || ''), hex: c.hex, inStock: c.inStock !== false }));
    if (sizeRows.length) variants.sizes = sizeRows.map(s => ({
      name: s.name || (s.unit ? `${s.value} ${s.unit}` : s.value),
      value: String(s.value),
      unit: s.unit,
      inStock: s.inStock !== false,
      priceOverride: s.useBasePrice ? undefined : (typeof s.sizePrice === 'number' ? s.sizePrice : undefined),
      originalPrice: typeof s.originalPrice === 'number' ? s.originalPrice : undefined,
      images: [
        ...(variantExistingBySize[s.id] || []),
        ...(variantFilenamesBySize[s.id] || [])
      ],
    }));
    if (comboRows.length) variants.combos = comboRows.map(cb => ({ 
      name: cb.name, 
      value: cb.value || slugify(cb.name), 
      type: cb.type || 'bundle', 
      items: cb.items, 
      priceOverride: cb.priceOverride, 
      description: cb.description, 
      discountType: cb.discountType, 
      discountValue: cb.discountValue, 
      images: comboFilenamesByKey[cb.id] || [],
      // Include new "Buy Any X" fields
      availableProducts: cb.availableProducts || [],
      requiredQuantity: cb.requiredQuantity || cb.items,
      allowDuplicates: cb.allowDuplicates !== false
    }));
    const json = JSON.stringify(variants);
    form.setValue('variants', json);
  };

  // ... (AI Generation functions skipped for brevity, they remain same)

  const handleGenerateVariants = async () => {
    const values = form.getValues();
    if (!values.name && !values.category) {
      toast.error('Enter a product name or category before generating variants.');
      return;
    }

    if (!variantRequest.trim()) {
      toast.error('Please describe what variants you want to create.');
      return;
    }

    try {
      setIsGeneratingVariants(true);
      setShowVariantPrompt(false);
      
      // Use the same Gemini API endpoint as the working product copy generation
      const prompt = `You are a product variant expert. Based on this product: "${values.name || 'unnamed product'}" in category "${values.category || 'general'}".

The user wants these variants: "${variantRequest}"

Our variant schema:
- SIZES: Product variants/types. Can be numeric (100ml, 250g) OR named types (mint charcoal, sandle charcoal, Small, Medium). These will use "pcs" as unit if no unit specified.
- COLORS: Only use for actual color/visual variations with hex codes. Leave empty if not needed.
- COMBOS: Bundle deals like "Buy 2 Get 1", "Family Pack", etc. with type (bogo, bundle, custom) and items count.

CRITICAL RULES:
1. If user mentions product types/variants (like "mint charcoal", "sandle charcoal", "vanilla") → put in SIZES array as strings
2. If user mentions numeric quantities (100ml, 250g) → put in SIZES array as strings
3. If user mentions deals or bundles → these are COMBOS
4. COLORS should only be used for actual visual color variations, otherwise leave empty

Provide your response in this exact JSON format:
{
  "sizes": ["mint charcoal", "sandle charcoal", "redwine charcoal"],
  "colors": [],
  "combos": [{"name": "Buy 2 Get 1 Free", "type": "bogo", "items": 3}]
}

IMPORTANT: 
- Create ONLY the variants the user requested
- Put product type names (mint charcoal, etc.) in the SIZES array
- Match the user's request exactly
- Return empty arrays for variant types not requested

Only return the JSON, no explanations.`;

      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.');
      }

      // Use the same model as gemini.ts (gemini-2.0-flash)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response format');
      
      const suggested = JSON.parse(jsonMatch[0]);
      
      // Populate size rows
      if (suggested.sizes && Array.isArray(suggested.sizes)) {
        const newSizes = suggested.sizes.map((sizeStr: string) => {
          // Check if it's a numeric size (100ml, 250g, etc.)
          const numericMatch = sizeStr.match(/(\d+)(\w+)/);
          
          if (numericMatch) {
            // Numeric size with unit
            return {
              id: generateRowId(),
              value: numericMatch[1],
              unit: numericMatch[2],
              useBasePrice: true,
              inStock: true,
            };
          } else {
            // Named variant (mint charcoal, sandle charcoal, etc.)
            return {
              id: generateRowId(),
              value: sizeStr,
              unit: 'pcs',
              useBasePrice: true,
              inStock: true,
            };
          }
        });
        setSizeRows(newSizes);
      }
      
      // Populate color rows
      if (suggested.colors && Array.isArray(suggested.colors)) {
        const newColors = suggested.colors.map((color: any) => ({
          name: color.name || color,
          hex: color.hex || '#000000',
          value: slugify(color.name || color),
          inStock: true,
        }));
        setColorRows(newColors);
      }
      
      // Populate combo rows
      if (suggested.combos && Array.isArray(suggested.combos)) {
        const newCombos = suggested.combos.map((combo: any) => ({
          id: generateRowId(),
          name: combo.name,
          value: slugify(combo.name),
          type: combo.type || 'bundle',
          items: combo.items || 2,
        }));
        setComboRows(newCombos);
      }
      
      toast.success('Generated variants with AI');
    } catch (error) {
      console.error('Error generating variants:', error);
      toast.error('Failed to generate variants');
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  const handleGenerateAiContent = async () => {
    const values = form.getValues();
    if (!values.name && !aiKeywords && !values.category) {
      toast.error('Enter a product name, category, or some keywords before generating.');
      return;
    }

    try {
      setIsGeneratingCopy(true);
      const newHighlighted = new Set<string>();
      
      const result = await generateProductCopy({
        name: values.name || undefined,
        category: values.category,
        keywords: aiKeywords || values.tags || undefined,
        tone: 'playful',
      });

      if (!values.name && result.name) {
        form.setValue('name', result.name, { shouldDirty: true });
        newHighlighted.add('name');
      }
      if (result.description) {
        form.setValue('description', result.description, { shouldDirty: true });
        newHighlighted.add('description');
      }
      if (result.features) {
        form.setValue('features', result.features, { shouldDirty: true });
        newHighlighted.add('features');
      }
      if (result.specifications) {
        // Stringify if it's an object
        const specsValue = typeof result.specifications === 'object'
          ? JSON.stringify(result.specifications, null, 2)
          : result.specifications;
        form.setValue('specifications', specsValue, { shouldDirty: true });
        newHighlighted.add('specifications');
      }
      if (result.tags) {
        form.setValue('tags', result.tags, { shouldDirty: true });
        newHighlighted.add('tags');
      }
      if (result.care_instructions) {
        // Stringify if it's an object, handle null/undefined
        const careValue = result.care_instructions == null 
          ? ''
          : typeof result.care_instructions === 'object' 
            ? JSON.stringify(result.care_instructions, null, 2)
            : String(result.care_instructions);
        form.setValue('care_instructions', careValue, { shouldDirty: true });
        newHighlighted.add('care_instructions');
      }
      if (result.usage_guidelines) {
        // Stringify if it's an object, handle null/undefined
        const guidelinesValue = result.usage_guidelines == null
          ? ''
          : typeof result.usage_guidelines === 'object'
            ? JSON.stringify(result.usage_guidelines, null, 2)
            : String(result.usage_guidelines);
        form.setValue('usage_guidelines', guidelinesValue, { shouldDirty: true });
        newHighlighted.add('usage_guidelines');
      }

      setHighlightedFields(newHighlighted);
      setTimeout(() => setHighlightedFields(new Set()), 3000);

      toast.success('Generated product copy with Gemini');
    } catch (error) {
      console.error('Error generating product copy with Gemini:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate product copy';
      toast.error(message);
    } finally {
      setIsGeneratingCopy(false);
    }
  };
  
  // Helper functions
  const normalizeVariantNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://placehold.co/300x300/e2e8f0/64748b?text=No+Image';
    if (imagePath.startsWith('http')) return imagePath;
    
    const pocketbaseUrl = pb.baseUrl || (import.meta as any).env?.VITE_POCKETBASE_URL || 'https://backend-pocketbase.p3ibd8.easypanel.host';
    
    // If imagePath already contains collection/record structure (e.g., "collectionId/recordId/filename")
    if (imagePath.includes('/')) {
      return `${pocketbaseUrl}/api/files/${imagePath}`;
    }
    
    // For simple filenames, construct the full path using product data
    // PocketBase file URL format: {baseUrl}/api/files/{collectionName}/{recordId}/{filename}
    if (product?.id) {
      // Use 'products' as collection name (not collectionId)
      return `${pocketbaseUrl}/api/files/products/${product.id}/${imagePath}`;
    }
    
    // Last resort fallback
    return `${pocketbaseUrl}/api/files/products/${imagePath}`;
  };

  const removeExistingImage = (index: number) => {
    const removedImage = existingImages[index];
    console.log('Removing existing image:', removedImage);
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingVariantImage = (sizeId: string, index: number) => {
    setVariantExistingBySize(prev => ({
      ...prev,
      [sizeId]: (prev[sizeId] || []).filter((_, i) => i !== index)
    }));
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
      selling_type: 'both',
    },
  });

  // Hydration effect
  useEffect(() => {
    if (mode === 'create') {
      form.reset({
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
        selling_type: 'both',
      });
      setExistingImages([]);
      setSizeRows([]);
      setComboRows([]);
      setColorRows([]);
      setVariantExistingBySize({});
      setVariantFilesBySize({});
      setVariantPreviewsBySize({});
      setVariantFilenamesBySize({});
      setComboFilesByKey({});
      setComboPreviewsByKey({});
      setComboFilenamesByKey({});
      setUploadedImages([]);
      setImagePreviewUrls([]);
    } else if (product) {
       form.reset({
          name: product.name || '',
          description: product.description || '',
          price: product.price || 0,
          stock: product.stock,
          category: product.category as any,
          status: (product.status as any) || 'active',
          material: product.material || '',
          dimensions: product.dimensions || '',
          features: product.features || '',
          variants: typeof product.variants === 'string' ? product.variants : JSON.stringify(product.variants),
          colors: product.colors || '',
          tags: product.tags || '',
          care: product.care || '',
          specifications: product.specifications || '',
          care_instructions: product.care_instructions || '',
          usage_guidelines: product.usage_guidelines || '',
          bestseller: product.bestseller || false,
          new: product.new || false,
          inStock: product.inStock !== false,
          review: product.review,
          list_order: product.list_order,
          original_price: product.original_price,
          qikink_sku: product.qikink_sku || '',
          print_type_id: product.print_type_id,
          product_type: product.product_type || '',
          available_colors: product.available_colors || '',
          available_sizes: product.available_sizes || '',
          videoUrl: product.videoUrl || '',
          videoThumbnail: product.videoThumbnail || '',
          videoDescription: product.videoDescription || '',
          tn_shipping_enabled: product.tn_shipping_enabled !== false,
          free_shipping: product.free_shipping || false,
          selling_type: product.tn_shipping_enabled !== false ? 'both' : 'in_store',
       });

       const existing = Array.isArray(product.images)
        ? product.images.filter((img): img is string => typeof img === 'string' && img.length > 0)
        : typeof product.image === 'string' && product.image.length > 0
          ? [product.image]
          : [];
       setExistingImages(existing);
       setUploadedImages([]);
       setImagePreviewUrls([]);

       if (product.variants && typeof product.variants === 'object') {
          const variantData = product.variants as any;
          if (variantData.sizes && Array.isArray(variantData.sizes)) {
             const newSizeRows = variantData.sizes.map((s: any) => ({
                id: generateRowId(),
                value: s.value || '',
                unit: s.unit || 'pcs',
                name: s.name || '',
                inStock: s.inStock !== false,
                useBasePrice: s.priceOverride == null,
                sizePrice: normalizeVariantNumber(s.priceOverride),
                originalPrice: normalizeVariantNumber(s.originalPrice),
             }));
             setSizeRows(newSizeRows);
             
             // Match variant image names with actual product images
             const existingVarImages: Record<string, string[]> = {};
             variantData.sizes.forEach((s: any, idx: number) => {
                if (s.images && Array.isArray(s.images)) {
                   const matchedImages = s.images.map((variantImgName: string) => {
                      if (existing.includes(variantImgName)) return variantImgName;
                      const variantNameWithoutExt = variantImgName.replace(/\.[^.]+$/, '').replace(/-/g, '_');
                      const normalizedMatch = existing.find((img: string) => {
                        const imgWithoutExt = img.replace(/\.[^.]+$/, '').replace(/-/g, '_');
                        return imgWithoutExt.startsWith(variantNameWithoutExt) || imgWithoutExt === variantNameWithoutExt;
                      });
                      if (normalizedMatch) return normalizedMatch;
                      const match = existing.find((img: string) => 
                        img.endsWith(variantImgName) || 
                        img.includes(variantImgName) ||
                        variantImgName.includes(img.split('.')[0])
                      );
                      if (match) return match;
                      return variantImgName;
                   });
                   existingVarImages[newSizeRows[idx].id] = matchedImages;
                }
             });
             setVariantExistingBySize(existingVarImages);
             setVariantFilenamesBySize({});
             setVariantFilesBySize({});
             setVariantPreviewsBySize({});
          }
          
          if (variantData.combos && Array.isArray(variantData.combos)) {
             setComboRows(variantData.combos.map((c: any) => ({
                id: generateRowId(),
                name: c.name || '',
                value: c.value || '',
                type: c.type || 'bundle',
                items: c.items || 2,
                discountType: c.discountType || 'amount',
                discountValue: c.discountValue || 0,
                priceOverride: c.priceOverride,
                availableProducts: c.availableProducts || [],
                requiredQuantity: c.requiredQuantity || c.items,
                allowDuplicates: c.allowDuplicates !== false
             })));
          }
          
          if (variantData.colors && Array.isArray(variantData.colors)) {
             setColorRows(variantData.colors.map((c: any) => ({
                name: c.name || '',
                hex: c.hex || '#000000',
                value: c.value || '',
                inStock: c.inStock !== false,
             })));
          }
       }
    }
  }, [product, mode, form, open]);


  // Rebuild variants JSON when rows change (after form exists)
  useEffect(() => { buildVariantsFromRows(); }, [colorRows, sizeRows, comboRows, variantFilenamesBySize, comboFilenamesByKey, variantExistingBySize]);
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

  // Fetch available products for "Buy Any X" combo selection
  useEffect(() => {
    const fetchProducts = async () => {
      if (!open) return; // Only fetch when dialog is open
      
      setLoadingProducts(true);
      try {
        let records;
        try {
          records = await pb.collection('products').getList(1, 100, {
            filter: 'status = "active"',
            sort: 'name',
          });
        } catch (error: any) {
          console.warn('Primary combo product fetch failed, retrying without filter:', error);
          records = await pb.collection('products').getList(1, 100);
        }

        setAvailableProducts(records.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: typeof item.price === 'number' ? item.price : 0,
        })));
      } catch (error) {
        console.error('Failed to fetch products for combo selection:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [open]);

  const compressionOptions = useMemo<CompressImageOptions>(() => ({
    quality: 0.8,
    maxWidth: 1600,
    maxHeight: 1600,
  }), []);

  const applyCompression = useCallback(
    async (files: File[], key: string): Promise<File[]> => {
      const output: File[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const progressKey = `${key}-${index}`;
        try {
          const next = await compressImageToWebp(file, {
            ...compressionOptions,
            onProgress: (value) => {
              setUploadProgressByKey((prev) => ({ ...prev, [progressKey]: value }));
            },
          });
          output.push(next);
        } catch (error) {
          console.warn('Compression failed, using original file', error);
          output.push(file);
        } finally {
          setUploadProgressByKey((prev) => {
            const next = { ...prev };
            delete next[progressKey];
            return next;
          });
        }
      }
      return output;
    },
    [compressionOptions],
  );

  const activeCompressionProgress = useMemo(() => {
    const values = Object.values(uploadProgressByKey);
    if (!values.length) return null;
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.max(0, Math.min(100, Math.round(total / values.length)));
  }, [uploadProgressByKey]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const rawFiles = Array.from(e.target.files);
    setIsCompressing(true);
    try {
      const compressed = await applyCompression(rawFiles, 'base');
      const renamed = compressed.map((file, index) =>
        renameFile(file, `${Date.now()}-${index}-${file.name}`),
      );
      const previews = renamed.map((file) => URL.createObjectURL(file));
      setUploadedImages((prev) => [...prev, ...renamed]);
      setImagePreviewUrls((prev) => [...prev, ...previews]);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
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
  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const sizeKey = selectedVariantSizeId.trim();
    if (!sizeKey) return;
    if (!e.target.files || e.target.files.length === 0) return;
    setIsCompressing(true);
    try {
      const compressed = await applyCompression(Array.from(e.target.files), `variant-${sizeKey}`);
      const renamed = compressed.map((file, index) => {
        const unique = generateRowId();
        return renameFile(file, `${sizeKey}-${unique}-${index}.webp`);
      });

      setVariantFilesBySize((prev) => ({
        ...prev,
        [sizeKey]: [...(prev[sizeKey] || []), ...renamed],
      }));

      const previews = renamed.map((file) => URL.createObjectURL(file));
      setVariantPreviewsBySize((prev) => ({
        ...prev,
        [sizeKey]: [...(prev[sizeKey] || []), ...previews],
      }));

      setVariantFilenamesBySize((prev) => ({
        ...prev,
        [sizeKey]: [...(prev[sizeKey] || []), ...renamed.map((file) => file.name)],
      }));
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Helper: upload for a specific size row directly
  const handleSizeRowImageUpload = async (sizeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const key = String(sizeId || '').trim();
    if (!key || !e.target.files || e.target.files.length === 0) return;
    setIsCompressing(true);
    try {
      const compressed = await applyCompression(Array.from(e.target.files), `size-${key}`);
      const renamed = compressed.map((file, index) => {
        const unique = generateRowId();
        return renameFile(file, `${key}-${unique}-${index}.webp`);
      });
      setVariantFilesBySize((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...renamed] }));
      const previews = renamed.map((file) => URL.createObjectURL(file));
      setVariantPreviewsBySize((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...previews] }));
      setVariantFilenamesBySize((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...renamed.map((file) => file.name)] }));
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Combo uploads per-row
  const handleComboImageUpload = async (comboId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const key = String(comboId || '').trim();
    if (!key || !e.target.files || e.target.files.length === 0) return;
    setIsCompressing(true);
    try {
      const compressed = await applyCompression(Array.from(e.target.files), `combo-${key}`);
      const renamed = compressed.map((file, index) => {
        const unique = generateRowId();
        return renameFile(file, `${key}-${unique}-${index}.webp`);
      });
      setComboFilesByKey((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...renamed] }));
      const previews = renamed.map((file) => URL.createObjectURL(file));
      setComboPreviewsByKey((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...previews] }));
      setComboFilenamesByKey((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...renamed.map((file) => file.name)] }));
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
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

      // Always use FormData for updates to handle image removal
      // For create, only use FormData if there are new images
      const hasNewImages = uploadedImages.length > 0 || Object.keys(variantFilesBySize).length > 0;
      const hasImageChanges = hasNewImages || (isEditMode && existingImages.length !== (product?.images?.length || 0));
      
      if (hasNewImages || (isEditMode && hasImageChanges)) {
        const formData = new FormData();
        // Append scalar fields
        Object.entries(productData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
        // In edit mode, handle image updates
        if (isEditMode && product?.images) {
          // Find which images were removed
          const originalImages = Array.isArray(product.images) ? product.images : [];
          const removedImages = originalImages.filter(img => !existingImages.includes(img));
          
          console.log('Original images:', originalImages);
          console.log('Remaining images:', existingImages);
          console.log('Removed images:', removedImages);
          
          // Mark removed images with '-' prefix (PocketBase convention)
          removedImages.forEach((imgName) => {
            formData.append('images-', imgName);
          });
          
          // Keep existing images by appending their filenames
          existingImages.forEach((imgName) => {
            formData.append('images', imgName);
          });
        }
        
        // Append new image files (both create and edit modes)
        uploadedImages.forEach((file) => { formData.append('images', file); });
        Object.values(variantFilesBySize).forEach(files => { files.forEach(f => formData.append('images', f)); });
        Object.values(comboFilesByKey).forEach(files => { files.forEach(f => formData.append('images', f)); });
        // Ensure latest variants JSON with filenames
        buildVariantsFromRows();
        formData.set('variants', form.getValues('variants') || '');
        
        // Call appropriate handler based on mode
        if (isEditMode && onUpdate && product?.id) {
          await onUpdate({ id: product.id, data: formData });
        } else if (onCreate) {
          await onCreate(formData);
        }
      } else {
        // No images: submit JSON payload
        if (isEditMode && onUpdate && product?.id) {
          await onUpdate({ id: product.id, data: productData });
        } else if (onCreate) {
          await onCreate(productData);
        }
      }
      
      // Reset form and state
      form.reset();
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setUploadedImages([]);
      setImagePreviewUrls([]);
      setExistingImages([]);
      Object.values(variantPreviewsBySize).flat().forEach(url => URL.revokeObjectURL(url));
      setVariantFilesBySize({});
      setVariantPreviewsBySize({});
      setVariantFilenamesBySize({});
      setVariantExistingBySize({});
      setComboFilesByKey({});
      setComboPreviewsByKey({});
      setComboFilenamesByKey({});
      setSelectedVariantSizeId("");
      setShowMediaLibrary(false);
      onOpenChange(false);
      toast.success(isEditMode ? 'Product updated successfully' : 'Product created successfully');
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} product:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} product`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[95vh] max-w-[96vw] sm:max-w-[96vw] xl:max-w-[96vw] overflow-hidden flex flex-col bg-gray-50">
        <DialogHeader className="border-b pb-4 bg-white px-6 pt-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <DialogTitle className="text-xl font-bold">
                {isViewMode ? 'Product Details' : isEditMode ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription className="hidden">
                 Product Form
              </DialogDescription>
            </div>
            <div className="ml-auto">
               <Button variant="outline" size="sm">View Shop</Button>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <fieldset disabled={isViewMode} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-12 gap-6">
                {/* Left Column (8 cols) */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  {/* Description Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Description</h3>
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-6 space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Name</FormLabel>
                              <Input {...field} placeholder="e.g. Full Spectrum CBD Tincture" />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex justify-between items-center">
                                <FormLabel>Business Description</FormLabel>
                                <div className="flex items-center gap-2">
                                   <Button 
                                     type="button" 
                                     variant="ghost" 
                                     size="sm" 
                                     className="text-blue-600 h-auto p-0 hover:bg-transparent"
                                     onClick={() => setShowAiPrompt(!showAiPrompt)}
                                   >
                                     ✨ Generate with AI
                                   </Button>
                                </div>
                              </div>
                              {showAiPrompt && (
                                <div className="mb-2 p-3 bg-purple-50 rounded-md border border-purple-100">
                                  <div className="flex gap-2">
                                    <Input 
                                      placeholder="Keywords..." 
                                      value={aiKeywords} 
                                      onChange={(e) => setAiKeywords(e.target.value)} 
                                      className="bg-white"
                                    />
                                    <Button type="button" size="sm" onClick={handleGenerateAiContent} disabled={isGeneratingCopy}>
                                      {isGeneratingCopy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Generate'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                              <Textarea {...field} className="min-h-[150px]" placeholder="Enter product description..." />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Category Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Category</h3>
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-6 space-y-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
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
                          name="product_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Type (Optional)</FormLabel>
                              <Input {...field} placeholder="e.g. Beauty" />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Inventory Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Inventory</h3>
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-6 grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="stock"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="qikink_sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU (Optional)</FormLabel>
                              <Input {...field} placeholder="e.g. UGG-BB-PUR-06" />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
