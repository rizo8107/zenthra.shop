import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Puck, type Data } from '@measured/puck';
import config from '@/puck/config/complete';
import { pocketbase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import '@measured/puck/puck.css';
import '@/styles/puck-editor-overrides.css';

interface ProductPage {
  id: string;
  product_id: string;
  puck_content: Data;
  field: 'above' | 'below' | 'replace';
  enabled: boolean;
  expand?: {
    product_id: {
      id: string;
      name: string;
    };
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  description?: string;
  category?: string;
  inStock?: boolean;
}

export default function ProductPageEditor() {
  const { pageId } = useParams<{ pageId: string }>();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get('embed') === '1';
  
  const [productPage, setProductPage] = useState<ProductPage | null>(null);
  const [data, setData] = useState<Data>({ content: [], root: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [puckKey, setPuckKey] = useState(0);

  useEffect(() => {
    if (pageId) {
      loadProductPage();
    }
  }, [pageId]);

  // Send height updates to parent (for iframe embedding)
  useEffect(() => {
    if (!isEmbed) return;

    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'resize', height }, '*');
    };

    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);

    return () => observer.disconnect();
  }, [isEmbed, puckKey]);

  const loadProductPage = async () => {
    try {
      setLoading(true);
      const page = await pocketbase
        .collection('product_pages')
        .getOne<ProductPage>(pageId!, {
          expand: 'product_id',
        });

      setProductPage(page);

      // Parse puck_content
      let puckData: Data = { content: [], root: {} };
      if (page.puck_content) {
        if (typeof page.puck_content === 'string') {
          try {
            puckData = JSON.parse(page.puck_content);
          } catch {
            puckData = page.puck_content as any;
          }
        } else {
          puckData = page.puck_content;
        }
      }

      setData(puckData);
      setPuckKey(prev => prev + 1);
    } catch (error) {
      console.error('Error loading product page:', error);
      toast.error('Failed to load product page');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!productPage) return;

    try {
      setSaving(true);
      await pocketbase.collection('product_pages').update(productPage.id, {
        puck_content: data,
      });
      toast.success('Product page saved successfully');
    } catch (error) {
      console.error('Error saving product page:', error);
      toast.error('Failed to save product page');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (productPage?.expand?.product_id?.id) {
      window.open(`/product/${productPage.expand.product_id.id}`, '_blank');
    }
  };

  const handleBack = () => {
    if (isEmbed) {
      window.parent.postMessage({ type: 'navigate', path: '/admin/product-pages' }, '*');
    } else {
      window.history.back();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading product page...</p>
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

  const productName = productPage.expand?.product_id?.name || 'Product';

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{productName}</h1>
            <p className="text-xs text-muted-foreground">Custom Product Page</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Puck Editor */}
      <div className="flex-1 overflow-hidden">
        <Puck
          key={puckKey}
          config={config}
          data={data}
          onPublish={handleSave}
          onChange={setData}
        />
      </div>
    </div>
  );
}
