import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '@/lib/pocketbase';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

interface ProductCardV2Props {
  product: Product;
}

const ProductCardV2: React.FC<ProductCardV2Props> = ({ product }) => {
  const { addItem, getItem, updateQuantity } = useCart();

  const currentCartItem = getItem(product.id);
  const currentQty = currentCartItem?.quantity ?? 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1, '');
  };

  const handleInc = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, currentQty + 1);
  };

  const handleDec = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentQty <= 1) {
      updateQuantity(product.id, 0);
    } else {
      updateQuantity(product.id, currentQty - 1);
    }
  };

  const hasDiscount =
    typeof product.original_price === 'number' &&
    typeof product.price === 'number' &&
    product.original_price > product.price;

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        'group block',
        'w-[382px] h-[544px] box-border',
        'rounded-[24px] p-0',
        "bg-[linear-gradient(129.08deg,#FEFBF6_30.43%,#FCF0D6_101.35%)]",
        'flex flex-col justify-center items-center gap-[10px] px-[10px] pb-[10px]'
      )}
    >
      {/* Image container - use existing product image component via background for now */}
      <div className="w-[408px] h-[347px] rounded-[11px] overflow-hidden flex-none">
        {/* we reuse whatever ProductImage logic is inside ProductCard by just using <img> url here */}
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-col items-center justify-center gap-[20px] w-[349px] h-[177px]">
        {/* Text */}
        <div className="flex flex-col justify-center items-start w-[349px] h-[106px]">
          {/* Title row */}
          <div className="flex flex-row items-center justify-center gap-[10px] p-1 w-[185px] h-[38px]">
            <h3 className="font-bold text-black text-[24px] leading-[30px]">
              {product.name}
            </h3>
          </div>

          {/* Tags row (Best seller / Soy vegan) */}
          <div className="mt-1 flex flex-row items-start gap-2 w-[174px] h-[20px]">
            <div className="flex flex-row items-center justify-center px-6 py-[10px] gap-[10px] h-[20px] border border-[#7E7757] rounded-[24px]">
              <span className="text-[12px] leading-[15px] font-semibold text-[#928B6D]">
                Best seller
              </span>
            </div>
            <div className="flex flex-row items-center justify-center px-6 py-[10px] gap-[10px] h-[20px] border border-[#928B6D] rounded-[24px]">
              <span className="text-[12px] leading-[15px] font-semibold text-[#928B6D]">
                Soy vegan
              </span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-1 flex flex-row items-center justify-center gap-[10px] p-1 w-[341px] h-[48px]">
              <p className="w-[333px] h-[40px] text-[16px] leading-[20px] font-normal text-black line-clamp-2">
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* Price + CTA row */}
        <div className="flex flex-row items-center justify-between gap-[20px] w-[349px] h-[51px]">
          {/* Price */}
          <div className="flex flex-col items-start justify-center p-[2px] w-[104px] h-[51px]">
            <span className="text-[22px] leading-[27px] font-semibold text-black">
              ₹{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
            </span>
            {hasDiscount && (
              <span className="text-[16px] leading-[20px] font-normal text-[#5E5E5E] line-through">
                ₹{product.original_price!.toFixed(2)}
              </span>
            )}
          </div>

          {/* CTA: state based on quantity (Variant1 vs Variant2 style) */}
          {currentQty <= 0 ? (
            // Variant1: brown gradient Add to Cart
            <button
              onClick={handleAdd}
              className={cn(
                'relative flex flex-row justify-center items-center gap-[10px]',
                'w-[217px] h-[40px] rounded-[24px]',
                "bg-[linear-gradient(90deg,#C1885F_-44.93%,#714D31_129.26%)]",
                'shadow-[0px_4px_8px_#AB9D7F] text-white font-bold text-[16px] leading-[20px]'
              )}
            >
              Add to Cart
            </button>
          ) : (
            // Variant2: bordered pill with brown +/- buttons and center quantity
            <div
              className={cn(
                'relative flex flex-row justify-center items-center gap-[10px] isolate',
                'w-[217px] h-[40px] rounded-[24px] border-[2px] border-[#956746]'
              )}
            >
              {/* Center quantity */}
              <span className="z-0 text-[16px] leading-[20px] font-bold text-black">
                {currentQty}
              </span>

              {/* Plus button (right) */}
              <button
                onClick={handleInc}
                className="absolute right-[3.5px] top-[3.5px] w-[34px] h-[33px] rounded-[17px] bg-[#80583A] flex items-center justify-center"
                aria-label="Increase quantity"
              >
                <span className="w-[14px] h-[14px] border-2 border-white relative block">
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[10px] h-[2px] bg-white" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[10px] bg-white" />
                </span>
              </button>

              {/* Minus button (left) */}
              <button
                onClick={handleDec}
                className="absolute left-[3.5px] top-[3.5px] w-[34px] h-[33px] rounded-[17px] bg-[#AB7752] flex items-center justify-center"
                aria-label="Decrease quantity"
              >
                <span className="w-[14px] h-[2px] bg-[#F2F2F2] block" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default memo(ProductCardV2);
