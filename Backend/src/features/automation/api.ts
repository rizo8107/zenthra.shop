import { pb } from '@/lib/pocketbase';
import type {
  FlowSummary,
  FlowCanvas,
  FlowRun,
  FlowRunStep,
} from './types';
import { executeFlow } from './flowExecutor';

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
  console.log('🎬 ========== TRIGGER TEST RUN ==========');
  console.log('📋 Flow ID:', flowId);
  console.log('📋 Input:', input);
  
  // Get the flow first
  console.log('⏳ Fetching flow details...');
  const flow = await getFlow(flowId);
  console.log('✅ Flow fetched:', flow.name);
  console.log('📊 Canvas:', flow.canvasJson);
  
  // Create the initial run record
  console.log('⏳ Creating run record...');
  const record = await pb.collection(COLLECTIONS.runs).create<RunRecord>({
    flow_id: flowId,
    status: 'queued',
    trigger_type: 'manual',
    test_mode: true,
    started_at: new Date().toISOString(),
    input_event: input,
  } as unknown as RunRecord);
  console.log('✅ Run record created:', record.id);

  // Start real execution
  console.log('🚀 Starting flow execution in background...');
  setTimeout(async () => {
    try {
      console.log('⏳ Calling executeFlow...');
      await executeFlow(record.id, flowId, flow.canvasJson, input);
      console.log('✅ executeFlow completed');
    } catch (error) {
      console.error('❌ Flow execution failed:', error);
    }
  }, 100);

  console.log('✅ Test run triggered, returning run object');
  return mapRun(record);
}
