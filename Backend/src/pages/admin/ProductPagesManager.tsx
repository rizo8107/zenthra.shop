import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { pb } from '@/lib/pocketbase';
import { Search, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';

const PRODUCTS_COLLECTION = 'products';
const PRODUCT_PAGES_COLLECTION = 'product_pages';

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  category?: string;
  inStock?: boolean;
}

interface ProductPage {
  id: string;
  product_id: string;
  puck_content: any;
  field: 'above' | 'below' | 'replace';
  enabled: boolean;
  expand?: {
    product_id: Product;
  };
}

export default function ProductPagesManager() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [productPages, setProductPages] = useState<ProductPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all products
      const productsData = await pb.collection(PRODUCTS_COLLECTION).getFullList<Product>({
        sort: '-created',
      });
      setProducts(productsData);

      // Load existing product pages
      const pagesData = await pb.collection(PRODUCT_PAGES_COLLECTION).getFullList<ProductPage>({
        expand: 'product_id',
      });
      setProductPages(pagesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const getProductImageUrl = (product: Product) => {
    if (!product.images || product.images.length === 0) return null;
    const firstImage = product.images[0];
    return `${pb.baseUrl}/api/files/${PRODUCTS_COLLECTION}/${product.id}/${firstImage}`;
  };

  const hasCustomPage = (productId: string) => {
    return productPages.find(p => p.product_id === productId);
  };

  const handleEditProduct = async (product: Product) => {
    const existingPage = hasCustomPage(product.id);
    
    if (existingPage) {
      // Navigate to edit existing page
      navigate(`/admin/product-pages/${existingPage.id}/edit`);
    } else {
      // Create new product page
      try {
        const newPage = await pb.collection(PRODUCT_PAGES_COLLECTION).create({
          product_id: product.id,
          puck_content: { content: [], root: {} },
          field: 'below',
          enabled: true,
        });
        navigate(`/admin/product-pages/${newPage.id}/edit`);
      } catch (error) {
        console.error('Error creating product page:', error);
        toast.error('Failed to create product page');
      }
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading products...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Pages</h1>
          <p className="text-muted-foreground mt-1">
            Customize individual product pages with the Puck editor
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Products</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const customPage = hasCustomPage(product.id);
                const imageUrl = getProductImageUrl(product);

                return (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square bg-muted">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          No image
                        </div>
                      )}
                      {customPage && (
                        <Badge className="absolute top-2 right-2 bg-blue-600">
                          {customPage.enabled ? 'Custom' : 'Draft'}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">₹{product.price.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {customPage ? 'Edit Page' : 'Create Page'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/product/${product.id}`, '_blank')}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
