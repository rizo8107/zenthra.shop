import React from 'react';
import { CreateProductDialog } from '@/components/dialogs/CreateProductDialog';
import { Product, CreateProductData, UpdateProductData } from '@/types/schema';

export type ProductCrudMode = 'create' | 'edit' | 'view';

interface ProductCrudDialogProps {
  mode: ProductCrudMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onCreate?: (data: CreateProductData | FormData) => Promise<void>;
  onUpdate?: (payload: { id: string; data: UpdateProductData | FormData }) => Promise<unknown>;
  onDelete?: () => Promise<void>;
}

export function ProductCrudDialog({
  mode,
  open,
  onOpenChange,
  product,
  onCreate,
  onUpdate,
  onDelete,
}: ProductCrudDialogProps) {
  // Use the unified CreateProductDialog for all modes
  return (
    <CreateProductDialog
      mode={mode}
      open={open}
      onOpenChange={onOpenChange}
      product={product}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}
