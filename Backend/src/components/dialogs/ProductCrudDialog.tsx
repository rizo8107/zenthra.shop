import React from 'react';
import { CreateProductDialog } from '@/components/dialogs/CreateProductDialog';
import { EditProductDialog } from '@/components/dialogs/EditProductDialog';
import { ViewProductDialog } from '@/components/dialogs/ViewProductDialog';
import { Product, CreateProductData, UpdateProductData } from '@/types/schema';

export type ProductCrudMode = 'create' | 'edit' | 'view';

interface ProductCrudDialogProps {
  mode: ProductCrudMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onCreate?: (data: CreateProductData | FormData) => Promise<void>;
  onUpdate?: (payload: { id: string; data: UpdateProductData }) => Promise<unknown>;
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
  if (mode === 'create') {
    if (!onCreate) {
      console.error('ProductCrudDialog: onCreate callback is required when mode is "create"');
      return null;
    }

    return (
      <CreateProductDialog
        open={open}
        onOpenChange={onOpenChange}
        onSubmit={onCreate}
      />
    );
  }

  if (mode === 'edit') {
    if (!product) {
      console.error('ProductCrudDialog: product is required when mode is "edit"');
      return null;
    }

    if (!onUpdate) {
      console.error('ProductCrudDialog: onUpdate callback is required when mode is "edit"');
      return null;
    }

    return (
      <EditProductDialog
        open={open}
        onOpenChange={onOpenChange}
        product={product}
        onSubmit={onUpdate}
      />
    );
  }

  // view mode (default)
  return (
    <ViewProductDialog
      open={open}
      onOpenChange={onOpenChange}
      product={product ?? null}
      onDelete={onDelete}
    />
  );
}
