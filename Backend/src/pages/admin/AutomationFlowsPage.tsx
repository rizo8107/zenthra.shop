import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, RefreshCcw, Workflow, Play, Copy, Zap, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createFlow, listFlows, deleteFlow, duplicateFlow, triggerTestRun } from '@/features/automation/api';
import type { FlowSummary } from '@/features/automation/types';
import { TemplateGallery } from '@/features/automation/components/TemplateGallery';
import type { FlowTemplate } from '@/features/automation/templates/flowTemplates';
import { normalizeTemplateCanvas } from '@/features/automation/templates/flowTemplates';

const EMPTY_CANVAS = { nodes: [], edges: [] };

const STATUS_STYLES: Record<FlowSummary['status'], { label: string; variant: 'default' | 'secondary' | 'outline' }>
  = {
  draft: { label: 'Draft', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  archived: { label: 'Archived', variant: 'outline' },
};

const AutomationFlowsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDescription, setNewFlowDescription] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<FlowSummary['status'] | 'all'>('all');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [apiHealth, setApiHealth] = useState<{ status: 'online' | 'offline' | 'checking', url: string }>({
    status: 'checking',
    url: window.location.origin
  });

  const filteredFlows = useMemo(() => {
    let filtered = flows;

    if (searchTerm) {
      filtered = filtered.filter((flow) =>
        flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flow.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((flow) => flow.status === selectedStatus);
    }

    return filtered;
  }, [flows, searchTerm, selectedStatus]);

  const fetchFlows = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listFlows();
      setFlows(response);
    } catch (error) {
      console.error('Failed to load flows', error);
      toast({
        title: 'Error',
        description: 'Unable to load automation flows.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchFlows();
  }, [fetchFlows]);

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

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a flow name.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCreating(true);
      const flow = await createFlow({
        name: newFlowName.trim(),
        description: newFlowDescription.trim() || undefined,
        canvasJson: EMPTY_CANVAS,
      });

      toast({
        title: 'Flow created',
        description: 'Redirecting you to the builder.'
      });

      // Reset form
      setNewFlowName('');
      setNewFlowDescription('');
      setShowCreateDialog(false);

      // Navigate to builder
      navigate(`/admin/automation/${flow.id}`);
    } catch (error) {
      console.error('Failed to create flow', error);
      toast({
        title: 'Error',
        description: 'Unable to create flow.',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateFlow = async (flowId: string, flowName: string) => {
    try {
      const duplicatedFlow = await duplicateFlow(flowId);
      toast({
        title: 'Flow duplicated',
        description: `Created "${duplicatedFlow.name}" successfully.`
      });
      await fetchFlows();
    } catch (error) {
      console.error('Failed to duplicate flow', error);
      toast({
        title: 'Error',
        description: 'Unable to duplicate flow.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteFlow = async (flowId: string, flowName: string) => {
    if (!confirm(`Are you sure you want to delete "${flowName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteFlow(flowId);
      toast({
        title: 'Flow deleted',
        description: `"${flowName}" has been deleted successfully.`
      });
      await fetchFlows();
    } catch (error) {
      console.error('Failed to delete flow', error);
      toast({
        title: 'Error',
        description: 'Unable to delete flow.',
        variant: 'destructive'
      });
    }
  };

  const handleTestRun = async (flowId: string, flowName: string) => {
    try {
      await triggerTestRun(flowId, { trigger: 'manual_test' });
      toast({
        title: 'Test run started',
        description: `Test execution initiated for "${flowName}".`
      });
    } catch (error) {
      console.error('Failed to trigger test run', error);
      toast({
        title: 'Error',
        description: 'Unable to start test run.',
        variant: 'destructive'
      });
    }
  };

  const handleUseTemplate = async (template: FlowTemplate) => {
    try {
      setCreating(true);
      const flow = await createFlow({
        name: template.name,
        description: template.description,
        canvasJson: normalizeTemplateCanvas(template.canvas),
      });

      toast({
        title: 'Template applied',
        description: `Created "${flow.name}" from template. Redirecting to builder.`
      });

      // Navigate to builder
      navigate(`/admin/automation/${flow.id}`);
    } catch (error) {
      console.error('Failed to create flow from template', error);
      toast({
        title: 'Error',
        description: 'Unable to create flow from template.',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const renderEmptyState = () => (
    <Card className="border-dashed">
      <CardContent className="py-16 text-center space-y-6">
        <Workflow className="w-12 h-12 mx-auto text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No automations yet</h3>
          <p className="text-sm text-muted-foreground">
            Build automations to personalize journeys, send reminders, trigger webhooks, and more.
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="lg" onClick={() => setShowTemplateGallery(true)} disabled={creating}>
            <Zap className="w-4 h-4 mr-2" />
            Use Template
          </Button>
          <Button size="lg" variant="outline" onClick={() => setShowCreateDialog(true)} disabled={creating}>
            <Plus className="w-4 h-4 mr-2" />
            Start from Scratch
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Automation flows</h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Launch multi-step customer journeys by chaining triggers, logic, and actions powered by your integrations.
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void fetchFlows()} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setShowTemplateGallery(true)} disabled={creating}>
              <Zap className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" />
              New flow
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <aside className="hidden md:block border rounded-lg p-4 space-y-6 bg-muted/40">
            <div>
              <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Quick filters</h2>
              <div className="space-y-2">
                <Badge
                  variant={selectedStatus === 'all' ? 'default' : 'outline'}
                  className="w-full justify-between px-3 py-2 text-sm font-normal cursor-pointer"
                  onClick={() => setSelectedStatus('all')}
                >
                  <span>All flows</span>
                  <span className="text-xs text-muted-foreground">{flows.length}</span>
                </Badge>
                {(['draft', 'active', 'archived'] as FlowSummary['status'][]).map((status) => (
                  <Badge
                    key={status}
                    variant={selectedStatus === status ? 'default' : 'outline'}
                    className="w-full justify-between px-3 py-2 text-sm font-normal cursor-pointer"
                    onClick={() => setSelectedStatus(status)}
                  >
                    <span>{STATUS_STYLES[status].label}</span>
                    <span className="text-xs text-muted-foreground">
                      {flows.filter((flow) => flow.status === status).length}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Getting started</h2>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>→ Map trigger → action sequences</li>
                <li>→ Layer waits, splits, and branches</li>
                <li>→ Test runs before activating</li>
              </ul>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Input
                placeholder="Search automations..."
                className="md:max-w-sm"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Tabs defaultValue="cards" className="md:w-auto">
                <TabsList className="grid grid-cols-2 w-full md:w-auto">
                  <TabsTrigger value="cards">Cards</TabsTrigger>
                  <TabsTrigger value="table">Table</TabsTrigger>
                </TabsList>
                <TabsContent value="cards" className="hidden" />
                <TabsContent value="table" className="hidden" />
              </Tabs>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-center space-y-3">
                  <div className="h-10 w-10 rounded-full border-b-2 border-primary animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Fetching latest flows...</p>
                </div>
              </div>
            ) : filteredFlows.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredFlows.map((flow) => {
                  const status = STATUS_STYLES[flow.status];
                  return (
                    <Card key={flow.id} className="flex flex-col">
                      <CardHeader className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-lg font-semibold leading-tight">
                            {flow.name}
                          </CardTitle>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {flow.description || 'No description provided yet.'}
                        </p>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col justify-between gap-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs uppercase">Last updated</p>
                            <p>{new Date(flow.updatedAt).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs uppercase">Version</p>
                            <p>v{flow.version ?? 1}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs uppercase">Nodes</p>
                            <p>{flow.canvasJson.nodes.length}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs uppercase">Edges</p>
                            <p>{flow.canvasJson.edges.length}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/admin/automation/${flow.id}`)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicateFlow(flow.id, flow.name)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Duplicate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestRun(flow.id, flow.name)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteFlow(flow.id, flow.name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Create Flow Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Automation Flow</DialogTitle>
              <DialogDescription>
                Enter a name and description for your new automation flow.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name">Flow Name</Label>
                <Input
                  id="flow-name"
                  placeholder="e.g., Welcome Email Sequence"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flow-description">Description (Optional)</Label>
                <Textarea
                  id="flow-description"
                  placeholder="Describe what this automation will do..."
                  value={newFlowDescription}
                  onChange={(e) => setNewFlowDescription(e.target.value)}
                  disabled={creating}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewFlowName('');
                  setNewFlowDescription('');
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateFlow} disabled={creating}>
                {creating ? 'Creating...' : 'Create & Edit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Gallery */}
        <TemplateGallery
          open={showTemplateGallery}
          onClose={() => setShowTemplateGallery(false)}
          onUseTemplate={handleUseTemplate}
        />
      </div>
    </AdminLayout>
  );
};

export default AutomationFlowsPage;
