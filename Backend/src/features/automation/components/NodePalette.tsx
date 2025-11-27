import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { nodesByCategory, type NodeDefinition } from '../nodes/nodeDefinitions';

interface NodePaletteProps {
  onNodeDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Only allow a curated set of nodes in the palette for now
  // Include core trigger/logic/messaging nodes and the new sales report data node
  const allowedTypes = new Set<string>([
    'trigger.journey',
    'trigger.cron',
    'logic.if',
    'whatsapp.send',
    'report.sales',
  ]);

  const allAllowedNodes: NodeDefinition[] = Object.values(nodesByCategory)
    .flat()
    .filter((node) => allowedTypes.has(node.type));

  const categories = [
    { key: 'all', label: 'All Nodes', count: allAllowedNodes.length },
    { key: 'trigger', label: 'Triggers', count: allAllowedNodes.filter((n) => n.category === 'trigger').length },
    { key: 'data', label: 'Data', count: allAllowedNodes.filter((n) => n.category === 'data').length },
    { key: 'logic', label: 'Logic', count: allAllowedNodes.filter((n) => n.category === 'logic').length },
    { key: 'messaging', label: 'Messaging', count: allAllowedNodes.filter((n) => n.category === 'messaging').length },
    { key: 'payments', label: 'Payments', count: allAllowedNodes.filter((n) => n.category === 'payments').length },
    { key: 'utilities', label: 'Utilities', count: allAllowedNodes.filter((n) => n.category === 'utilities').length },
  ];

  const getFilteredNodes = (): NodeDefinition[] => {
    let nodes: NodeDefinition[] = [];

    if (selectedCategory === 'all') {
      nodes = allAllowedNodes;
    } else {
      nodes = allAllowedNodes.filter((node) => node.category === selectedCategory);
    }

    if (searchTerm) {
      nodes = nodes.filter(node =>
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return nodes;
  };

  const categoryColors = {
    trigger: 'bg-green-100 text-green-800 border-green-200',
    data: 'bg-blue-100 text-blue-800 border-blue-200',
    logic: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    messaging: 'bg-purple-100 text-purple-800 border-purple-200',
    payments: 'bg-red-100 text-red-800 border-red-200',
    utilities: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const filteredNodes = getFilteredNodes();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Node Palette</CardTitle>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {filteredNodes.length} nodes
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="flex flex-wrap gap-2 px-4 pb-3 pt-1 bg-transparent">
            {categories
              .filter((category) => category.count > 0)
              .map((category) => (
              <TabsTrigger
                key={category.key}
                value={category.key}
                className="flex items-center gap-1 rounded-full bg-background/40 px-3 py-1 text-[11px] font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span>{category.label}</span>
                <span className="text-[10px] opacity-70">{category.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="px-4 pb-4">
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredNodes.map((node) => (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(event) => onNodeDragStart(event, node.type)}
                  className="p-3 border rounded-lg cursor-grab bg-background/60 hover:bg-accent/60 hover:border-accent-foreground/30 transition-colors active:cursor-grabbing shadow-sm"
                  style={{ borderColor: node.color + '40' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{node.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{node.label}</h4>
                        <Badge
                          variant="outline"
                          className={`text-xs ${categoryColors[node.category]}`}
                        >
                          {node.category}
                        </Badge>
                      </div>
                      {/* Description and IO details intentionally hidden for a cleaner UI */}
                    </div>
                  </div>
                </div>
              ))}

              {filteredNodes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No nodes found</p>
                  <p className="text-xs mt-1">Try adjusting your search or category filter</p>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
