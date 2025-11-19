import React, { memo, useState } from 'react';
import ProductCard from './ProductCard';
import { Product } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';

type ProductGridProps = {
  products: Product[];
  title?: string;
  loading?: boolean;
};

const ProductGrid = ({ products, title, loading = false }: ProductGridProps) => {
  const [displayCount, setDisplayCount] = useState(8);
  
  const showMore = () => {
    setDisplayCount(prevCount => prevCount + 8);
  };
  
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <div className="aspect-square rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted/80" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-10">
      {title && (
        <div className="mb-4 text-center space-y-4">
          <h2 className="text-3xl font-semibold text-primary">{title}</h2>
          <div className="mx-auto h-1 w-16 rounded-full bg-primary" />
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
        {products.slice(0, displayCount).map((product, index) => (
          <ProductCard key={product.id} product={product} priority={index < 4} />
        ))}
      </div>
      
      {displayCount < products.length && (
        <div className="text-center mt-12">
          <Button 
            onClick={showMore}
            variant="default"
            size="lg"
            className="gap-2 shadow-sm"
          >
            Load More Products
          </Button>
        </div>
      )}
    </div>
  );
};

export default memo(ProductGrid);
