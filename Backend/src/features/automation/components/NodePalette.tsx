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

  const categories = [
    { key: 'all', label: 'All Nodes', count: Object.values(nodesByCategory).flat().length },
    { key: 'trigger', label: 'Triggers', count: nodesByCategory.trigger?.length || 0 },
    { key: 'data', label: 'Data', count: nodesByCategory.data?.length || 0 },
    { key: 'logic', label: 'Logic', count: nodesByCategory.logic?.length || 0 },
    { key: 'messaging', label: 'Messaging', count: nodesByCategory.messaging?.length || 0 },
    { key: 'payments', label: 'Payments', count: nodesByCategory.payments?.length || 0 },
    { key: 'utilities', label: 'Utilities', count: nodesByCategory.utilities?.length || 0 },
  ];

  const getFilteredNodes = (): NodeDefinition[] => {
    let nodes: NodeDefinition[] = [];
    
    if (selectedCategory === 'all') {
      nodes = Object.values(nodesByCategory).flat();
    } else {
      nodes = nodesByCategory[selectedCategory] || [];
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Node Palette</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid grid-cols-3 w-full mx-4 mb-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="trigger" className="text-xs">Triggers</TabsTrigger>
            <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-4 w-full mx-4 mb-4">
            <TabsTrigger value="logic" className="text-xs">Logic</TabsTrigger>
            <TabsTrigger value="messaging" className="text-xs">Messages</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
            <TabsTrigger value="utilities" className="text-xs">Utils</TabsTrigger>
          </TabsList>

          <div className="px-4 pb-4">
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {getFilteredNodes().map((node) => (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(event) => onNodeDragStart(event, node.type)}
                  className="p-3 border rounded-lg cursor-grab hover:bg-accent hover:border-accent-foreground/20 transition-colors active:cursor-grabbing"
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
              
              {getFilteredNodes().length === 0 && (
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
