import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types/schema';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { formatDate } from '@/lib/utils';
import { getImageUrl } from '@/lib/pocketbase';

interface ProductCardProps {
  product: Product;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
}

export function ProductCard({ product, onView, onEdit }: ProductCardProps) {
  // Defensive check at the component level
  if (!product) {
    console.error('ProductCard received null or undefined product');
    return null;
  }

  // Get the image or placeholder
  const getProductImageUrl = (product: Product) => {
    try {
      // Safety check for product properties
      if (!product || !product.collectionId || !product.id) {
        return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
      }
      
      if (Array.isArray(product.images) && product.images.length > 0) {
        return getImageUrl(product.collectionId, product.id, product.images[0]);
      } else if (typeof product.images === 'string' && product.images) {
        return getImageUrl(product.collectionId, product.id, product.images);
      } else if (product.image) {
        return getImageUrl(product.collectionId, product.id, product.image);
      }
      return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
    } catch (error) {
      console.error('Error generating product image URL:', error);
      return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
    }
  };

  return (
    <Card 
      className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200 touch-pan-y cursor-pointer border-2 hover:border-primary/50"
      onClick={() => onEdit(product)}
    >
      <div className="relative">
        <AspectRatio ratio={1}>
          <img
            src={getProductImageUrl(product)}
            alt={product.name || 'Product'}
            className="object-cover w-full h-full select-none pointer-events-none"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
            }}
          />
        </AspectRatio>
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {product.status && (
            <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </Badge>
          )}
          {product.stock === 0 && (
            <Badge variant="destructive" className="text-xs">
              Out of Stock
            </Badge>
          )}
          {product.bestseller && (
            <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
              Bestseller
            </Badge>
          )}
          {product.new && (
            <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
              New
            </Badge>
          )}
        </div>
      </div>
      
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex flex-col space-y-1.5">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name || 'Unnamed Product'}</h3>
          <p className="text-xs text-muted-foreground">{product.category || 'Uncategorized'}</p>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 px-4 flex-grow">
        <div className="flex flex-col space-y-1.5">
          <p className="text-base font-semibold">₹{product.price ? product.price.toFixed(2) : '0.00'}</p>
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
          )}
          <div className="text-[10px] text-muted-foreground mt-auto pt-1">
            <span>Added: {product.created ? formatDate(product.created) : 'Unknown'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
