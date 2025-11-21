// Flow Executor for Automation
import { pb } from '../lib/pocketbase.js';
import type { FlowCanvas, FlowEdge, FlowNode } from './types.js';
import axios from 'axios';

const COLLECTIONS = {
  runs: 'runs',
  runSteps: 'run_steps',
} as const;

// Helper to get WhatsApp API base URL from env or fallback
function getWhatsAppBaseUrl(): string {
  const pluginUrl = import.meta.env.VITE_WHATSAPP_PLUGIN_URL;
  if (pluginUrl) return pluginUrl;
  return import.meta.env.VITE_WHATSAPP_API_URL || 'https://crm-evolution-api.7za6uc.easypanel.host';
}

interface ExecutionContext {
  runId: string;
  flowId: string;
  data: Record<string, any>;
  nodeOutputs: Map<string, any>;
}

type ExecutionResult = { success: boolean; output?: any; error?: string };

// Execute a single node
async function executeNode(
  node: FlowNode,
  context: ExecutionContext
): Promise<ExecutionResult> {
  const nodeType = node.data?.type as string;
  const config = (node.data?.config as Record<string, any>) || {};
  console.log(`🔧 Executing node ${node.id} (${nodeType})`);

  try {
    const inputData = context.data;
    const processedConfig = processTemplates(config, inputData);

    switch (nodeType) {
      case 'trigger.manual':
      case 'trigger.cron':
        return { success: true, output: config.testData || inputData };
      case 'whatsapp.send':
        return await executeWhatsAppNode(processedConfig, inputData);
      case 'email.send':
        return await executeEmailNode(processedConfig, inputData);
      case 'pb.find':
        return await executePbFindNode(processedConfig);
      case 'pb.getOne':
        return await executePbGetOneNode(processedConfig);
      case 'pb.create':
        return await executePbCreateNode(processedConfig);
      case 'pb.update':
        return await executePbUpdateNode(processedConfig);
      case 'logic.if':
        return await executeIfNode(processedConfig, inputData);
      case 'map.transform':
        return await executeTransformNode(processedConfig, inputData);
      case 'util.delay':
        return await executeDelayNode(processedConfig, inputData);
      default:
        console.warn(`⚠️  Unknown node type: ${nodeType}`);
        return { success: true, output: { message: `Node type ${nodeType} not implemented` } };
    }
  } catch (error: any) {
    console.error(`❌ Error executing node ${node.id}:`, error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

// Process template strings like {{input.field}}
function processTemplates(
  config: Record<string, any>,
  data: Record<string, any>
): Record<string, any> {
  const processed: Record<string, any> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      processed[key] = value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const keys = path.trim().split('.');
        let result: any = { input: data };
        for (const k of keys) {
          result = result?.[k];
        }
        return result !== undefined ? String(result) : match;
      });
    } else {
      processed[key] = value;
    }
  }
  return processed;
}

// WhatsApp node execution
async function executeWhatsAppNode(
  config: Record<string, any>,
  inputData: Record<string, any>
) {
  try {
    let phoneNumber: string | undefined;
    if (config.toPath) {
      if (config.toPath.includes('.')) {
        phoneNumber = getNestedValue(inputData, config.toPath);
      } else if (/^\d+$/.test(config.toPath)) {
        phoneNumber = config.toPath;
      } else {
        phoneNumber = getNestedValue(inputData, config.toPath);
      }
    } else if (config.to) {
      phoneNumber = config.to;
    }

    const message = config.template || '';
    const messageType = config.messageType || 'text';

    if (!phoneNumber) {
      console.error('❌ Phone number not found. Config:', config, 'Input:', inputData);
      return { success: false, error: 'Phone number not found' };
    }

    const whatsappApiUrl = getWhatsAppBaseUrl();
    if (messageType === 'text') {
      const response = await axios.post(`${whatsappApiUrl}/message/sendText/intimate`, {
        number: phoneNumber,
        text: message,
      });
      console.log('✅ WhatsApp sent successfully:', response.data);
      return { success: true, output: { sent: true, response: response.data } };
    } else {
      const response = await axios.post(`${whatsappApiUrl}/message/sendMedia/intimate`, {
        number: phoneNumber,
        mediaType: config.mediaType || 'image',
        media: config.mediaUrl || '',
        caption: config.mediaCaption || '',
      });
      console.log('✅ WhatsApp media sent successfully:', response.data);
      return { success: true, output: { sent: true, response: response.data } };
    }
  } catch (error: any) {
    console.error('❌ WhatsApp send error:', error.message, error.response?.data);
    return { success: false, error: error.message || 'Failed to send WhatsApp message' };
  }
}

