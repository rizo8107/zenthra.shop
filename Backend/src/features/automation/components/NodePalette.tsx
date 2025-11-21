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
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="pb-2 px-0 pt-0">
        <CardTitle className="text-sm font-medium mb-2">Node Palette</CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-2 h-7">
            <TabsTrigger value="all" className="text-[10px] px-1 h-5">All</TabsTrigger>
            <TabsTrigger value="trigger" className="text-[10px] px-1 h-5">Triggers</TabsTrigger>
            <TabsTrigger value="data" className="text-[10px] px-1 h-5">Data</TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-4 w-full mb-3 h-7">
            <TabsTrigger value="logic" className="text-[10px] px-1 h-5">Logic</TabsTrigger>
            <TabsTrigger value="messaging" className="text-[10px] px-1 h-5">Msgs</TabsTrigger>
            <TabsTrigger value="payments" className="text-[10px] px-1 h-5">Pay</TabsTrigger>
            <TabsTrigger value="utilities" className="text-[10px] px-1 h-5">Utils</TabsTrigger>
          </TabsList>

          <div className="pb-4">
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {getFilteredNodes().map((node) => (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(event) => onNodeDragStart(event, node.type)}
                  className="p-2 border rounded-md cursor-grab hover:bg-accent hover:border-accent-foreground/20 transition-colors active:cursor-grabbing bg-card"
                  style={{ borderColor: node.color + '40' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{node.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-xs truncate">{node.label}</h4>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 h-4 ${categoryColors[node.category]}`}
                        >
                          {node.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {getFilteredNodes().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-xs">No nodes found</p>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
