import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getNodeDefinition } from './nodeDefinitions';

interface CustomNodeData {
  label: string;
  type: string;
  config?: Record<string, unknown>;
  isRunning?: boolean;
  hasError?: boolean;
  [key: string]: unknown;
}

export function CustomNode({ data, selected }: NodeProps) {
  const nodeData = data as CustomNodeData;
  
  if (!nodeData || !nodeData.type) {
    return (
      <Card className="min-w-[200px] border-red-500">
        <CardContent className="p-3">
          <div className="text-red-500 text-sm">Missing node data or type</div>
        </CardContent>
      </Card>
    );
  }
  
  const nodeDefinition = getNodeDefinition(nodeData.type);
  
  if (!nodeDefinition) {
    return (
      <Card className="min-w-[200px] border-red-500">
        <CardContent className="p-3">
          <div className="text-red-500 text-sm">Unknown node type: {nodeData.type}</div>
        </CardContent>
      </Card>
    );
  }

  const categoryColors = {
    trigger: 'bg-green-100 text-green-800 border-green-200',
    data: 'bg-blue-100 text-blue-800 border-blue-200',
    logic: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    messaging: 'bg-purple-100 text-purple-800 border-purple-200',
    payments: 'bg-red-100 text-red-800 border-red-200',
    utilities: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const getCardClassName = () => {
    let className = 'min-w-[200px] max-w-[250px] transition-all duration-300';
    
    if (selected) {
      className += ' ring-2 ring-primary ring-offset-2';
    }
    
    if (nodeData.isRunning) {
      className += ' animate-pulse ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-200';
    }
    
    if (nodeData.hasError) {
      className += ' ring-2 ring-red-400 ring-offset-2 shadow-lg shadow-red-200';
    }
    
    return className;
  };

  return (
    <Card 
      className={getCardClassName()}
      style={{ borderColor: nodeDefinition.color }}
    >
      {/* Input Handles */}
      {nodeDefinition.inputs?.map((input, index) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{
            top: `${((index + 1) * 100) / (nodeDefinition.inputs!.length + 1)}%`,
            background: input.type === 'control' ? '#ff6b6b' : '#4dabf7',
          }}
          className="w-3 h-3"
        />
      ))}

      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{nodeDefinition.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{nodeDefinition.label}</div>
            <Badge 
              variant="outline" 
              className={`text-xs ${categoryColors[nodeDefinition.category]}`}
            >
              {nodeDefinition.category}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        <div className="text-xs text-muted-foreground mb-2">
          {nodeDefinition.description}
        </div>
        
        {/* Show key config values */}
        {nodeData.config && Object.keys(nodeData.config).length > 0 && (
          <div className="space-y-1">
            {Object.entries(nodeData.config)
              .slice(0, 2) // Show only first 2 config items
              .map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="font-medium text-muted-foreground">{key}:</span>{' '}
                  <span className="text-foreground">
                    {typeof value === 'string' && value.length > 20
                      ? `${value.substring(0, 20)}...`
                      : String(value)}
                  </span>
                </div>
              ))}
            {Object.keys(nodeData.config).length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{Object.keys(nodeData.config).length - 2} more...
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Output Handles */}
      {nodeDefinition.outputs?.map((output, index) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{
            top: `${((index + 1) * 100) / (nodeDefinition.outputs!.length + 1)}%`,
            background: output.type === 'control' ? '#ff6b6b' : '#4dabf7',
          }}
          className="w-3 h-3"
        />
      ))}
    </Card>
  );
}

