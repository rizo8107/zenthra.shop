import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { toast } from 'sonner';

interface ProductPage {
  id: string;
  product_id: string;
}

export default function ProductPageEditor() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pageId) {
      toast.error('Invalid product page ID');
      navigate('/admin/pages');
      return;
    }

    // Load the product page to get the product ID
    pb.collection('product_pages')
      .getOne<ProductPage>(pageId)
      .then((page) => {
        // Redirect to the Frontend product detail page with edit mode
        const frontendUrl = import.meta.env.VITE_ZENTHRA_FRONTEND_URL || window.location.origin;
        const productUrl = `${frontendUrl}/product/${page.product_id}?edit=true&pageId=${pageId}`;
        window.location.href = productUrl;
      })
      .catch((error) => {
        console.error('Error loading product page:', error);
        toast.error('Failed to load product page');
        navigate('/admin/pages');
      });
  }, [pageId, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Redirecting to product page editor...</p>
        </div>
      </div>
    );
  }

  return null;
}