// Email node execution
async function executeEmailNode(
  config: Record<string, any>,
  inputData: Record<string, any>
) {
  try {
    const emailApiUrl = import.meta.env.VITE_EMAIL_API_URL || '/email-api';
    const response = await axios.post(`${emailApiUrl}/send`, {
      to: config.to,
      subject: config.subject,
      html: config.html,
    });
    return { success: true, output: { sent: true, response: response.data } };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

// PocketBase Find node
async function executePbFindNode(config: Record<string, any>) {
  try {
    const collection = config.collection;
    const filter = config.filter || '';
    const sort = config.sort || '';
    const limit = config.limit || 50;
    const page = config.page || 1;
    const expand = config.expand || '';
    const fields = config.fields || '';
    const records = await pb.collection(collection).getList(page, limit, { filter, sort, expand, fields });
    return { success: true, output: { records: records.items, count: records.totalItems } };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to find records' };
  }
}

// PocketBase Get One node
async function executePbGetOneNode(config: Record<string, any>) {
  try {
    const collection = config.collection;
    const recordId = config.recordId;
    const expand = config.expand || '';
    const fields = config.fields || '';
    if (recordId) {
      const record = await pb.collection(collection).getOne(recordId, { expand, fields });
      return { success: true, output: { record, exists: true } };
    } else if (config.filter) {
      const records = await pb.collection(collection).getList(1, 1, { filter: config.filter, expand, fields });
      if (records.items.length > 0) {
        return { success: true, output: { record: records.items[0], exists: true } };
      } else {
        return { success: true, output: { record: null, exists: false } };
      }
    }
    return { success: false, error: 'No recordId or filter provided' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get record' };
  }
}

// PocketBase Create node
async function executePbCreateNode(config: Record<string, any>) {
  try {
    const collection = config.collection;
    const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const record = await pb.collection(collection).create(data);
    return { success: true, output: { record } };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create record' };
  }
}

// PocketBase Update node
async function executePbUpdateNode(config: Record<string, any>) {
  try {
    const collection = config.collection;
    const id = config.id;
    const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const record = await pb.collection(collection).update(id, data);
    return { success: true, output: { record } };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update record' };
  }
}

// If condition node
async function executeIfNode(config: Record<string, any>, inputData: Record<string, any>) {
  try {
    const condition = config.condition;
    const result = eval(condition.replace(/input\\./g, 'inputData.'));
    return { success: true, output: { result: Boolean(result), branch: result ? 'true' : 'false' } };
  } catch (error: any) {
    return { success: false, error: `Failed to evaluate condition: ${error.message}` };
  }
}

// Transform node
async function executeTransformNode(config: Record<string, any>, inputData: Record<string, any>) {
  try {
    const template = typeof config.template === 'string' ? JSON.parse(config.template) : config.template;
    const output = processTemplates(template, inputData);
    return { success: true, output };
  } catch (error: any) {
    return { success: false, error: `Failed to transform data: ${error.message}` };
  }
}

// Delay node
async function executeDelayNode(config: Record<string, any>, inputData: Record<string, any>) {
  const amount = config.amount || 5;
  const unit = config.unit || 'seconds';
  let delayMs = amount * 1000;
  if (unit === 'minutes') delayMs = amount * 60 * 1000;
  if (unit === 'hours') delayMs = amount * 60 * 60 * 1000;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return { success: true, output: inputData };
}

// Helper to get nested values
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    result = result?.[key];
  }
  return result;
}

async function executeNodeWithStep(node: FlowNode, context: ExecutionContext): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const nodeType = (node.data?.type as string) || node.type;
  const inputSnapshot = safeSerialize(context.data);

  let runStepId: string | null = null;
  try {
    const record = await pb.collection(COLLECTIONS.runSteps).create({
      run_id: context.runId,
      node_id: node.id,
      node_type: nodeType,
      status: 'running',
      started_at: startedAt,
      input: inputSnapshot,
    });
    runStepId = record.id;
  } catch (error) {
    console.warn('⚠️  Failed to create run step record', { nodeId: node.id, error });
  }

  const result = await executeNode(node, context);

  const updatePayload: Record<string, any> = {
    status: result.success ? 'success' : 'failed',
    finished_at: new Date().toISOString(),
  };

  const outputSnapshot = safeSerialize(result.output);
  if (outputSnapshot !== undefined) {
    updatePayload.output = outputSnapshot;
  }
  if (!result.success && result.error) {
    updatePayload.error = result.error;
  }

  if (runStepId) {
    try {
      await pb.collection(COLLECTIONS.runSteps).update(runStepId, updatePayload);
    } catch (error) {
      console.warn('⚠️  Failed to update run step record', { nodeId: node.id, error });
    }
  }

  return result;
}

