import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Clock, Zap, CheckCircle } from 'lucide-react';
import { flowTemplates, getTemplatesByCategory, getTemplateCategories, type FlowTemplate } from '../templates/flowTemplates';

interface TemplateGalleryProps {
  onUseTemplate: (template: FlowTemplate) => void;
  onClose: () => void;
  open: boolean;
}

export function TemplateGallery({ onUseTemplate, onClose, open }: TemplateGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const categories = [
    { key: 'all', label: 'All Templates', count: flowTemplates.length },
    { key: 'ecommerce', label: 'E-commerce', count: getTemplatesByCategory('ecommerce').length },
    { key: 'marketing', label: 'Marketing', count: getTemplatesByCategory('marketing').length },
    { key: 'support', label: 'Support', count: getTemplatesByCategory('support').length },
    { key: 'general', label: 'General', count: getTemplatesByCategory('general').length },
  ];

  const getFilteredTemplates = (): FlowTemplate[] => {
    let templates = selectedCategory === 'all' 
      ? flowTemplates 
      : getTemplatesByCategory(selectedCategory);

    if (searchTerm) {
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return templates;
  };

  const handleUseTemplate = (template: FlowTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const confirmUseTemplate = () => {
    if (selectedTemplate) {
      onUseTemplate(selectedTemplate);
      setShowPreview(false);
      setSelectedTemplate(null);
      onClose();
    }
  };

  const categoryColors = {
    ecommerce: 'bg-blue-100 text-blue-800',
    marketing: 'bg-green-100 text-green-800',
    support: 'bg-purple-100 text-purple-800',
    general: 'bg-gray-100 text-gray-800',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl">Flow Templates</DialogTitle>
            <DialogDescription>
              Choose from pre-built automation templates to get started quickly
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-[70vh]">
            {/* Search and Filters */}
            <div className="space-y-4 pb-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="grid grid-cols-5 w-full">
                  {categories.map((category) => (
                    <TabsTrigger key={category.key} value={category.key} className="text-xs">
                      {category.label} ({category.count})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto py-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getFilteredTemplates().map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{template.icon}</span>
                          <div>
                            <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
                            <Badge 
                              variant="outline" 
                              className={`text-xs mt-1 ${categoryColors[template.category]}`}
                            >
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {template.description}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{template.estimatedSetupTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{template.canvas.nodes.length} nodes</span>
                        </div>
                      </div>

                      {/* Required Connections */}
                      {template.requiredConnections.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Required:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.requiredConnections.map((conn) => (
                              <Badge key={conn} variant="outline" className="text-xs">
                                {conn}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button 
                        className="w-full" 
                        onClick={() => handleUseTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {getFilteredTemplates().length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium">No templates found</p>
                  <p className="text-sm mt-1">Try adjusting your search or category filter</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedTemplate?.icon}</span>
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {/* Template Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Category</p>
                  <Badge className={categoryColors[selectedTemplate.category]}>
                    {selectedTemplate.category}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Setup Time</p>
                  <p>{selectedTemplate.estimatedSetupTime}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Nodes</p>
                  <p>{selectedTemplate.canvas.nodes.length} automation steps</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Connections</p>
                  <p>{selectedTemplate.canvas.edges.length} connections</p>
                </div>
              </div>

              {/* Required Connections */}
              {selectedTemplate.requiredConnections.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-2">Required Connections:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.requiredConnections.map((conn) => (
                      <Badge key={conn} variant="outline">
                        {conn}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Make sure you have these connections configured before using this template.
                  </p>
                </div>
              )}

              {/* Tags */}
              <div>
                <p className="font-medium text-muted-foreground mb-2">Tags:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* What this template does */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  What this template includes:
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Pre-configured automation nodes</li>
                  <li>• Optimized message templates</li>
                  <li>• Best practice timing and logic</li>
                  <li>• Ready-to-use workflow structure</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back
            </Button>
            <Button onClick={confirmUseTemplate}>
              Create Flow from Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
