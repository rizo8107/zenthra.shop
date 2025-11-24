import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { pb } from '@/lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Search, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  published: boolean;
  created: string;
  updated: string;
  content_json?: any;
}

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
}

const PRODUCT_PAGES_COLLECTION = 'product_pages';

export default function PagesManagerBackend() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Product Pages state
  const [products, setProducts] = useState<Product[]>([]);
  const [productPages, setProductPages] = useState<ProductPage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pages');

  useEffect(() => {
    loadPages();
    if (activeTab === 'product-pages') {
      loadProductData();
    }
  }, [activeTab]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('pages').getFullList<Page>({
        sort: '-updated',
      });
      setPages(records);
    } catch (error) {
      console.error('Failed to load pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductData = async () => {
    try {
      setProductsLoading(true);
      
      // Load all products from products collection
      const productsResult = await pb.collection('products').getList<Product>(1, 500, {
        requestKey: null, // Disable auto-cancellation
      });
      setProducts(productsResult.items);

      // Load existing product pages
      try {
        const pagesData = await pb.collection(PRODUCT_PAGES_COLLECTION).getFullList<ProductPage>({
          requestKey: null,
        });
        setProductPages(pagesData);
      } catch (pageError) {
        console.log('No product pages found or error loading:', pageError);
        setProductPages([]);
      }
    } catch (error) {
      console.error('Error loading product data:', error);
      toast.error('Failed to load products. Please check your database connection.');
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setNewPageTitle(title);
    setNewPageSlug(generateSlug(title));
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      await pb.collection('pages').delete(pageId);
      setPages(pages.filter(p => p.id !== pageId));
    } catch (error) {
      console.error('Failed to delete page:', error);
      alert('Failed to delete page');
    }
  };

  const handleCreateNew = () => {
    setShowCreateDialog(true);
  };

  const openExternalEditor = (pageId: string) => {
    const baseEnv = import.meta.env.VITE_ZENTHRA_FRONTEND_URL as string | undefined;
    const base = baseEnv && baseEnv.trim().length > 0
      ? baseEnv.replace(/\/$/, '')
      : window.location.origin.replace(/\/$/, '');

    const path = `/admin/pages/${pageId}/edit`;
    const url = `${base}${path}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCreateAndEdit = async () => {
    if (!newPageTitle.trim()) {
      alert('Please enter a page title');
      return;
    }
    if (!newPageSlug.trim()) {
      alert('Please enter a page slug');
      return;
    }

    try {
      setCreating(true);
      const newPage = await pb.collection('pages').create({
        title: newPageTitle,
        slug: newPageSlug,
        content_json: JSON.stringify({ content: [], root: { title: newPageTitle } }),
        published: false,
        status: 'draft',
      });

      // Refresh list and close dialog
      await loadPages();
      setShowCreateDialog(false);
      setNewPageTitle('');
      setNewPageSlug('');

      // Open full editor in new tab (frontend app, non-embedded)
      openExternalEditor(newPage.id);
    } catch (error) {
      console.error('Error creating page:', error);
      alert('Error creating page. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Product Pages helper functions
  const getProductImageUrl = (product: Product) => {
    if (!product.images || product.images.length === 0) return null;
    const firstImage = product.images[0];
    return `${pb.baseUrl}/api/files/products/${product.id}/${firstImage}`;
  };

  const hasCustomPage = (productId: string) => {
    return productPages.find(p => p.product_id === productId);
  };

  const handleEditProduct = async (product: Product) => {
    const existingPage = hasCustomPage(product.id);
    
    if (existingPage) {
      // Navigate to edit existing page
      window.open(`/admin/product-pages/${existingPage.id}/edit`, '_blank');
    } else {
      // Create new product page
      try {
        const newPage = await pb.collection(PRODUCT_PAGES_COLLECTION).create({
          product_id: product.id,
          puck_content: { content: [], root: {} },
          position: 'below',
          enabled: true,
        });
        window.open(`/admin/product-pages/${newPage.id}/edit`, '_blank');
      } catch (error) {
        console.error('Error creating product page:', error);
        toast.error('Failed to create product page');
      }
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading pages...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
            <p className="text-muted-foreground mt-1">
              Manage your website pages and product pages
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pages">Website Pages</TabsTrigger>
            <TabsTrigger value="product-pages">Product Pages</TabsTrigger>
          </TabsList>

          {/* Website Pages Tab */}
          <TabsContent value="pages">
            <div className="flex justify-end mb-4">
              <Button onClick={handleCreateNew} className="flex items-center gap-2">
                <Plus size={16} />
                Create New Page
              </Button>
            </div>

        {pages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Edit size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first page to get started
              </p>
              <Button onClick={handleCreateNew}>
                <Plus size={16} className="mr-2" />
                Create Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => {
              const hasPuck = !!page.content_json;
              
              return (
                <Card key={page.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {page.title || 'Untitled Page'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          /{page.slug || 'no-slug'}
                        </CardDescription>
                      </div>
                      <Badge variant={page.published ? 'default' : 'secondary'}>
                        {page.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {/* Editor Type Badge */}
                      <div className="flex gap-2 mb-2">
                        {hasPuck && (
                          <Badge variant="outline" className="text-xs">
                            <Edit size={12} className="mr-1" />
                            Puck Editor
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openExternalEditor(page.id)}
                          className="flex-1"
                        >
                          <Edit size={14} className="mr-1" />
                          Edit Page
                        </Button>
                      </div>

                      <div className="flex gap-2 mt-1">
                        {page.published && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/page/${page.slug}`, '_blank')}
                            className="flex-1"
                          >
                            <Eye size={14} className="mr-1" />
                            View
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(page.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        Updated {new Date(page.updated).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
          </TabsContent>

          {/* Product Pages Tab */}
          <TabsContent value="product-pages">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading products...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package size={48} className="text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No products found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try a different search term' : 'Add products to customize their pages'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => {
                  const customPage = hasCustomPage(product.id);
                  const imageUrl = getProductImageUrl(product);

                  return (
                    <Card key={product.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex gap-3">
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-md"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">
                              {product.name}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              ₹{product.price}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          {customPage && (
                            <Badge variant="secondary" className="w-fit">
                              Custom Page
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                            className="w-full"
                          >
                            <Edit size={14} className="mr-1" />
                            {customPage ? 'Edit Page' : 'Create Page'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/product/${product.id}`, '_blank')}
                            className="w-full"
                          >
                            <Eye size={14} className="mr-1" />
                            Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Page Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setNewPageTitle('');
          setNewPageSlug('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>
              Enter a name and slug for your new page. The slug will be used in the URL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                placeholder="e.g., About Us"
                value={newPageTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Page Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/page/</span>
                <Input
                  id="slug"
                  placeholder="e.g., about-us"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  disabled={creating}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewPageTitle('');
                setNewPageSlug('');
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAndEdit} disabled={creating}>
              {creating ? 'Creating...' : 'Create & Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