function findNextNodes(startNodeId: string, edges: FlowEdge[], visited: Set<string>): string[] {
  const queue: string[] = [startNodeId];
  const ordered: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source !== current) continue;
      const targetId = edge.target;
      if (!targetId || visited.has(targetId)) continue;
      visited.add(targetId);
      ordered.push(targetId);
      queue.push(targetId);
    }
  }

  return ordered;
}

function safeSerialize<T>(value: T): T | undefined {
  try {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

// Main flow executor
export async function executeFlow(
  runId: string,
  flowId: string,
  canvas: FlowCanvas,
  initialData: Record<string, any>
) {
  console.log('🚀 ========== FLOW EXECUTION STARTED ==========');
  console.log('📋 Run ID:', runId);
  console.log('📋 Flow ID:', flowId);
  console.log('📋 Canvas:', canvas);
  console.log('📋 Initial Data:', initialData);

  const context: ExecutionContext = {
    runId,
    flowId,
    data: initialData,
    nodeOutputs: new Map(),
  };

  try {
    console.log('⏳ Updating run status to running...');
    await pb.collection(COLLECTIONS.runs).update(runId, { status: 'running' });
    console.log('✅ Run status updated to running');

    const nodes = canvas.nodes || [];
    const edges = canvas.edges || [];
    console.log(`📊 Found ${nodes.length} nodes and ${edges.length} edges`);

    const triggerNode = nodes.find((n) => (n.data?.type as string)?.startsWith('trigger.'));
    if (!triggerNode) {
      console.error('❌ No trigger node found in flow!');
      throw new Error('No trigger node found in flow');
    }
    console.log(`🎯 Found trigger node: ${triggerNode.id} (${triggerNode.data?.type})`);

    console.log('🔧 Executing trigger node...');
    const triggerResult = await executeNodeWithStep(triggerNode, context);
    if (!triggerResult.success) {
      console.error('❌ Trigger execution failed:', triggerResult.error);
      throw new Error(`Trigger failed: ${triggerResult.error}`);
    }
    console.log('✅ Trigger executed successfully:', triggerResult.output);

    context.data = triggerResult.output || initialData;
    context.nodeOutputs.set(triggerNode.id, triggerResult.output);

    // Build execution order using edges
    const executedNodes = new Set<string>([triggerNode.id]);
    const nodesToExecute = findNextNodes(triggerNode.id, edges, executedNodes);
    // Execution loop (simplified)
    for (const nodeId of nodesToExecute) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;
      const result = await executeNodeWithStep(node, context);
      if (!result.success) {
        console.error(`❌ Node ${node.id} failed:`, result.error);
        break;
      }
      context.nodeOutputs.set(node.id, result.output);
      context.data = result.output || context.data;
    }

    // Mark run as completed
    await pb.collection(COLLECTIONS.runs).update(runId, { status: 'completed' });
    console.log('✅ Flow execution completed');
  } catch (err: any) {
    console.error('❌ Flow execution error:', err);
    await pb.collection(COLLECTIONS.runs).update(runId, { status: 'failed' });
  }
}
