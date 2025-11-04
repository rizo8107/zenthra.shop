import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { pb, getImageUrl } from '@/lib/pocketbase';

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
  const [activeTab, setActiveTab] = useState('basic');
  
  // Additional product fields
  const [material, setMaterial] = useState(product?.material || '');
  const [dimensions, setDimensions] = useState(product?.dimensions || '');
  const [features, setFeatures] = useState<string>(
    Array.isArray(product?.features)
      ? (product?.features as unknown as string[]).join(', ')
      : typeof product?.features === 'string'
        ? (() => { try { const a = JSON.parse(product!.features as unknown as string); return Array.isArray(a) ? a.join(', ') : (product!.features as unknown as string); } catch { return (product?.features as unknown as string) || ''; } })()
        : product?.features
          ? JSON.stringify(product?.features)
          : ''
  );
  const [variants, setVariants] = useState<string>(
    typeof product?.variants === 'string' ? product?.variants : product?.variants ? JSON.stringify(product?.variants) : ''
  );
  const [colors, setColors] = useState<string>(
    Array.isArray(product?.colors)
      ? (product?.colors as unknown as string[]).join(', ')
      : typeof product?.colors === 'string'
        ? product!.colors as unknown as string
        : product?.colors ? JSON.stringify(product?.colors) : ''
  );
  const [tags, setTags] = useState<string>(
    Array.isArray(product?.tags)
      ? (product?.tags as unknown as string[]).join(', ')
      : typeof product?.tags === 'string'
        ? (() => { try { const a = JSON.parse(product!.tags as unknown as string); return Array.isArray(a) ? a.join(', ') : (product!.tags as unknown as string); } catch { return (product?.tags as unknown as string) || ''; } })()
        : product?.tags ? JSON.stringify(product?.tags) : ''
  );
  const [care, setCare] = useState<string>(
    Array.isArray(product?.care)
      ? (product?.care as unknown as string[]).join(', ')
      : typeof product?.care === 'string'
        ? (() => { try { const a = JSON.parse(product!.care as unknown as string); return Array.isArray(a) ? a.join(', ') : (product!.care as unknown as string); } catch { return (product?.care as unknown as string) || ''; } })()
        : product?.care ? JSON.stringify(product?.care) : ''
  );
  const [specifications, setSpecifications] = useState<string>(
    typeof product?.specifications === 'string' ? product?.specifications : product?.specifications ? JSON.stringify(product?.specifications, null, 2) : ''
  );
  const [careInstructions, setCareInstructions] = useState<string>(
    typeof product?.care_instructions === 'string' ? product?.care_instructions : product?.care_instructions ? JSON.stringify(product?.care_instructions, null, 2) : ''
  );
  const [usageGuidelines, setUsageGuidelines] = useState<string>(
    typeof product?.usage_guidelines === 'string' ? product?.usage_guidelines : product?.usage_guidelines ? JSON.stringify(product?.usage_guidelines, null, 2) : ''
  );
  const [review, setReview] = useState(product?.review ? String(product.review) : '0');
  const [bestseller, setBestseller] = useState(product?.bestseller || false);
  const [isNew, setIsNew] = useState(product?.new || false);
  const [inStock, setInStock] = useState(product?.inStock !== undefined ? product.inStock : true);
  
  // Image handling
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  // Variant images (sizes)
  const [selectedVariantSize, setSelectedVariantSize] = useState<string>('');
  const [variantFilesBySize, setVariantFilesBySize] = useState<Record<string, File[]>>({});
  const [variantPreviewsBySize, setVariantPreviewsBySize] = useState<Record<string, string[]>>({});
  const [variantFilenamesBySize, setVariantFilenamesBySize] = useState<Record<string, string[]>>({});
  const [variantExistingBySize, setVariantExistingBySize] = useState<Record<string, string[]>>({});
  // Combo images
  const [selectedComboKey, setSelectedComboKey] = useState<string>('');
  const [comboFilesByKey, setComboFilesByKey] = useState<Record<string, File[]>>({});
  const [comboPreviewsByKey, setComboPreviewsByKey] = useState<Record<string, string[]>>({});
  const [comboFilenamesByKey, setComboFilenamesByKey] = useState<Record<string, string[]>>({});
  const [comboExistingByKey, setComboExistingByKey] = useState<Record<string, string[]>>({});
  
  // Interactive rows for variants
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  type ColorRow = { name: string; hex: string; value: string; inStock?: boolean };
  type SizeRow = { name?: string; value: string; unit?: string; useBasePrice?: boolean; sizePrice?: number; inStock?: boolean };
  type ComboRow = { name: string; value: string; type?: 'bogo'|'bundle'|'custom'; items?: number; priceOverride?: number; description?: string; discountType?: 'amount'|'percent'; discountValue?: number };
  const [colorRows, setColorRows] = useState<ColorRow[]>([]);
  const [sizeRows, setSizeRows] = useState<SizeRow[]>([]);
  const [comboRows, setComboRows] = useState<ComboRow[]>([]);

  // Friendly editors state
  const [careList, setCareList] = useState<string[]>([]);
  const [cleaningList, setCleaningList] = useState<string[]>([]);
  const [storageList, setStorageList] = useState<string[]>([]);
  const [recommendedList, setRecommendedList] = useState<string[]>([]);
  const [proTipsList, setProTipsList] = useState<string[]>([]);
  const [specsRows, setSpecsRows] = useState<{ key: string; value: string }[]>([]);

  const buildVariantsFromRows = () => {
    const result: any = {};
    if (colorRows.length) result.colors = colorRows.map(c => ({ name: c.name, value: c.value || slugify(c.name || ''), hex: c.hex, inStock: c.inStock !== false }));
    if (sizeRows.length) result.sizes = sizeRows.map(s => ({
      name: s.name || (s.unit ? `${s.value} ${s.unit}` : s.value),
      value: String(s.value),
      unit: s.unit,
      inStock: s.inStock !== false,
      priceOverride: s.useBasePrice ? undefined : (typeof s.sizePrice === 'number' ? s.sizePrice : undefined),
      images: [
        ...((variantExistingBySize[String(s.value)] || [])),
        ...((variantFilenamesBySize[String(s.value)] || [])),
      ],
    }));
    if (comboRows.length) result.combos = comboRows.map(cb => ({
      name: cb.name, value: cb.value || slugify(cb.name), type: cb.type || 'bundle', items: cb.items, priceOverride: cb.priceOverride, description: cb.description, discountType: cb.discountType, discountValue: cb.discountValue,
      images: [
        ...((comboExistingByKey[String(cb.value || slugify(cb.name))] || [])),
        ...((comboFilenamesByKey[String(cb.value || slugify(cb.name))] || [])),
      ],
    }));
    setVariants(Object.keys(result).length ? JSON.stringify(result) : '');
  };
  useEffect(() => { buildVariantsFromRows(); }, [colorRows, sizeRows, comboRows, variantExistingBySize, variantFilenamesBySize, comboExistingByKey, comboFilenamesByKey]);

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price ? String(product.price) : '');
      setStock(product.stock ? String(product.stock) : '');
      setCategory(product.category || '');
      setStatus(product.status as 'active' | 'inactive' || 'active');
      
      // Set additional fields
      setMaterial(product.material || '');
      setDimensions(product.dimensions || '');
      // features/tags/care already initialized in state declaration to friendly CSV or stringified JSON
      setFeatures(prev => prev); // no-op keep computed
      setTags(prev => prev);
      setCare(prev => prev);
      setSpecifications(prev => prev);
      setCareInstructions(prev => prev);
      setUsageGuidelines(prev => prev);

      // Handle variants -> populate interactive rows
      try {
        const v = typeof product.variants === 'string' ? JSON.parse(product.variants) : (product.variants || {});
        if (v && typeof v === 'object') {
          setColorRows(Array.isArray(v.colors) ? v.colors.map((col: any) => ({ name: col.name || '', hex: col.hex || '#ffffff', value: col.value || slugify(col.name || '') })) : []);
          setSizeRows(Array.isArray(v.sizes) ? v.sizes.map((sz: any) => ({ name: sz.name, value: String(sz.value ?? ''), unit: sz.unit, useBasePrice: typeof sz.priceOverride !== 'number', sizePrice: typeof sz.priceOverride === 'number' ? sz.priceOverride : undefined })) : []);
          setComboRows(Array.isArray(v.combos) ? v.combos.map((cb: any) => ({ name: cb.name || '', value: cb.value || slugify(cb.name || ''), type: cb.type || 'bundle', items: cb.items, priceOverride: cb.priceOverride, description: cb.description, discountType: cb.discountType, discountValue: cb.discountValue })) : []);
          const exSize: Record<string, string[]> = {};
          if (Array.isArray(v.sizes)) {
            v.sizes.forEach((sz: any) => {
              const k = String(sz.value ?? '');
              if (k) exSize[k] = Array.isArray(sz.images) ? sz.images.map(String) : [];
            });
          }
          setVariantExistingBySize(exSize);
          const exCombo: Record<string, string[]> = {};
          if (Array.isArray(v.combos)) {
            v.combos.forEach((cb: any) => {
              const k = String(cb.value || slugify(cb.name || ''));
              if (k) exCombo[k] = Array.isArray(cb.images) ? cb.images.map(String) : [];
            });
          }
          setComboExistingByKey(exCombo);
          setVariants(JSON.stringify(v));
        }
      } catch {
        // keep as-is
      }
    
      // Handle existing images
      if (product.images && Array.isArray(product.images)) {
        setExistingImages(product.images);
      } else if (product.image) {
        setExistingImages([product.image]);
      } else {
        setExistingImages([]);
      }

      // Parse Care (array), Detailed Care (cleaning/storage), Usage Guidelines (recommended_use/pro_tips), Specifications (object)
      try {
        // Care as array
        const rawCare = product.care as unknown as any;
        let parsedCare: string[] = [];
        if (Array.isArray(rawCare)) parsedCare = rawCare.map(String);
        else if (typeof rawCare === 'string') {
          try { const j = JSON.parse(rawCare); parsedCare = Array.isArray(j) ? j.map(String) : (rawCare ? rawCare.split(',').map(s=>s.trim()).filter(Boolean) : []); } catch { parsedCare = rawCare ? rawCare.split(',').map(s=>s.trim()).filter(Boolean) : []; }
        }
        setCareList(parsedCare);

        // Detailed care
        const rawDetail = product.care_instructions as unknown as any;
        let cleaning: string[] = []; let storage: string[] = [];
        if (rawDetail) {
          try {
            const obj = typeof rawDetail === 'string' ? JSON.parse(rawDetail) : rawDetail;
            if (obj && typeof obj === 'object') {
              if (Array.isArray(obj.cleaning)) cleaning = obj.cleaning.map(String);
              if (Array.isArray(obj.storage)) storage = obj.storage.map(String);
            }
          } catch {}
        }
        setCleaningList(cleaning);
        setStorageList(storage);

        // Usage guidelines
        const rawUsage = product.usage_guidelines as unknown as any;
        let rec: string[] = []; let tips: string[] = [];
        if (rawUsage) {
          try {
            const obj = typeof rawUsage === 'string' ? JSON.parse(rawUsage) : rawUsage;
            if (obj && typeof obj === 'object') {
              if (Array.isArray(obj.recommended_use)) rec = obj.recommended_use.map(String);
              if (Array.isArray(obj.pro_tips)) tips = obj.pro_tips.map(String);
            }
          } catch {}
        }
        setRecommendedList(rec);
        setProTipsList(tips);

        // Specifications as key-value rows
        const rawSpecs = product.specifications as unknown as any;
        let rows: { key: string; value: string }[] = [];
        if (rawSpecs) {
          try {
            const obj = typeof rawSpecs === 'string' ? JSON.parse(rawSpecs) : rawSpecs;
            if (obj && typeof obj === 'object') {
              rows = Object.entries(obj).map(([k, v]) => ({ key: String(k), value: typeof v === 'string' ? v : JSON.stringify(v) }));
            }
          } catch {}
        }
        setSpecsRows(rows);
      } catch {}
    }
  }, [product]);

  // Sync friendly editors back to string fields for backend
  useEffect(() => { setCare(careList.length ? JSON.stringify(careList) : ''); }, [careList]);
  useEffect(() => {
    const has = cleaningList.length || storageList.length;
    setCareInstructions(has ? JSON.stringify({ cleaning: cleaningList, storage: storageList }) : '');
  }, [cleaningList, storageList]);
  useEffect(() => {
    const has = recommendedList.length || proTipsList.length;
    setUsageGuidelines(has ? JSON.stringify({ recommended_use: recommendedList, pro_tips: proTipsList }) : '');
  }, [recommendedList, proTipsList]);
  useEffect(() => {
    const obj: Record<string, string> = {};
    specsRows.forEach(r => { if (r.key.trim()) obj[r.key.trim()] = r.value; });
    setSpecifications(Object.keys(obj).length ? JSON.stringify(obj) : '');
  }, [specsRows]);

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

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // Function to get the full image URL for an image filename
  const getFullImageUrl = (filename: string) => {
    if (!product || !product.id) return '';
    if (filename.startsWith('http')) return filename; // Already a full URL
    
    return getImageUrl('products', product.id, filename);
  };

  // Function to convert comma-separated text to JSON array
  const formatJsonField = (value: string | number | boolean | null | undefined, isArray = true) => {
    // Handle null, undefined, or non-string values
    if (value === null || value === undefined) return '';
    
    // Convert to string if it's not already a string
    const strValue = typeof value === 'string' ? value : String(value);
    
    // Check for empty string after trimming
    if (!strValue.trim()) return '';
    
    try {
      // If it's already a string representation of JSON, just return it
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return value;
        } catch (e) {
          // Not valid JSON, continue with conversion
        }
      }
      
      // Convert from comma-separated text
      if (isArray) {
        const items = strValue.split(',').map(item => item.trim());
        return JSON.stringify(items);
      } else if (strValue.includes(',')) {
        // For colors, create an object with available and primary
        const colors = strValue.split(',').map(color => color.trim());
        if (colors.length > 0) {
          return JSON.stringify({
            available: colors,
            primary: colors[0]
          });
        }
      }
      
      // Single value, wrap in array if it's supposed to be an array
      return isArray ? JSON.stringify([strValue.trim()]) : JSON.stringify({ value: strValue.trim() });
    } catch (e) {
      console.error('Error formatting JSON field:', e);
      return isArray ? '[]' : '{}';
    }
  };

  const handleJsonFieldBlur = (e: React.FocusEvent<HTMLTextAreaElement>, isArray = true, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const { value } = e.target;
    const formattedValue = formatJsonField(value, isArray);
    
    if (formattedValue && formattedValue !== value) {
      setter(formattedValue);
    }
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

      // Format JSON fields before submission
      const formattedFeatures = features ? formatJsonField(features, true) : undefined;
      const formattedVariants = variants ? formatJsonField(variants, false) : undefined;
      const formattedColors = colors ? formatJsonField(colors, false) : undefined;
      const formattedTags = tags ? formatJsonField(tags, true) : undefined;
      const formattedCare = care ? formatJsonField(care, true) : undefined;
      const formattedSpecifications = specifications ? formatJsonField(specifications, false) : undefined;
      const formattedCareInstructions = careInstructions ? formatJsonField(careInstructions, false) : undefined;
      const formattedUsageGuidelines = usageGuidelines ? formatJsonField(usageGuidelines, false) : undefined;

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
        features: formattedFeatures,
        variants: formattedVariants,
        colors: formattedColors,
        tags: formattedTags,
        care: formattedCare,
        specifications: formattedSpecifications,
        care_instructions: formattedCareInstructions,
        usage_guidelines: formattedUsageGuidelines,
        review: review ? Number(review) : undefined,
        bestseller,
        new: isNew,
        inStock,
      };

      // Handle images
      if (existingImages.length > 0) {
        if (existingImages.length === 1) {
          updateData.image = existingImages[0];
        } else {
          updateData.images = existingImages;
        }
      } else {
        // Clear images if none are left
        updateData.image = '';
        updateData.images = [];
      }

      const hasVariantFiles = Object.values(variantFilesBySize).some(arr => arr && arr.length);
      const hasComboFiles = Object.values(comboFilesByKey).some(arr => arr && arr.length);
      const needFormData = uploadedImages.length > 0 || hasVariantFiles || hasComboFiles;

      if (needFormData) {
        const fd = new FormData();
        Object.entries(updateData).forEach(([k, v]) => {
          if (v === undefined) return;
          if (k === 'variants') return;
          fd.append(k, String(v));
        });
        uploadedImages.forEach(f => fd.append('images', f));
        Object.values(variantFilesBySize).forEach(files => files?.forEach(f => fd.append('images', f)));
        Object.values(comboFilesByKey).forEach(files => files?.forEach(f => fd.append('images', f)));

        const finalVariants: any = {};
        if (colorRows.length) finalVariants.colors = colorRows.map(c => ({ name: c.name, value: c.value || slugify(c.name || ''), hex: c.hex, inStock: c.inStock !== false }));
        if (sizeRows.length) finalVariants.sizes = sizeRows.map(s => ({
          name: s.name || (s.unit ? `${s.value} ${s.unit}` : s.value),
          value: String(s.value),
          unit: s.unit,
          inStock: s.inStock !== false,
          priceOverride: s.useBasePrice ? undefined : (typeof s.sizePrice === 'number' ? s.sizePrice : undefined),
          images: [
            ...((variantExistingBySize[String(s.value)] || [])),
            ...((variantFilenamesBySize[String(s.value)] || [])),
          ],
        }));
        if (comboRows.length) finalVariants.combos = comboRows.map(cb => ({
          name: cb.name, value: cb.value || slugify(cb.name || ''), type: cb.type || 'bundle', items: cb.items, priceOverride: cb.priceOverride, description: cb.description, discountType: cb.discountType, discountValue: cb.discountValue,
          images: [
            ...((comboExistingByKey[String(cb.value || slugify(cb.name))] || [])),
            ...((comboFilenamesByKey[String(cb.value || slugify(cb.name))] || [])),
          ],
        }));
        fd.set('variants', JSON.stringify(finalVariants));

        await onSubmit({ id: product.id, data: fd as unknown as UpdateProductData });
      } else {
        await onSubmit({ id: product.id, data: updateData });
      }
      
      onOpenChange(false);
      toast.success('Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers for variant images (sizes)
  const handleVariantImageUpload = (sizeKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const key = String(sizeKey || '').trim();
    if (!key || !e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setVariantFilesBySize(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles] }));
    const previews = newFiles.map(f => URL.createObjectURL(f));
    setVariantPreviewsBySize(prev => ({ ...prev, [key]: [...(prev[key] || []), ...previews] }));
    setVariantFilenamesBySize(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles.map(f => f.name)] }));
  };
  const removeVariantNew = (sizeKey: string, index: number) => {
    setVariantFilesBySize(prev => ({ ...prev, [sizeKey]: (prev[sizeKey] || []).filter((_, i) => i !== index) }));
    const url = (variantPreviewsBySize[sizeKey] || [])[index];
    if (url) URL.revokeObjectURL(url);
    setVariantPreviewsBySize(prev => ({ ...prev, [sizeKey]: (prev[sizeKey] || []).filter((_, i) => i !== index) }));
    setVariantFilenamesBySize(prev => ({ ...prev, [sizeKey]: (prev[sizeKey] || []).filter((_, i) => i !== index) }));
  };
  const removeVariantExisting = (sizeKey: string, index: number) => {
    setVariantExistingBySize(prev => ({ ...prev, [sizeKey]: (prev[sizeKey] || []).filter((_, i) => i !== index) }));
  };
  // Handlers for combo images
  const handleComboImageUpload = (comboKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const key = String(comboKey || '').trim();
    if (!key || !e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setComboFilesByKey(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles] }));
    const previews = newFiles.map(f => URL.createObjectURL(f));
    setComboPreviewsByKey(prev => ({ ...prev, [key]: [...(prev[key] || []), ...previews] }));
    setComboFilenamesByKey(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles.map(f => f.name)] }));
  };
  const removeComboNew = (key: string, index: number) => {
    setComboFilesByKey(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
    const url = (comboPreviewsByKey[key] || [])[index];
    if (url) URL.revokeObjectURL(url);
    setComboPreviewsByKey(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
    setComboFilenamesByKey(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
  };
  const removeComboExisting = (key: string, index: number) => {
    setComboExistingByKey(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
  };

  useEffect(() => {
    if (!selectedVariantSize && sizeRows.length) setSelectedVariantSize(String(sizeRows[0].value || ''));
  }, [sizeRows, selectedVariantSize]);
  useEffect(() => {
    if (!selectedComboKey && comboRows.length) setSelectedComboKey(String(comboRows[0].value || slugify(comboRows[0].name || '')));
  }, [comboRows, selectedComboKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-dvh max-w-full sm:max-w-5xl xl:max-w-7xl sm:h-[90vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product information and details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col min-h-0">
            <TabsList className="grid grid-cols-6 mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="care">Care & Usage</TabsTrigger>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-1 min-h-0 h-full">
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Product name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Product description"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="Available quantity"
                      type="number"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Product category"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as 'active' | 'inactive')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Product Status</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="inStock">In Stock</Label>
                      </div>
                      <Switch
                        id="inStock"
                        checked={inStock}
                        onCheckedChange={setInStock}
                      />
                    </div>
                    
                    <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="isNew">New</Label>
                      </div>
                      <Switch
                        id="isNew"
                        checked={isNew}
                        onCheckedChange={setIsNew}
                      />
                    </div>
                    
                    <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="bestseller">Bestseller</Label>
                      </div>
                      <Switch
                        id="bestseller"
                        checked={bestseller}
                        onCheckedChange={setBestseller}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="images" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Product Images
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Existing Images */}
                      {existingImages.map((url, index) => (
                        <div key={`existing-${index}`} className="relative group overflow-hidden rounded-md border">
                          <AspectRatio ratio={1 / 1}>
                            <img 
                              src={getFullImageUrl(url)} 
                              alt={`Product image ${index + 1}`} 
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/darkgray/white?text=Image+Not+Found';
                              }}
                            />
                          </AspectRatio>
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                            aria-label={`Remove image ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      {/* New Images */}
                      {imagePreviewUrls.map((url, index) => (
                        <div key={`new-${index}`} className="relative group overflow-hidden rounded-md border">
                          <AspectRatio ratio={1 / 1}>
                            <img 
                              src={url} 
                              alt={`New product image ${index + 1}`} 
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/darkgray/white?text=Image+Not+Found';
                              }}
                            />
                          </AspectRatio>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                            aria-label={`Remove new image ${index + 1}`}
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
                    
                    <Label className="text-xs text-muted-foreground">
                      Upload multiple product images. The first image will be used as the main product image.
                    </Label>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="material">Material</Label>
                    <Input
                      id="material"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="e.g., 100% Cotton Canvas"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dimensions">Dimensions</Label>
                    <Input
                      id="dimensions"
                      value={dimensions}
                      onChange={(e) => setDimensions(e.target.value)}
                      placeholder='e.g., 16"H x 14"W x 4"D'
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">Features</Label>
                  <Textarea
                    id="features"
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                    placeholder='Enter features separated by commas or as JSON array'
                    onBlur={(e) => handleJsonFieldBlur(e, true, setFeatures)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    Enter features as comma-separated values or a JSON array of strings
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>Variants (Interactive)</Label>
                  <div className="space-y-3">
                    {false && (
                      <div className="space-y-2">
                        <Label className="text-sm">Colors</Label>
                        <div className="space-y-2">
                          {colorRows.map((c, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-4">
                                <Input value={c.name} onChange={(e)=>{ const v=[...colorRows]; v[i]={...v[i],name:e.target.value, value: v[i].value || slugify(e.target.value)}; setColorRows(v); }} placeholder="Red" />
                              </div>
                              <div className="col-span-3">
                                <Input type="color" value={c.hex || '#ffffff'} onChange={(e)=>{ const v=[...colorRows]; v[i]={...v[i],hex:e.target.value}; setColorRows(v); }} />
                              </div>
                              <div className="col-span-5 flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={()=>{ const v=[...colorRows]; v.splice(i,1); setColorRows(v); }}>Remove</Button>
                              </div>
                            </div>
                          ))}
                          <Button type="button" variant="secondary" onClick={()=>setColorRows([...colorRows,{name:'',hex:'#ff0000',value:''}])}>Add Color</Button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-sm">Sizes</Label>
                      <div className="space-y-2">
                        {sizeRows.map((s, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                              <Input value={s.value} onChange={(e)=>{ const v=[...sizeRows]; v[i]={...v[i],value:e.target.value}; setSizeRows(v); }} placeholder="100" />
                            </div>
                            <div className="col-span-3">
                              <Select value={s.unit || 'ml'} onValueChange={(val)=>{ const v=[...sizeRows]; v[i]={...v[i],unit: val}; setSizeRows(v); }}>
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
                            <div className="col-span-3">
                              <div className="flex items-center gap-2">
                                <Switch checked={!!s.useBasePrice} onCheckedChange={(val)=>{ const v=[...sizeRows]; v[i]={...v[i],useBasePrice: val, sizePrice: val ? undefined : v[i].sizePrice}; setSizeRows(v); }} />
                                <span className="text-sm">Use base price</span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              {!s.useBasePrice && (
                                <Input type="number" value={s.sizePrice ?? '' as any} onChange={(e)=>{ const v=[...sizeRows]; v[i]={...v[i],sizePrice:e.target.value?Number(e.target.value):undefined}; setSizeRows(v); }} placeholder="Price" />
                              )}
                            </div>
                            <div className="col-span-1 text-xs text-muted-foreground">
                              {s.value && s.unit ? `${s.value} ${s.unit}` : ''}
                            </div>
                            <div className="col-span-12 text-xs text-muted-foreground">
                              {(() => {
                                const base = Number(price) || 0;
                                const final = s.useBasePrice ? base : (s.sizePrice ?? base);
                                return `Final price for this size will be ₹${final.toFixed(2)}`;
                              })()}
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button type="button" variant="outline" onClick={()=>{ const v=[...sizeRows]; v.splice(i,1); setSizeRows(v); }}>Remove</Button>
                            </div>
                            <div className="col-span-12 flex items-center gap-2">
                              <label htmlFor={`sz-up-${i}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
                                <Upload className="h-4 w-4" /> Upload images for {s.name || (s.unit ? `${s.value} ${s.unit}` : s.value) || 'size'}
                              </label>
                              <input id={`sz-up-${i}`} type="file" accept="image/*" multiple className="sr-only" onChange={(e)=>handleVariantImageUpload(String(s.value), e)} />
                              <span className="text-xs text-muted-foreground">{(variantFilenamesBySize[String(s.value)] || []).length} selected</span>
                            </div>
                            {(variantExistingBySize[String(s.value)] || []).length > 0 && (
                              <div className="col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {(variantExistingBySize[String(s.value)] || []).map((fname, idx)=> (
                                  <div key={`ex-${idx}`} className="relative group overflow-hidden rounded-md border">
                                    <AspectRatio ratio={1/1}><img src={getFullImageUrl(fname)} alt="Variant existing" className="object-cover w-full h-full" /></AspectRatio>
                                    <button type="button" onClick={()=>removeVariantExisting(String(s.value), idx)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70" aria-label="Remove existing variant image"><X className="h-4 w-4" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {(variantPreviewsBySize[String(s.value)] || []).length > 0 && (
                              <div className="col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {(variantPreviewsBySize[String(s.value)] || []).map((url, idx)=> (
                                  <div key={idx} className="relative group overflow-hidden rounded-md border">
                                    <AspectRatio ratio={1/1}><img src={url} alt="Variant preview" className="object-cover w-full h-full" /></AspectRatio>
                                    <button type="button" onClick={()=>removeVariantNew(String(s.value), idx)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70" aria-label="Remove variant image"><X className="h-4 w-4" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={()=>setSizeRows([...sizeRows,{value:'',unit:'ml',useBasePrice:true}])}>Add Size</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Combos</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Button type="button" variant="outline" onClick={()=>setComboRows([...comboRows,{name:'Buy 1 Get 1', value:'bogo', type:'bogo'}])}>Add BOGO</Button>
                        <Button type="button" variant="outline" onClick={()=>setComboRows([...comboRows,{name:'2-Pack', value:'2-pack', type:'bundle', items:2}])}>Add 2‑Pack</Button>
                        <Button type="button" variant="outline" onClick={()=>setComboRows([...comboRows,{name:'3-Pack', value:'3-pack', type:'bundle', items:3}])}>Add 3‑Pack</Button>
                        <Button type="button" variant="outline" onClick={()=>setComboRows([...comboRows,{name:'4-Pack', value:'4-pack', type:'bundle', items:4}])}>Add 4‑Pack</Button>
                        <Button type="button" variant="secondary" onClick={()=>setComboRows([...comboRows,{name:'',value:'',type:'bundle'}])}>Add Custom</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Button type="button" variant="outline" onClick={()=>setComboRows([...comboRows,{name:'2-Pack', value:'2-pack-10off', type:'bundle', items:2, discountType:'percent', discountValue:10}])}>2‑Pack −10%</Button>
                        <Button type="button" variant="outline" onClick={()=>setComboRows([...comboRows,{name:'3-Pack', value:'3-pack-15off', type:'bundle', items:3, discountType:'percent', discountValue:15}])}>3‑Pack −15%</Button>
                        <Button type="button" variant="outline" onClick={()=>setComboRows([...comboRows,{name:'4-Pack', value:'4-pack-20off', type:'bundle', items:4, discountType:'percent', discountValue:20}])}>4‑Pack −20%</Button>
                      </div>
                      <div className="space-y-2">
                        {comboRows.map((cb, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                              <Input value={cb.name} onChange={(e)=>{ const v=[...comboRows]; v[i]={...v[i],name:e.target.value, value: v[i].value || slugify(e.target.value)}; setComboRows(v); }} placeholder="2-Pack" />
                            </div>
                            <div className="col-span-2">
                              <Select value={cb.type || 'bundle'} onValueChange={(val)=>{ const v=[...comboRows]; v[i]={...v[i],type: val as any}; setComboRows(v); }}>
                                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bundle">bundle</SelectItem>
                                  <SelectItem value="bogo">bogo</SelectItem>
                                  <SelectItem value="custom">custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Input type="number" value={cb.items ?? '' as any} onChange={(e)=>{ const v=[...comboRows]; v[i]={...v[i],items: e.target.value?Number(e.target.value):undefined}; setComboRows(v); }} placeholder="Items" />
                            </div>
                            <div className="col-span-2">
                              <Select value={cb.discountType || undefined as any} onValueChange={(val)=>{ const v=[...comboRows]; v[i]={...v[i],discountType: val as any}; setComboRows(v); }}>
                                <SelectTrigger><SelectValue placeholder="Discount" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="amount">Amount</SelectItem>
                                  <SelectItem value="percent">Percent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Input type="number" value={cb.discountValue ?? '' as any} onChange={(e)=>{ const v=[...comboRows]; v[i]={...v[i],discountValue: e.target.value?Number(e.target.value):undefined}; setComboRows(v); }} placeholder="Value" />
                            </div>
                            <div className="col-span-1">
                              <Input type="number" value={cb.priceOverride ?? '' as any} onChange={(e)=>{ const v=[...comboRows]; v[i]={...v[i],priceOverride: e.target.value?Number(e.target.value):undefined}; setComboRows(v); }} placeholder="Price" />
                            </div>
                            <div className="col-span-0 md:col-span-0 lg:col-span-0"></div>
                            <div className="col-span-2 flex justify-end">
                              <Button type="button" variant="outline" onClick={()=>{ const v=[...comboRows]; v.splice(i,1); setComboRows(v); }}>Remove</Button>
                            </div>
                            <div className="col-span-12 flex items-center gap-2">
                              <label htmlFor={`cb-up-${i}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
                                <Upload className="h-4 w-4" /> Upload images for {cb.name || cb.value || 'combo'}
                              </label>
                              <input id={`cb-up-${i}`} type="file" accept="image/*" multiple className="sr-only" onChange={(e)=>handleComboImageUpload(String(cb.value || slugify(cb.name)), e)} />
                              <span className="text-xs text-muted-foreground">{(comboFilenamesByKey[String(cb.value || slugify(cb.name))] || []).length} selected</span>
                            </div>
                            {(comboExistingByKey[String(cb.value || slugify(cb.name))] || []).length > 0 && (
                              <div className="col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {(comboExistingByKey[String(cb.value || slugify(cb.name))] || []).map((fname, idx)=> (
                                  <div key={`ex-${idx}`} className="relative group overflow-hidden rounded-md border">
                                    <AspectRatio ratio={1/1}><img src={getFullImageUrl(fname)} alt="Combo existing" className="object-cover w-full h-full" /></AspectRatio>
                                    <button type="button" onClick={()=>removeComboExisting(String(cb.value || slugify(cb.name)), idx)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70" aria-label="Remove existing combo image"><X className="h-4 w-4" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {(comboPreviewsByKey[String(cb.value || slugify(cb.name))] || []).length > 0 && (
                              <div className="col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {(comboPreviewsByKey[String(cb.value || slugify(cb.name))] || []).map((url, idx)=> (
                                  <div key={idx} className="relative group overflow-hidden rounded-md border">
                                    <AspectRatio ratio={1/1}><img src={url} alt="Combo preview" className="object-cover w-full h-full" /></AspectRatio>
                                    <button type="button" onClick={()=>removeComboNew(String(cb.value || slugify(cb.name)), idx)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70" aria-label="Remove combo image"><X className="h-4 w-4" /></button>
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

                {false && (
                  <div className="space-y-2">
                    <Label htmlFor="colors">Colors</Label>
                    <Textarea
                      id="colors"
                      value={colors}
                      onChange={(e) => setColors(e.target.value)}
                      placeholder='Enter colors separated by commas or as JSON object'
                      onBlur={(e) => handleJsonFieldBlur(e, false, setColors)}
                    />
                    <Label className="text-xs text-muted-foreground">
                      Enter colors as comma-separated values or a JSON object with "available" array and "primary" color
                    </Label>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Textarea
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder='Enter tags separated by commas or as JSON array'
                    onBlur={(e) => handleJsonFieldBlur(e, true, setTags)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    Enter tags as comma-separated values or a JSON array of strings
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review">Review Rating (0-5)</Label>
                  <Input
                    id="review"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="0"
                  />
                </div>
              </TabsContent>

              <TabsContent value="attributes" className="space-y-4 mt-0">
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
                <div className="space-y-2">
                  <Label htmlFor="care">Care Instructions</Label>
                  <div className="space-y-2">
                    {careList.map((c, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input value={c} onChange={(e)=>{ const v=[...careList]; v[i]=e.target.value; setCareList(v); }} placeholder="e.g., Keep away from direct sunlight" />
                        <Button type="button" variant="outline" onClick={()=>{ const v=[...careList]; v.splice(i,1); setCareList(v); }}>Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={()=>setCareList([...careList, ''])}>Add Instruction</Button>
                  </div>
                  <Textarea id="care" className="hidden" value={care} onChange={(e)=>setCare(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="care_instructions">Detailed Care Instructions</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Cleaning</Label>
                      {cleaningList.map((c, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input value={c} onChange={(e)=>{ const v=[...cleaningList]; v[i]=e.target.value; setCleaningList(v); }} placeholder="e.g., Wipe with dry cloth" />
                          <Button type="button" variant="outline" onClick={()=>{ const v=[...cleaningList]; v.splice(i,1); setCleaningList(v); }}>Remove</Button>
                        </div>
                      ))}
                      <Button type="button" variant="secondary" onClick={()=>setCleaningList([...cleaningList, ''])}>Add Cleaning Tip</Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Storage</Label>
                      {storageList.map((s, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input value={s} onChange={(e)=>{ const v=[...storageList]; v[i]=e.target.value; setStorageList(v); }} placeholder="e.g., Store in cool, dry place" />
                          <Button type="button" variant="outline" onClick={()=>{ const v=[...storageList]; v.splice(i,1); setStorageList(v); }}>Remove</Button>
                        </div>
                      ))}
                      <Button type="button" variant="secondary" onClick={()=>setStorageList([...storageList, ''])}>Add Storage Tip</Button>
                    </div>
                  </div>
                  <Textarea id="care_instructions" className="hidden" value={careInstructions} onChange={(e)=>setCareInstructions(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usage_guidelines">Usage Guidelines</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Recommended Use</Label>
                      {recommendedList.map((r, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input value={r} onChange={(e)=>{ const v=[...recommendedList]; v[i]=e.target.value; setRecommendedList(v); }} placeholder="e.g., Use daily for best results" />
                          <Button type="button" variant="outline" onClick={()=>{ const v=[...recommendedList]; v.splice(i,1); setRecommendedList(v); }}>Remove</Button>
                        </div>
                      ))}
                      <Button type="button" variant="secondary" onClick={()=>setRecommendedList([...recommendedList, ''])}>Add Recommendation</Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Pro Tips</Label>
                      {proTipsList.map((t, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input value={t} onChange={(e)=>{ const v=[...proTipsList]; v[i]=e.target.value; setProTipsList(v); }} placeholder="e.g., Patch test before use" />
                          <Button type="button" variant="outline" onClick={()=>{ const v=[...proTipsList]; v.splice(i,1); setProTipsList(v); }}>Remove</Button>
                        </div>
                      ))}
                      <Button type="button" variant="secondary" onClick={()=>setProTipsList([...proTipsList, ''])}>Add Pro Tip</Button>
                    </div>
                  </div>
                  <Textarea id="usage_guidelines" className="hidden" value={usageGuidelines} onChange={(e)=>setUsageGuidelines(e.target.value)} />
                </div>
              </TabsContent>

              <TabsContent value="specs" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="specifications">Product Specifications</Label>
                  <div className="space-y-2">
                    {specsRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Input value={row.key} onChange={(e)=>{ const v=[...specsRows]; v[i] = { ...v[i], key: e.target.value }; setSpecsRows(v); }} placeholder="e.g., Material" />
                        </div>
                        <div className="col-span-6">
                          <Input value={row.value} onChange={(e)=>{ const v=[...specsRows]; v[i] = { ...v[i], value: e.target.value }; setSpecsRows(v); }} placeholder="e.g., 100% Cotton" />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button type="button" variant="outline" onClick={()=>{ const v=[...specsRows]; v.splice(i,1); setSpecsRows(v); }}>Remove</Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={()=>setSpecsRows([...specsRows, { key: '', value: '' }])}>Add Specification</Button>
                  </div>
                  <Textarea id="specifications" className="hidden" value={specifications} onChange={(e)=>setSpecifications(e.target.value)} />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <Alert className="mt-6 bg-muted/50">
            <AlertDescription>
              For JSON fields, you can enter simple text and it will be automatically converted to JSON format. For example, enter <code>Red, Blue, Green</code> for colors or tags.
            </AlertDescription>
          </Alert>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
