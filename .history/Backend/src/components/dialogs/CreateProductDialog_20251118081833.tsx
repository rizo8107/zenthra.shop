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
import { CreateProductData } from '@/types/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
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
  });


  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  type ColorRow = { name: string; hex: string; value: string; inStock?: boolean };
  type SizeRow = { id: string; name?: string; value: string; unit?: string; useBasePrice?: boolean; sizePrice?: number; inStock?: boolean };
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
        form.setValue('specifications', result.specifications, { shouldDirty: true });
        newHighlighted.add('specifications');
      }
      if (result.tags) {
        form.setValue('tags', result.tags, { shouldDirty: true });
        newHighlighted.add('tags');
      }
      if (result.care_instructions) {
        form.setValue('care_instructions', result.care_instructions, { shouldDirty: true });
        newHighlighted.add('care_instructions');
      }
      if (result.usage_guidelines) {
        form.setValue('usage_guidelines', result.usage_guidelines, { shouldDirty: true });
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

  // Fetch available products for "Buy Any X" combo selection
  useEffect(() => {
    const fetchProducts = async () => {
      if (!open) return; // Only fetch when dialog is open
      
      setLoadingProducts(true);
      try {
        let records;
        try {
          // Primary attempt: only active products, sorted by name
          records = await pb.collection('products').getList(1, 100, {
            filter: 'status = "active"',
            sort: 'name',
          });
        } catch (error: any) {
          // If the filtered query fails (e.g. validation/400), retry without filter
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
        toast.error('Failed to load products for combo selection');
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
      // Clean up video state
      setShowMediaLibrary(false);
      onOpenChange(false);
      toast.success('Product created successfully');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[95vh] max-w-[96vw] sm:max-w-[96vw] xl:max-w-[96vw] overflow-hidden flex flex-col bg-background">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-semibold">Create Product</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Add a new product to your store</p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-2 mb-6 bg-muted shadow-sm rounded-lg p-1">
                <TabsTrigger value="basic" className="rounded-md data-[state=active]:bg-purple-600 data-[state=active]:text-white">Overview</TabsTrigger>
                <TabsTrigger value="variants" className="rounded-md data-[state=active]:bg-green-600 data-[state=active]:text-white">Variants & Combos</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto px-2 py-1">
                <TabsContent value="basic" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)] gap-8">
                    {/* Left column: General info + pricing + status */}
                    <div className="space-y-6">
                      <Card className="shadow-sm border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b">
                          <CardTitle className="text-base font-semibold">General Information</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">Basic product details</p>
                        </CardHeader>
                        <CardContent className="space-y-5 p-6">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <Input 
                                  {...field} 
                                  placeholder="Product name" 
                                  className={highlightedFields.has('name') ? 'ring-2 ring-purple-500 animate-pulse' : ''}
                                />
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
                                  className={`resize-none ${highlightedFields.has('description') ? 'ring-2 ring-purple-500 animate-pulse' : ''}`}
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                </div>
                                <FormLabel className="text-base font-semibold text-purple-900">AI Assistant</FormLabel>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={showAiPrompt ? "secondary" : "default"}
                                onClick={() => setShowAiPrompt(!showAiPrompt)}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                              >
                                {showAiPrompt ? 'Hide Prompt' : '✨ Open AI Prompt'}
                              </Button>
                            </div>
                            
                            {showAiPrompt && (
                              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <Input
                                  placeholder="Enter keywords, mood, or product details (e.g., 'organic lavender soap, calming, luxury')"
                                  value={aiKeywords}
                                  onChange={(e) => setAiKeywords(e.target.value)}
                                  className="border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  onClick={handleGenerateAiContent}
                                  disabled={isGeneratingCopy}
                                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                >
                                  {isGeneratingCopy ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Generating…
                                    </>
                                  ) : (
                                    '✨ Generate with AI'
                                  )}
                                </Button>
                                <FormDescription className="text-purple-700">
                                  AI will suggest name, description, features, specifications, tags, care instructions, and usage guidelines.
                                </FormDescription>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b">
                          <CardTitle className="text-base font-semibold">Pricing & Stock</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">Set pricing and inventory</p>
                        </CardHeader>
                        <CardContent className="space-y-5 p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.01"
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                      placeholder="0.00"
                                    />
                                  </FormControl>
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
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.01"
                                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                      placeholder="0.00"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
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
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="stock"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stock</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="0"
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="Available quantity"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b">
                          <CardTitle className="text-base font-semibold">Product Status</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">Configure product visibility and badges</p>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
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

                      {/* Advanced Fields - merged from Advanced tab */}
                      <Card className="shadow-sm border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b">
                          <CardTitle className="text-base font-semibold">Product Details</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">Features, tags, specifications, and care instructions</p>
                        </CardHeader>
                        <CardContent className="space-y-5 p-6">
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
                                  className={highlightedFields.has('features') ? 'ring-2 ring-purple-500 animate-pulse' : ''}
                                />
                                <FormDescription>
                                  Enter features as comma-separated values or a JSON array of strings
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

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
                                  className={highlightedFields.has('tags') ? 'ring-2 ring-purple-500 animate-pulse' : ''}
                                />
                                <FormDescription>
                                  Enter tags as comma-separated values or a JSON array of strings
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="specifications"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Specifications</FormLabel>
                                <Textarea
                                  {...field}
                                  className={`min-h-[120px] ${highlightedFields.has('specifications') ? 'ring-2 ring-purple-500 animate-pulse' : ''}`}
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

                          <FormField
                            control={form.control}
                            name="care_instructions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Care Instructions</FormLabel>
                                <Textarea
                                  {...field}
                                  className={`min-h-[120px] ${highlightedFields.has('care_instructions') ? 'ring-2 ring-purple-500 animate-pulse' : ''}`}
                                  placeholder='Enter as JSON object or use the format described below'
                                  onBlur={(e) => handleJsonFieldBlur(e, false)}
                                />
                                <FormDescription>
                                  Enter as JSON object with "cleaning" and "storage" arrays
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
                                  className={`min-h-[120px] ${highlightedFields.has('usage_guidelines') ? 'ring-2 ring-purple-500 animate-pulse' : ''}`}
                                  placeholder='Enter as JSON object or use the format described below'
                                  onBlur={(e) => handleJsonFieldBlur(e, false)}
                                />
                                <FormDescription>
                                  Enter as JSON object with "recommended_use" and "pro_tips" arrays
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right column: Upload images, similar to reference UI */}
                    <div className="space-y-6">
                      <Card className="shadow-sm border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden sticky top-4">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b">
                          <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <ImageIcon className="h-5 w-5" />
                            Product Images
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-1">Upload product photos</p>
                        </CardHeader>
                        <CardContent className="p-6">
                          {(isCompressing || activeCompressionProgress !== null) && (
                            <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>
                                Optimizing images
                                {activeCompressionProgress !== null ? ` ${activeCompressionProgress}%` : ''}
                              </span>
                              {activeCompressionProgress !== null && (
                                <Progress value={activeCompressionProgress} className="h-2 flex-1 max-w-[160px]" />
                              )}
                            </div>
                          )}

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
                                  disabled={isCompressing}
                                />
                              </label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="variants" className="space-y-4 mt-0">
                  {/* AI Variant Generator */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border-2 border-green-200 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-base font-semibold text-green-900">AI Variant Generator</div>
                          <div className="text-xs text-green-700">Tell AI what variants you need and it will create them</div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={showVariantPrompt ? "secondary" : "default"}
                        onClick={() => setShowVariantPrompt(!showVariantPrompt)}
                        className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                      >
                        {showVariantPrompt ? 'Hide Prompt' : '🎨 Open Variant Prompt'}
                      </Button>
                    </div>
                    
                    {showVariantPrompt && (
                      <div className="space-y-2 mt-3 animate-in slide-in-from-top-2 duration-300">
                        <Textarea
                          placeholder="Describe what variants you want (e.g., 'Add 3 sizes: 100ml, 250ml, 500ml' or 'Create 5 color variants for lavender soap' or 'Add combo deals: Buy 2 Get 1, Family Pack')"
                          value={variantRequest}
                          onChange={(e) => setVariantRequest(e.target.value)}
                          className="border-green-300 focus:border-green-500 focus:ring-green-500 min-h-[100px]"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleGenerateVariants}
                            disabled={isGeneratingVariants || !variantRequest.trim()}
                            className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                          >
                            {isGeneratingVariants ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating…
                              </>
                            ) : (
                              '✨ Generate Variants'
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-green-700">
                          <strong>Examples:</strong> "3 sizes in ml", "5 pastel colors", "Buy 2 Get 1 and Family Pack combos", "Small, Medium, Large sizes"
                        </p>
                      </div>
                    )}
                  </div>

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
                              disabled={isCompressing}
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
                              disabled={!selectedVariantSizeId || isCompressing}
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

                <TabsContent value="variants" className="space-y-4 mt-0">

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

                  <div className="space-y-6">
                    {/* 🟩 Card 1 — Variants (Interactive) */}
                    <Card className="shadow-sm border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b">
                        <CardTitle className="text-base font-semibold">Variants (Interactive)</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Add sizes and variant-based combos for this product.</p>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-3">
                          <FormLabel className="text-sm font-medium">Sizes</FormLabel>
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
                        <div className="space-y-3">
                          <FormLabel className="text-sm font-medium">Combos</FormLabel>
                          <div className="grid grid-cols-3 gap-3">
                            <Button type="button" variant="outline" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'Buy 1 Get 1', value:'bogo', type:'bogo'}])}>Add BOGO</Button>
                            <Button type="button" variant="outline" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'2-Pack', value:'2-pack', type:'bundle', items:2}])}>Add 2‑Pack</Button>
                            <Button type="button" variant="outline" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'3-Pack', value:'3-pack', type:'bundle', items:3}])}>Add 3‑Pack</Button>
                            <Button type="button" variant="outline" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'4-Pack', value:'4-pack', type:'bundle', items:4}])}>Add 4‑Pack</Button>
                            <Button type="button" variant="secondary" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'',value:'',type:'bundle'}])}>Add Custom</Button>
                            <Button type="button" variant="outline" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'Buy Any 2', value:'buy-any-2', type:'buy_any_x', requiredQuantity: 2, allowDuplicates: true, availableProducts: []}])}>Buy Any 2</Button>
                            <Button type="button" variant="outline" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'Buy Any 3', value:'buy-any-3', type:'buy_any_x', requiredQuantity: 3, allowDuplicates: true, availableProducts: []}])}>Buy Any 3</Button>
                            <Button type="button" variant="outline" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'2-Pack', value:'2-pack-10off', type:'bundle', items:2, discountType:'percent', discountValue:10}])}>2‑Pack −10%</Button>
                            <Button type="button" variant="outline" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'3-Pack', value:'3-pack-15off', type:'bundle', items:3, discountType:'percent', discountValue:15}])}>3‑Pack −15%</Button>
                            <Button type="button" variant="outline" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-shadow" onClick={()=>setComboRows(prev => [...prev,{ id: generateRowId(), name:'4-Pack', value:'4-pack-20off', type:'bundle', items:4, discountType:'percent', discountValue:20}])}>4‑Pack −20%</Button>
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
                                      <SelectItem value="buy_any_x">buy any x</SelectItem>
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
                                    disabled={isCompressing}
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
                                
                                {/* Product Selection for "Buy Any X" combos */}
                                {cb.type === 'buy_any_x' && (
                                  <div className="col-span-12 space-y-3 mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-medium text-blue-900">Available Products for Selection</h4>
                                      <div className="text-xs text-blue-700">
                                        Required: {cb.requiredQuantity || cb.items || 2} items
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                      {loadingProducts ? (
                                        <div className="col-span-full text-center py-4 text-sm text-gray-500">
                                          Loading products...
                                        </div>
                                      ) : availableProducts.length === 0 ? (
                                        <div className="col-span-full text-center py-4 text-sm text-gray-500">
                                          No products available
                                        </div>
                                      ) : (
                                        availableProducts.map((product) => (
                                          <label key={product.id} className="flex items-center space-x-2 p-2 rounded border hover:bg-blue-100 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={(cb.availableProducts || []).includes(product.id)}
                                              onChange={(e) => {
                                                const targetId = cb.id;
                                                const productId = product.id;
                                                const isChecked = e.target.checked;
                                                
                                                setComboRows(prev => prev.map(row => {
                                                  if (row.id === targetId) {
                                                    const currentProducts = row.availableProducts || [];
                                                    const updatedProducts = isChecked
                                                      ? [...currentProducts, productId]
                                                      : currentProducts.filter(id => id !== productId);
                                                    return { ...row, availableProducts: updatedProducts };
                                                  }
                                                  return row;
                                                }));
                                              }}
                                              className="rounded border-gray-300"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-medium text-gray-900 truncate">
                                                {product.name}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                ₹{product.price.toFixed(2)}
                                              </div>
                                            </div>
                                          </label>
                                        ))
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-4 text-xs">
                                      <label className="flex items-center space-x-1">
                                        <input
                                          type="checkbox"
                                          checked={cb.allowDuplicates !== false}
                                          onChange={(e) => {
                                            const targetId = cb.id;
                                            setComboRows(prev => prev.map(row => 
                                              row.id === targetId ? { ...row, allowDuplicates: e.target.checked } : row
                                            ));
                                          }}
                                          className="rounded border-gray-300"
                                        />
                                        <span className="text-blue-700">Allow duplicate selections</span>
                                      </label>
                                      
                                      <div className="text-blue-600">
                                        Selected: {(cb.availableProducts || []).length} products
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card 3 — Tags & Available Sizes */}
                    <Card className="shadow-sm border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b">
                        <CardTitle className="text-base font-semibold">Tags & Available Sizes</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Product tags and size options</p>
                      </CardHeader>
                      <CardContent className="p-6 space-y-5">
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
                              <FormDescription className="text-gray-500">
                                Enter tags as comma-separated values or a JSON array of strings
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
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
                                <FormDescription className="text-gray-500">
                                  Enter sizes as comma-separated values or a JSON array of strings
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

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

                    {/* Video Section - Media Library */}
                    <Card className="shadow-sm border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b">
                        <CardTitle className="text-base font-semibold">Product Video</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Select or upload a video from media library</p>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        {/* Current Video URL Display */}
                        <FormField
                          control={form.control}
                          name="videoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Selected Video</FormLabel>
                              <div className="flex gap-2">
                                <Input {...field} placeholder="No video selected" readOnly className="flex-1" />
                                <Button
                                  type="button"
                                  onClick={async () => {
                                    setShowMediaLibrary(true);
                                    if (existingVideos.length === 0) {
                                      setLoadingVideos(true);
                                      try {
                                        const { pb } = await import('@/lib/pocketbase');
                                        const records = await pb.collection('content').getFullList({
                                          sort: '-created'
                                        });
                                        // Filter records that have Videos field (capitalized)
                                        const videosOnly = records.filter((r: any) => r.Videos);
                                        setExistingVideos(videosOnly.map((r: any) => ({id: r.id, videos: r.Videos})) as Array<{id: string, videos: string}>);
                                      } catch (error) {
                                        console.error('Error fetching videos:', error);
                                      } finally {
                                        setLoadingVideos(false);
                                      }
                                    }
                                  }}
                                  variant="outline"
                                  className="shrink-0"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Media Library
                                </Button>
                              </div>
                              <FormDescription className="text-xs text-gray-500">
                                Click "Media Library" to select or upload a video
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="videoDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Video Description</FormLabel>
                              <Textarea {...field} className="min-h-[100px]" placeholder="Describe the video" />
                              <FormDescription className="text-xs text-gray-500">
                                Optional description for the video
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                </div>
              </Tabs>

              <Alert className="mt-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 rounded-lg">
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Tip:</strong> For fields like Features, Colors, and Tags, you can enter simple comma-separated values and they will be automatically converted to the required JSON format.
                </AlertDescription>
              </Alert>

              <DialogFooter className="mt-6 pt-6 border-t bg-background sticky bottom-0 flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-6">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Product'
                  )}
                </Button>
              </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Media Library Modal */}
      <Dialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Media Library - Videos</DialogTitle>
            <p className="text-sm text-muted-foreground">Select an existing video or upload a new one</p>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4">
            {loadingVideos ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-600">Loading videos...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Upload New Video */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    id="media-library-upload"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingVideo(true);
                        try {
                          const { pb } = await import('@/lib/pocketbase');
                          const formData = new FormData();
                          formData.append('Videos', file);
                          const record = await pb.collection('content').create(formData);
                          const videoUrl = `https://backend.karigaistore.in/api/files/content/${record.id}/${record.Videos}`;
                          form.setValue('videoUrl', videoUrl);
                          setShowMediaLibrary(false);
                          toast.success('Video uploaded successfully');
                          // Refresh the list
                          const records = await pb.collection('content').getFullList({
                            sort: '-created'
                          });
                          const videosOnly = records.filter((r: any) => r.Videos);
                          setExistingVideos(videosOnly.map((r: any) => ({id: r.id, videos: r.Videos})) as Array<{id: string, videos: string}>);
                        } catch (error) {
                          console.error('Error uploading video:', error);
                          toast.error('Failed to upload video');
                        } finally {
                          setUploadingVideo(false);
                        }
                      }
                    }}
                    disabled={uploadingVideo}
                  />
                  <label htmlFor="media-library-upload" className={`cursor-pointer flex flex-col items-center gap-3 ${uploadingVideo ? 'opacity-50' : ''}`}>
                    {uploadingVideo ? (
                      <>
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
                        <p className="text-sm font-medium text-gray-700">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 text-gray-400" />
                        <div className="text-sm font-medium text-gray-700">Click to upload new video</div>
                        <div className="text-xs text-gray-500">MP4, WebM, or OGG (max 100MB)</div>
                      </>
                    )}
                  </label>
                </div>

                {/* Existing Videos Grid */}
                {existingVideos.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Existing Videos</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {existingVideos.map((content) => {
                        const videoUrl = `https://backend.karigaistore.in/api/files/content/${content.id}/${content.videos}`;
                        return (
                          <button
                            key={content.id}
                            type="button"
                            onClick={() => {
                              form.setValue('videoUrl', videoUrl);
                              setShowMediaLibrary(false);
                              toast.success('Video selected');
                            }}
                            className="relative group rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-colors overflow-hidden aspect-video bg-black"
                          >
                            <video
                              src={videoUrl}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                              <p className="text-xs text-white truncate font-medium">{content.videos}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
} 
