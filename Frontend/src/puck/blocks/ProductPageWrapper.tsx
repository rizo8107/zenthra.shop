import { ComponentConfig } from '@measured/puck';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getProduct, type Product } from '@/lib/pocketbase';

export interface ProductPageWrapperProps {
  showProductDetails: boolean;
}

export const ProductPageWrapper: ComponentConfig<ProductPageWrapperProps> = {
  label: 'Product Page Base',
  fields: {
    showProductDetails: {
      type: 'radio',
      options: [
        { label: 'Show Product Details', value: true },
        { label: 'Hide Product Details', value: false },
      ],
    },
  },
  defaultProps: {
    showProductDetails: true,
  },
  render: ({ showProductDetails }) => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);

    useEffect(() => {
      if (id) {
        getProduct(id).then(setProduct).catch(console.error);
      }
    }, [id]);

    if (!showProductDetails || !product) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          <p>Product details hidden in editor. They will appear on the live page.</p>
        </div>
      );
    }

    return (
      <div className="product-page-preview bg-muted/30 p-4 rounded-lg">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Product Page Preview</p>
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <p className="text-lg text-primary">₹{product.price}</p>
          <p className="text-xs text-muted-foreground">
            The full product page will render here on the live site
          </p>
        </div>
      </div>
    );
  },
};
