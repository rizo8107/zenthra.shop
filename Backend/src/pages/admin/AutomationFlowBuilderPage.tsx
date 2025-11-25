import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type Connection,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Loader2, Save, Share2, Trash2, Zap, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFlow, listRunSteps, listRuns, updateFlow, triggerTestRun } from '@/features/automation/api';
import type { FlowRun, FlowRunStep, FlowSummary, FlowNode, FlowEdge, RunStatus } from '@/features/automation/types';
import { NodePalette } from '@/features/automation/components/NodePalette';
import { NodeConfigEditor } from '@/features/automation/components/NodeConfigEditor';
import { nodeTypes } from '@/features/automation/nodes/nodeTypes';
import { getNodeDefinition } from '@/features/automation/nodes/nodeDefinitions';

type CanvasNode = Node<FlowNode['data']>;
type CanvasEdge = Edge<FlowEdge['data']>;

function FlowBuilderContent({ flowId }: { flowId: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [flow, setFlow] = useState<FlowSummary | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runSteps, setRunSteps] = useState<FlowRunStep[]>([]);
  const [runStepsLoading, setRunStepsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [runningNodes, setRunningNodes] = useState<Set<string>>(new Set());
  const [errorLogs, setErrorLogs] = useState<Array<{ id: string, message: string, timestamp: Date, nodeId?: string }>>([]);
  const [apiHealth, setApiHealth] = useState<{ status: 'online' | 'offline' | 'checking', url: string }>({
    status: 'checking',
    url: window.location.origin
  });

  const loadFlow = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFlow(flowId);
      setFlow(data);
      setFlowName(data.name);
      setFlowDescription(data.description || '');
      // Ensure all nodes have the correct type for ReactFlow
      const normalizedNodes = (data.canvasJson?.nodes ?? []).map((node) => ({
        ...node,
        type: 'customNode', // Ensure all nodes use our custom component
      })) as CanvasNode[];

      setNodes(normalizedNodes);
      setEdges((data.canvasJson?.edges ?? []) as CanvasEdge[]);
      if (data.canvasJson?.nodes?.[0]) {
        setSelectedNodeId(data.canvasJson.nodes[0].id);
      }
    } catch (error) {
      console.error('Unable to load flow', error);
      toast({ title: 'Error', description: 'Failed to load flow details.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [flowId, toast]);

  const loadRuns = useCallback(async () => {
    try {
      const latestRuns = await listRuns(flowId);
      setRuns(latestRuns);
      if (latestRuns[0]) {
        setSelectedRunId(latestRuns[0].id);
      }
    } catch (error) {
      console.error('Unable to load runs', error);
    }
  }, [flowId]);

  useEffect(() => {
    void loadFlow();
    void loadRuns();
  }, [loadFlow, loadRuns]);

  useEffect(() => {
    if (!selectedRunId) return;
    setRunSteps([]);
    setRunStepsLoading(true);
    void (async () => {
      try {
        const steps = await listRunSteps(selectedRunId);
        setRunSteps(steps);
      } catch (error) {
        console.error('Failed to load run steps', error);
      } finally {
        setRunStepsLoading(false);
      }
    })();
  }, [selectedRunId]);

  // API Health Check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (response.ok) {
          setApiHealth({
            status: 'online',
            url: window.location.origin
          });
        } else {
          setApiHealth({
            status: 'offline',
            url: window.location.origin
          });
        }
      } catch (error) {
        setApiHealth({
          status: 'offline',
          url: window.location.origin
        });
      }
    };

    // Initial check
    void checkHealth();

    // Check every 30 seconds
    const interval = setInterval(() => {
      void checkHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const runStatusVariant: Record<RunStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    queued: 'outline',
    running: 'default',
    success: 'secondary',
    failed: 'destructive',
    canceled: 'outline',
  };

  const formatPayload = (payload?: Record<string, unknown>): string => {
    if (!payload) return 'No data captured';
    try {
      const isEmptyObject =
        typeof payload === 'object' && payload !== null && Object.keys(payload as Record<string, unknown>).length === 0;
      if (isEmptyObject) {
        return 'No data captured';
      }
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({
      ...connection,
      type: 'default',
      animated: false,
      style: { stroke: '#64748b', strokeWidth: 2 }
    }, eds));
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    if (confirm('Remove this connection?')) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
  }, []);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);

  const handleNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onNodeDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    setDraggedNodeType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    if (!draggedNodeType) return;

    const reactFlowBounds = (event.target as Element).closest('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const position = {
      x: event.clientX - reactFlowBounds.left - 100, // Offset to center the node
      y: event.clientY - reactFlowBounds.top - 50,
    };

    const nodeDefinition = getNodeDefinition(draggedNodeType);
    if (!nodeDefinition) return;

    const newNode: CanvasNode = {
      id: `${draggedNodeType}-${Date.now()}`,
      type: 'customNode',
      position,
      data: {
        label: nodeDefinition.label,
        type: draggedNodeType,
        config: nodeDefinition.config.reduce((acc, field) => {
          if (field.defaultValue !== undefined) {
            acc[field.key] = field.defaultValue;
          }
          return acc;
        }, {} as Record<string, unknown>),
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setDraggedNodeType(null);
  }, [draggedNodeType]);

  const handleNodeConfigChange = useCallback((nodeId: string, config: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config } }
          : node
      )
    );
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  const simulateNodeExecution = useCallback(() => {
    if (nodes.length === 0) return;

    // Clear previous running state
    setRunningNodes(new Set());
    setErrorLogs([]);

    // Find trigger nodes to start simulation
    const triggerNodes = nodes.filter(node => {
      const nodeData = node.data as Record<string, unknown>;
      return nodeData?.type?.toString().startsWith('trigger.');
    });

    if (triggerNodes.length === 0) return;

    // Start with the first trigger node
    const startNode = triggerNodes[0];
    const executionOrder: string[] = [startNode.id];

    // Simple execution simulation - follow edges
    const visited = new Set<string>();
    const queue = [startNode.id];

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      // Find connected nodes
      const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);
      outgoingEdges.forEach(edge => {
        if (!visited.has(edge.target)) {
          executionOrder.push(edge.target);
          queue.push(edge.target);
        }
      });
    }

    // Animate nodes in execution order
    executionOrder.forEach((nodeId, index) => {
      setTimeout(() => {
        setRunningNodes(prev => new Set([...prev, nodeId]));

        // Simulate random errors occasionally
        if (Math.random() < 0.1) { // 10% chance of error
          setTimeout(() => {
            setErrorLogs(prev => [...prev, {
              id: `error-${Date.now()}`,
              message: `Simulated error in node execution`,
              timestamp: new Date(),
              nodeId: nodeId
            }]);
          }, 500);
        }

        // Remove running state after execution
        setTimeout(() => {
          setRunningNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(nodeId);
            return newSet;
          });
        }, 1500);
      }, index * 800); // 800ms delay between nodes
    });
  }, [nodes, edges]);

  const handleSave = async () => {
    if (!flow) return;
    try {
      setSaving(true);
      await updateFlow(flow.id, {
        name: flowName,
        description: flowDescription,
        canvasJson: {
          nodes: nodes as unknown as FlowNode[],
          edges: edges as unknown as FlowEdge[],
        },
      });
      toast({ title: 'Changes saved', description: 'Your automation is up to date.' });
      void loadFlow();
    } catch (error) {
      console.error('Failed to save', error);
      toast({ title: 'Error', description: 'Unable to save changes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestRun = async () => {
    if (!flow) return;
    try {
      // Find manual trigger nodes and use their test data
      const manualTriggers = nodes.filter(node => {
        const nodeData = node.data as Record<string, unknown>;
        return nodeData?.type === 'trigger.manual';
      });

      let testData = { trigger: 'manual_test' };

      if (manualTriggers.length > 0) {
        const triggerNode = manualTriggers[0];
        const nodeData = triggerNode.data as Record<string, unknown>;
        const config = nodeData?.config as Record<string, unknown>;

        if (config?.testData) {
          try {
            const parsedTestData = typeof config.testData === 'string'
              ? JSON.parse(config.testData)
              : config.testData;
            testData = { ...testData, ...parsedTestData };
          } catch (e) {
            console.warn('Invalid test data JSON in manual trigger, using default');
          }
        }
      }

      // Start the test run
      const run = await triggerTestRun(flow.id, testData);

      // Simulate node execution animation
      simulateNodeExecution();

      toast({
        title: 'Test run started',
        description: manualTriggers.length > 0
          ? 'Test execution initiated with manual trigger data.'
          : 'Test execution initiated.'
      });

      // Refresh runs immediately and then periodically
      void loadRuns();

      // Poll for run updates every 2 seconds for 30 seconds
      const pollInterval = setInterval(async () => {
        await loadRuns();

        // Check if run is completed
        const updatedRuns = await listRuns(flow.id);
        const currentRun = updatedRuns.find(r => r.id === run.id);

        if (currentRun && (currentRun.status === 'success' || currentRun.status === 'failed')) {
          clearInterval(pollInterval);

          // Load run steps to show in error logs if failed
          if (currentRun.status === 'failed') {
            const steps = await listRunSteps(currentRun.id);
            const failedSteps = steps.filter(step => step.status === 'failed');

            failedSteps.forEach(step => {
              setErrorLogs(prev => [...prev, {
                id: `step-error-${step.id}`,
                message: step.error || 'Step execution failed',
                timestamp: new Date(step.finishedAt || step.startedAt),
                nodeId: step.nodeId
              }]);
            });
          }
        }
      }, 2000);

      // Stop polling after 30 seconds
      setTimeout(() => clearInterval(pollInterval), 30000);
    } catch (error) {
      console.error('Failed to trigger test run', error);
      toast({ title: 'Error', description: 'Unable to start test run.', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async () => {
    if (!flow) return;
    try {
      const newStatus = flow.status === 'active' ? 'draft' : 'active';
      await updateFlow(flow.id, { status: newStatus });
      toast({
        title: newStatus === 'active' ? 'Flow activated' : 'Flow deactivated',
        description: newStatus === 'active'
          ? 'Your automation is now live and will trigger on events.'
          : 'Your automation has been paused.'
      });
      void loadFlow();
    } catch (error) {
      console.error('Failed to toggle status', error);
      toast({ title: 'Error', description: 'Unable to update flow status.', variant: 'destructive' });
    }
  };

  if (loading || !flow) {
    return (
      <AdminLayout>
        <div className="flex h-[calc(100vh-160px)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-9 h-9 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading builder...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 space-y-8 max-w-none px-4 overflow-hidden">
        {/* Header */}
        <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin/automation')}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Flow builder</h1>
                  <p className="text-sm text-muted-foreground">
                    Design your automation canvas with triggers, logic, and actions.
                  </p>
                  {/* API Status Indicator */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`w-2 h-2 rounded-full ${apiHealth.status === 'online' ? 'bg-green-500 animate-pulse' :
                        apiHealth.status === 'offline' ? 'bg-red-500' :
                          'bg-yellow-500 animate-pulse'
                        }`} />
                      <span className="text-muted-foreground">API:</span>
                      <Badge
                        variant={apiHealth.status === 'online' ? 'secondary' : 'destructive'}
                        className="text-[10px] uppercase tracking-wide"
                      >
                        {apiHealth.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">•</span>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {apiHealth.url}
                    </code>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTestRun}>
                <Zap className="w-4 h-4 mr-2" />
                Test run
              </Button>
              <Button
                variant={flow.status === 'active' ? 'outline' : 'default'}
                size="sm"
                onClick={handleToggleStatus}
              >
                {flow.status === 'active' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    Active
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                    Activate
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] xl:grid-cols-[300px_minmax(0,1fr)_360px] overflow-hidden">
          {/* Node Palette */}
          <div className="space-y-6 min-w-0">
            <NodePalette onNodeDragStart={onNodeDragStart} />
          </div>

          {/* Canvas */}
          <div className="rounded-xl border bg-card min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div>
                    <Input
                      value={flowName}
                      onChange={(e) => setFlowName(e.target.value)}
                      className="text-xl font-semibold border-none p-0 h-auto bg-transparent"
                      placeholder="Flow name"
                    />
                    <Input
                      value={flowDescription}
                      onChange={(e) => setFlowDescription(e.target.value)}
                      className="text-xs text-muted-foreground border-none p-0 h-auto bg-transparent mt-1"
                      placeholder="Add description..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={flow.status === 'active' ? 'default' : 'secondary'}>
                  {flow.status}
                </Badge>
              </div>
            </div>

            <div
              className="relative h-[60vh] min-h-[420px] max-h-[820px]"
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <ReactFlow
                nodes={nodes.map(node => ({
                  ...node,
                  data: {
                    ...node.data,
                    isRunning: runningNodes.has(node.id),
                    hasError: errorLogs.some(log => log.nodeId === node.id)
                  }
                }))}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onEdgeClick={onEdgeClick}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background gap={18} size={1} />
                <MiniMap pannable zoomable />
                <Controls position="bottom-right" />
                <Panel position="top-right" className="rounded-md bg-background/90 px-4 py-2 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase">Metrics</p>
                  <div className="mt-2 flex items-center gap-6 text-sm">
                    <span>{nodes.length} nodes</span>
                    <span>{edges.length} connections</span>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 min-w-0 overflow-hidden">
            <Tabs defaultValue="inspector" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="inspector">Builder</TabsTrigger>
                <TabsTrigger value="runs">Run history</TabsTrigger>
              </TabsList>

              <TabsContent value="inspector" className="mt-4 space-y-6">
                {/* Node Inspector */}
                {selectedNode ? (
                  <NodeConfigEditor
                    nodeId={selectedNode.id}
                    nodeType={(selectedNode.data as Record<string, unknown>)?.type as string || 'unknown'}
                    config={(selectedNode.data as Record<string, unknown>)?.config as Record<string, unknown> || {}}
                    onConfigChange={handleNodeConfigChange}
                    onDeleteNode={handleDeleteNode}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Node inspector
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center text-sm text-muted-foreground py-10">
                        Select a node to inspect configuration
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Error Logs */}
                {errorLogs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">Error Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                      {errorLogs.map((error) => (
                        <div key={error.id} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <div className="font-medium text-red-800">{error.message}</div>
                          <div className="text-red-600 mt-1">
                            {error.nodeId && `Node: ${error.nodeId}`} • {error.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="runs" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Run history</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {runs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No executions yet. Trigger a test run once your flow is ready.</p>
                    ) : (
                      <Tabs value={selectedRunId ?? runs[0]?.id} onValueChange={setSelectedRunId}>
                        <TabsList className="flex w-full flex-col gap-2 bg-transparent p-0">
                          {runs.slice(0, 3).map((run) => {
                            const isActive = (selectedRunId ?? runs[0]?.id) === run.id;
                            return (
                              <TabsTrigger
                                key={run.id}
                                value={run.id}
                                className="flex w-full flex-col items-start gap-1 rounded-lg border bg-muted/30 px-3 py-2 text-left data-[state=active]:border-primary data-[state=active]:bg-muted/60"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant={runStatusVariant[run.status]} className="text-[10px] uppercase tracking-wide">
                                    {run.status}
                                  </Badge>
                                  {run.testMode && (
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Test</Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(run.startedAt).toLocaleString()}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {run.finishedAt
                                    ? `${Math.max(0, (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1)}s`
                                    : isActive ? 'Viewing…' : 'Running'}
                                </span>
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                        {runs.slice(0, 3).map((run) => {
                          const isActiveRun = run.id === (selectedRunId ?? runs[0]?.id);
                          const stepStatusVariant = (status: FlowRunStep['status']) =>
                            status === 'success'
                              ? 'secondary'
                              : status === 'failed'
                                ? 'destructive'
                                : status === 'running'
                                  ? 'default'
                                  : 'outline';

                          return (
                            <TabsContent key={run.id} value={run.id} className="mt-4">
                              <div className="space-y-4 text-sm">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-lg border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground uppercase">Trigger</p>
                                    <p className="mt-1 font-medium capitalize">{run.triggerType}</p>
                                  </div>
                                  <div className="rounded-lg border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground uppercase">Duration</p>
                                    <p className="mt-1 font-medium">
                                      {run.finishedAt
                                        ? `${Math.max(0, (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1)}s`
                                        : 'In progress'}
                                    </p>
                                  </div>
                                  <div className="rounded-lg border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground uppercase">Started</p>
                                    <p className="mt-1 font-medium">{new Date(run.startedAt).toLocaleString()}</p>
                                  </div>
                                  <div className="rounded-lg border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground uppercase">Completed</p>
                                    <p className="mt-1 font-medium">
                                      {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '—'}
                                    </p>
                                  </div>
                                </div>

                                {run.error && (
                                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                                    <p className="text-destructive font-semibold">Run error</p>
                                    <p className="text-destructive/80 mt-1 text-xs">{run.error}</p>
                                  </div>
                                )}

                                <div className="rounded-xl border bg-muted/40 p-4">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Step events</p>
                                    {isActiveRun && runStepsLoading && (
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Loading…
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-3 space-y-3">
                                    {!isActiveRun ? (
                                      <p className="text-xs text-muted-foreground">Select this run to view detailed node output.</p>
                                    ) : runStepsLoading ? (
                                      <p className="text-xs text-muted-foreground">Fetching step logs…</p>
                                    ) : runSteps.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">No step events recorded for this execution.</p>
                                    ) : (
                                      runSteps.map((step) => {
                                        const nodeDefinition = getNodeDefinition(step.nodeType);
                                        const nodeLabel = nodeDefinition?.label ?? step.nodeType;
                                        const started = new Date(step.startedAt);
                                        const finished = step.finishedAt ? new Date(step.finishedAt) : null;
                                        const duration = finished
                                          ? `${Math.max(0, (finished.getTime() - started.getTime()) / 1000).toFixed(1)}s`
                                          : '—';

                                        return (
                                          <div key={step.id} className="rounded-lg border bg-background p-3 shadow-sm">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                              <div>
                                                <p className="text-sm font-semibold">{nodeLabel}</p>
                                                <p className="text-[11px] text-muted-foreground">{step.nodeType}</p>
                                                <p className="text-[11px] text-muted-foreground">Node ID: {step.nodeId}</p>
                                              </div>
                                              <div className="flex flex-col items-start gap-2 text-[11px] text-muted-foreground sm:items-end">
                                                <Badge variant={stepStatusVariant(step.status)} className="text-[10px] uppercase tracking-wide">
                                                  {step.status}
                                                </Badge>
                                                <p>Duration: {duration}</p>
                                                <p>Started: {started.toLocaleTimeString()}</p>
                                                <p>Finished: {finished ? finished.toLocaleTimeString() : '—'}</p>
                                              </div>
                                            </div>

                                            {step.error && (
                                              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
                                                {step.error}
                                              </p>
                                            )}

                                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                              <details className="group rounded-md border bg-muted/30 p-2">
                                                <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground group-open:text-foreground">
                                                  Input payload
                                                </summary>
                                                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-background/80 p-2 text-[11px]">
                                                  {formatPayload(step.input)}
                                                </pre>
                                              </details>
                                              <details className="group rounded-md border bg-muted/30 p-2">
                                                <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground group-open:text-foreground">
                                                  Output payload
                                                </summary>
                                                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-background/80 p-2 text-[11px]">
                                                  {formatPayload(step.output)}
                                                </pre>
                                              </details>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

const AutomationFlowBuilderPage: React.FC = () => {
  const { flowId } = useParams<{ flowId: string }>();

  if (!flowId) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-12">
          <p className="text-center text-muted-foreground">Invalid flow ID</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <ReactFlowProvider>
      <FlowBuilderContent flowId={flowId} />
    </ReactFlowProvider>
  );
};

export default AutomationFlowBuilderPage;
