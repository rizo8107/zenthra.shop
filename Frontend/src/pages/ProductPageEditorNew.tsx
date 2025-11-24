import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pocketbase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ProductPage {
  id: string;
  product_id: string;
  puck_content: any;
  field: 'above' | 'below' | 'replace';
  enabled: boolean;
}

export default function ProductPageEditorNew() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const [productPage, setProductPage] = useState<ProductPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pageId) {
      loadProductPage();
    }
  }, [pageId]);

  const loadProductPage = async () => {
    try {
      setLoading(true);
      const page = await pocketbase
        .collection('product_pages')
        .getOne<ProductPage>(pageId!);

      setProductPage(page);
    } catch (error) {
      console.error('Error loading product page:', error);
      toast.error('Failed to load product page');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/pages');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!productPage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Product page not found</p>
      </div>
    );
  }

  // Redirect to the actual product detail page with edit mode
  const productUrl = `/product/${productPage.product_id}?edit=true&pageId=${pageId}`;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pages
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Edit Product Page</h1>
          <p className="text-xs text-muted-foreground">Editing custom content for this product</p>
        </div>
      </div>

      {/* Product Detail Page in iframe */}
      <div className="flex-1">
        <iframe
          src={productUrl}
          className="w-full h-full border-0"
          title="Product Page Editor"
        />
      </div>
    </div>
  );
}
