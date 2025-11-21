import { pb } from '@/lib/pocketbase';
import type {
  FlowSummary,
  FlowCanvas,
  FlowRun,
  FlowRunStep,
} from './types';

type FlowRecord = {
  id: string;
  name: string;
  description?: string;
  status: string;
  version: number;
  canvas_json: FlowCanvas;
  created: string;
  updated: string;
};

type RunRecord = {
  id: string;
  flow_id: string;
  trigger_type: string;
  status: string;
  started_at: string;
  finished_at?: string;
  error?: string;
  test_mode: boolean;
};

type RunStepRecord = {
  id: string;
  run_id: string;
  node_id: string;
  node_type: string;
  status: string;
  started_at: string;
  finished_at?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
};

const COLLECTIONS = {
  flows: 'flows',
  runs: 'runs',
  runSteps: 'run_steps',
} as const;

const mapFlow = (record: FlowRecord): FlowSummary => ({
  id: record.id,
  name: record.name,
  description: record.description,
  status: record.status as FlowSummary['status'],
  version: record.version,
  canvasJson: record.canvas_json,
  createdAt: record.created,
  updatedAt: record.updated,
});

const mapRun = (record: RunRecord): FlowRun => ({
  id: record.id,
  flowId: record.flow_id,
  triggerType: record.trigger_type,
  status: record.status as FlowRun['status'],
  startedAt: record.started_at,
  finishedAt: record.finished_at,
  error: record.error,
  testMode: record.test_mode,
});

const mapRunStep = (record: RunStepRecord): FlowRunStep => ({
  id: record.id,
  runId: record.run_id,
  nodeId: record.node_id,
  nodeType: record.node_type,
  status: record.status as FlowRunStep['status'],
  startedAt: record.started_at,
  finishedAt: record.finished_at,
  input: record.input,
  output: record.output,
  error: record.error,
});

export async function listFlows(): Promise<FlowSummary[]> {
  const response = await pb
    .collection(COLLECTIONS.flows)
    .getList<FlowRecord>(1, 100, { sort: '-updated' });

  return response.items.map(mapFlow);
}

export async function getFlow(flowId: string): Promise<FlowSummary> {
  const record = await pb
    .collection(COLLECTIONS.flows)
    .getOne<FlowRecord>(flowId);

  return mapFlow(record);
}

export async function createFlow(payload: {
  name: string;
  description?: string;
  canvasJson: FlowCanvas;
}): Promise<FlowSummary> {
  const record = await pb.collection(COLLECTIONS.flows).create<FlowRecord>({
    name: payload.name,
    description: payload.description,
    status: 'draft',
    version: 1,
    canvas_json: payload.canvasJson,
  });

  return mapFlow(record);
}

export async function updateFlow(
  flowId: string,
  payload: Partial<{ name: string; description: string; status: FlowSummary['status']; canvasJson: FlowCanvas; version: number }>
): Promise<FlowSummary> {
  const updatePayload: Record<string, unknown> = {};

  if (payload.name) updatePayload.name = payload.name;
  if (payload.description !== undefined) updatePayload.description = payload.description;
  if (payload.status) updatePayload.status = payload.status;
  if (payload.canvasJson) updatePayload.canvas_json = payload.canvasJson;
  if (payload.version !== undefined) updatePayload.version = payload.version;

  const record = await pb
    .collection(COLLECTIONS.flows)
    .update<FlowRecord>(flowId, updatePayload);

  return mapFlow(record);
}

export async function deleteFlow(flowId: string): Promise<void> {
  await pb.collection(COLLECTIONS.flows).delete(flowId);
}

export async function duplicateFlow(flowId: string): Promise<FlowSummary> {
  const originalFlow = await getFlow(flowId);
  
  const duplicatedFlow = await createFlow({
    name: `${originalFlow.name} (Copy)`,
    description: originalFlow.description,
    canvasJson: originalFlow.canvasJson,
  });

  return duplicatedFlow;
}

export async function listRuns(flowId: string): Promise<FlowRun[]> {
  const response = await pb
    .collection(COLLECTIONS.runs)
    .getList<RunRecord>(1, 50, {
      filter: `flow_id = "${flowId}"`,
      sort: '-started_at',
    });

  return response.items.map(mapRun);
}

export async function listRunSteps(runId: string): Promise<FlowRunStep[]> {
  const response = await pb
    .collection(COLLECTIONS.runSteps)
    .getList<RunStepRecord>(1, 200, {
      filter: `run_id = "${runId}"`,
      sort: '+started_at',
    });

  return response.items.map(mapRunStep);
}

export async function triggerTestRun(flowId: string, input: Record<string, unknown>): Promise<FlowRun> {
  // Create the initial run record
  const record = await pb.collection(COLLECTIONS.runs).create<RunRecord>({
    flow_id: flowId,
    status: 'queued',
    trigger_type: 'manual',
    test_mode: true,
    started_at: new Date().toISOString(),
    input_event: input,
  } as unknown as RunRecord);

  // Start mock execution simulation
  setTimeout(async () => {
    try {
      await simulateRunExecution(record.id, flowId, input);
    } catch (error) {
      console.error('Mock execution failed:', error);
    }
  }, 100);

  return mapRun(record);
}

// Mock execution simulation
async function simulateRunExecution(runId: string, flowId: string, input: Record<string, unknown>) {
  try {
    // Update run to running
    await pb.collection(COLLECTIONS.runs).update(runId, {
      status: 'running',
    });

    // Get flow to simulate node execution
    const flow = await getFlow(flowId);
    const nodes = flow.canvasJson?.nodes || [];
    
    // Find trigger nodes
    const triggerNodes = nodes.filter(node => 
      node.data?.type?.toString().startsWith('trigger.')
    );

    if (triggerNodes.length === 0) {
      await pb.collection(COLLECTIONS.runs).update(runId, {
        status: 'success',
        finished_at: new Date().toISOString(),
      });
      return;
    }

    // Simulate node execution steps
    for (let i = 0; i < Math.min(nodes.length, 5); i++) {
      const node = nodes[i];
      const stepStartTime = new Date().toISOString();
      
      // Create run step
      const stepRecord = await pb.collection(COLLECTIONS.runSteps).create({
        run_id: runId,
        node_id: node.id,
        node_type: node.data?.type || 'unknown',
        status: 'running',
        started_at: stepStartTime,
        input: i === 0 ? input : { processed: true },
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Random success/failure (90% success rate)
      const success = Math.random() > 0.1;
      
      await pb.collection(COLLECTIONS.runSteps).update(stepRecord.id, {
        status: success ? 'success' : 'failed',
        finished_at: new Date().toISOString(),
        output: success ? { result: `Node ${node.id} executed successfully` } : undefined,
        error: success ? undefined : `Simulated error in node ${node.id}`,
      });

      // If a step fails, fail the entire run
      if (!success) {
        await pb.collection(COLLECTIONS.runs).update(runId, {
          status: 'failed',
          finished_at: new Date().toISOString(),
          error: `Execution failed at node ${node.id}`,
        });
        return;
      }
    }

    // Complete the run
    await pb.collection(COLLECTIONS.runs).update(runId, {
      status: 'success',
      finished_at: new Date().toISOString(),
    });

  } catch (error) {
    // Handle execution errors
    await pb.collection(COLLECTIONS.runs).update(runId, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown execution error',
    });
  }
}
