import { pb } from '../../lib/pocketbase.js';
import { executeFlowRun } from './engine.js';
const COLLECTIONS = {
    flows: 'flows',
    runs: 'runs',
    runSteps: 'run_steps',
};
const mapFlow = (record) => ({
    id: record.id,
    name: record.name,
    description: record.description,
    status: record.status,
    version: record.version,
    canvasJson: record.canvas_json,
    createdAt: record.created,
    updatedAt: record.updated,
});
const mapRun = (record) => ({
    id: record.id,
    flowId: record.flow_id,
    triggerType: record.trigger_type,
    status: record.status,
    startedAt: record.started_at,
    finishedAt: record.finished_at,
    error: record.error,
    testMode: record.test_mode,
});
const mapRunStep = (record) => ({
    id: record.id,
    runId: record.run_id,
    nodeId: record.node_id,
    nodeType: record.node_type,
    status: record.status,
    startedAt: record.started_at,
    finishedAt: record.finished_at,
    input: record.input,
    output: record.output,
    error: record.error,
});
export async function listFlows() {
    const response = await pb
        .collection(COLLECTIONS.flows)
        .getList(1, 100, { sort: '-updated' });
    return response.items.map(mapFlow);
}
export async function getFlow(flowId) {
    const record = await pb
        .collection(COLLECTIONS.flows)
        .getOne(flowId);
    return mapFlow(record);
}
export async function createFlow(payload) {
    const record = await pb.collection(COLLECTIONS.flows).create({
        name: payload.name,
        description: payload.description,
        status: 'draft',
        version: 1,
        canvas_json: payload.canvasJson,
    });
    return mapFlow(record);
}
export async function updateFlow(flowId, payload) {
    const updatePayload = {};
    if (payload.name)
        updatePayload.name = payload.name;
    if (payload.description !== undefined)
        updatePayload.description = payload.description;
    if (payload.status)
        updatePayload.status = payload.status;
    if (payload.canvasJson)
        updatePayload.canvas_json = payload.canvasJson;
    if (payload.version !== undefined)
        updatePayload.version = payload.version;
    const record = await pb
        .collection(COLLECTIONS.flows)
        .update(flowId, updatePayload);
    return mapFlow(record);
}
export async function deleteFlow(flowId) {
    await pb.collection(COLLECTIONS.flows).delete(flowId);
}
export async function duplicateFlow(flowId) {
    const originalFlow = await getFlow(flowId);
    const duplicatedFlow = await createFlow({
        name: `${originalFlow.name} (Copy)`,
        description: originalFlow.description,
        canvasJson: originalFlow.canvasJson,
    });
    return duplicatedFlow;
}
export async function listRuns(flowId) {
    const response = await pb
        .collection(COLLECTIONS.runs)
        .getList(1, 50, {
        filter: `flow_id = "${flowId}"`,
        sort: '-started_at',
    });
    return response.items.map(mapRun);
}
export async function listRunSteps(runId) {
    const response = await pb
        .collection(COLLECTIONS.runSteps)
        .getList(1, 200, {
        filter: `run_id = "${runId}"`,
        sort: '+started_at',
    });
    return response.items.map(mapRunStep);
}
export async function triggerTestRun(flowId, input) {
    // Validate flowId
    if (!flowId || typeof flowId !== 'string' || flowId.trim().length === 0) {
        throw new Error('Invalid flowId: must be a non-empty string');
    }
    // Validate flowId format (basic alphanumeric check)
    if (!/^[a-zA-Z0-9_-]+$/.test(flowId)) {
        throw new Error('Invalid flowId format');
    }
    // Validate input is an object
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new Error('Invalid input: must be a non-null object');
    }
    // Create the initial run record
    const record = await pb.collection(COLLECTIONS.runs).create({
        flow_id: flowId,
        status: 'queued',
        trigger_type: 'manual',
        test_mode: true,
        started_at: new Date().toISOString(),
        input_event: input,
    });
    // Start mock execution simulation
    setTimeout(async () => {
        try {
            await simulateRunExecution(record.id, flowId, input);
        }
        catch (error) {
            console.error('Mock execution failed:', error);
            // Update run record to failed status
            try {
                await pb.collection(COLLECTIONS.runs).update(record.id, {
                    status: 'failed',
                    finished_at: new Date().toISOString(),
                    error: error instanceof Error ? error.message : 'Unknown execution error',
                });
            }
            catch (updateError) {
                console.error('Failed to update run status:', updateError);
            }
        }
    }, 100);
    return mapRun(record);
}
// Mock execution simulation
async function simulateRunExecution(runId, flowId, input) {
    try {
        // Update run to running
        await pb.collection(COLLECTIONS.runs).update(runId, {
            status: 'running',
        });
        // Get flow to simulate node execution
        const flow = await getFlow(flowId);
        const nodes = flow.canvasJson?.nodes || [];
        // Find trigger nodes
        const triggerNodes = nodes.filter(node => node.data?.type?.toString().startsWith('trigger.'));
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
    }
    catch (error) {
        // Handle execution errors
        await pb.collection(COLLECTIONS.runs).update(runId, {
            status: 'failed',
            finished_at: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown execution error',
        });
    }
}
/**
 * Trigger a REAL flow run using the actual engine (not simulation)
 * This executes the flow with real PocketBase queries and WhatsApp sends
 */
export async function triggerRealRun(flowId) {
    // Validate flowId
    if (!flowId || typeof flowId !== 'string' || flowId.trim().length === 0) {
        throw new Error('Invalid flowId: must be a non-empty string');
    }
    // Get the flow
    const flow = await getFlow(flowId);
    if (!flow) {
        throw new Error('Flow not found');
    }
    // Create input event for manual trigger
    const inputEvent = {
        trigger: 'manual',
        flowId: flow.id,
        triggered_at: new Date().toISOString(),
        manual_run: true,
    };
    // Create the run record
    const record = await pb.collection(COLLECTIONS.runs).create({
        flow_id: flowId,
        status: 'queued',
        trigger_type: 'manual',
        test_mode: false, // This is a REAL run
        started_at: new Date().toISOString(),
        input_event: inputEvent,
    });
    // Execute the flow using the REAL engine (in background)
    executeFlowRun(record.id, flow, inputEvent).catch(error => {
        console.error(`[api] Real run execution failed for ${record.id}:`, error);
    });
    return mapRun(record);
}
