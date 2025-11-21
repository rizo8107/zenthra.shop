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
      <Card className="min-w-[160px] border-red-500">
        <CardContent className="p-2">
          <div className="text-red-500 text-xs">Missing node data</div>
        </CardContent>
      </Card>
    );
  }

  const nodeDefinition = getNodeDefinition(nodeData.type);

  if (!nodeDefinition) {
    return (
      <Card className="min-w-[160px] border-red-500">
        <CardContent className="p-2">
          <div className="text-red-500 text-xs">Unknown: {nodeData.type}</div>
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
    let className = 'min-w-[160px] max-w-[200px] transition-all duration-300 shadow-sm';

    if (selected) {
      className += ' ring-1 ring-primary ring-offset-1';
    }

    if (nodeData.isRunning) {
      className += ' animate-pulse ring-1 ring-blue-400 ring-offset-1 shadow-md shadow-blue-200';
    }

    if (nodeData.hasError) {
      className += ' ring-1 ring-red-400 ring-offset-1 shadow-md shadow-red-200';
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
            width: '8px',
            height: '8px',
          }}
          className="border-2 border-background"
        />
      ))}

      <CardHeader className="p-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{nodeDefinition.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs truncate">{nodeDefinition.label}</div>
            <Badge
              variant="outline"
              className={`text-[9px] px-1 py-0 h-4 ${categoryColors[nodeDefinition.category]}`}
            >
              {nodeDefinition.category}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="hidden" />

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
            width: '8px',
            height: '8px',
          }}
          className="border-2 border-background"
        />
      ))}
    </Card>
  );
}

