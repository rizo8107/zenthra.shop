import { ComponentConfig } from "@measured/puck";
import ProductCardV2 from "@/components/ProductCardV2";
import { Product, getProducts } from "@/lib/pocketbase";
import { useEffect, useState } from "react";

export interface ProductCardV2BlockProps {
  productId?: string;
}

const ProductCardV2Content = ({ productId }: ProductCardV2BlockProps) => {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    const run = async () => {
      const all = await getProducts();
      let p: Product | undefined;
      if (productId) {
        p = all.find((x) => x.id === productId);
      } else {
        p = all[0];
      }
      setProduct(p || null);
    };
    run();
  }, [productId]);

  if (!product) return null;

  return (
    <div className="flex justify-center">
      <ProductCardV2 product={product} />
    </div>
  );
};

export const ProductCardV2Block: ComponentConfig<ProductCardV2BlockProps> = {
  fields: {
    productId: {
      type: "text",
      label: "Product ID (optional)",
    },
  },
  defaultProps: {},
  render: (props) => <ProductCardV2Content {...props} />,
};
