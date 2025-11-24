import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { pb } from '@/lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

export default function PagesManagerBackend() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

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
              Manage your website pages with Puck editor
            </p>
          </div>
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
