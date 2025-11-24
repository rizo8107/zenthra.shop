import { ReactNode } from 'react';

interface ProductPageRootProps {
  children: ReactNode;
  title?: string;
}

export function ProductPageRoot({ children, title }: ProductPageRootProps) {
  return (
    <div className="product-page-root">
      {title && <h1 className="sr-only">{title}</h1>}
      {children}
    </div>
  );
}
