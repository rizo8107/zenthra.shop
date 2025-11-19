import { RecordModel } from 'pocketbase';

export type ProductColor = {
  name: string;
  value: string;
  hex: string;
};

export type ProductSize = {
  name: string;
  value: string;
  unit?: string;
  inStock?: boolean;
  priceOverride?: number;
  priceDelta?: number;
  originalPrice?: number;
};

export type ProductVariants = {
  colors?: (ProductColor & { inStock?: boolean })[];
  sizes?: ProductSize[];
};

export type Product = RecordModel & {
  name: string;
  description: string;
  price: number;
  images: string[];
  // Unified variants blob (preferred)
  variants?: ProductVariants;
  colors: ProductColor[];
  features: string[];
  dimensions: string;
  material: string;
  care: string[];
  category: string;
  tags: string[];
  bestseller: boolean;
  new: boolean;
  inStock: boolean;
  reviews?: number;
};
