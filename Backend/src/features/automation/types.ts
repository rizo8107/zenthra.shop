export type FlowStatus = 'draft' | 'active' | 'archived';

export interface FlowSummary {
  id: string;
  name: string;
  description?: string;
  status: FlowStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  canvasJson: FlowCanvas;
}

export interface FlowCanvas {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    config?: Record<string, unknown>;
    connectionId?: string;
    [key: string]: unknown;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, unknown>;
}

export type RunStatus = 'queued' | 'running' | 'success' | 'failed' | 'canceled';

export interface FlowRun {
  id: string;
  flowId: string;
  status: RunStatus;
  triggerType: string;
  startedAt: string;
  finishedAt?: string;
  testMode: boolean;
  error?: string;
}

export interface FlowRunStep {
  id: string;
  runId: string;
  nodeId: string;
  nodeType: string;
  status: RunStatus | 'pending';
  startedAt: string;
  finishedAt?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface ConnectionSummary {
  id: string;
  name: string;
  type: string;
}
