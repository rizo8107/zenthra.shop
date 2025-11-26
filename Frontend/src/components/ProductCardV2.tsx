import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '@/lib/pocketbase';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

interface ProductCardV2Props {
  product: Product;
}

const ProductCardV2: React.FC<ProductCardV2Props> = ({ product }) => {
  const { addItem } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1, '');
  };

  const hasDiscount =
    typeof product.original_price === 'number' &&
    typeof product.price === 'number' &&
    product.original_price > product.price;

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        'group block bg-white',
        'w-full max-w-[260px]',
        'flex flex-col border border-slate-200 shadow-sm'
      )}
    >
      {/* Top image block */}
      <div className="w-full h-[180px] overflow-hidden bg-[#E6D9FF]">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 px-4 py-3">
        {/* Optional badge row */}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-600">
          Restocked
        </p>

        <h3 className="mt-1 text-[16px] font-semibold leading-snug text-black line-clamp-2">
          {product.name}
        </h3>

        {product.description && (
          <p className="mt-1 text-[13px] leading-snug text-slate-700 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="mt-2">
          <span className="block text-[18px] font-semibold text-black">
            ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
          </span>
          {hasDiscount && (
            <span className="block text-[13px] text-slate-500 line-through">
              ₹{product.original_price!.toFixed(2)}
            </span>
          )}
        </div>

        <button
          onClick={handleAdd}
          className={cn(
            'mt-3 w-full h-[42px] flex items-center justify-center',
            'bg-black text-white text-[13px] font-semibold tracking-wide',
            'rounded-none hover:bg-black/90 transition-colors'
          )}
        >
          ADD TO CART
        </button>
      </div>
    </Link>
  );
};

export default memo(ProductCardV2);
