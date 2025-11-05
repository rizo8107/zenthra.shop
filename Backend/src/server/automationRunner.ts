import axios from 'axios';
import { listAutomationFlows, type AutomationFlow } from './automationStore.js';
import { ensureAdminAuth, pb } from '@/lib/pocketbase';

type AutomationEvent = {
  id?: string;
  type: string;
  timestamp?: string;
  source?: string;
  data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

type FlowNode = {
  id: string;
  data?: Record<string, any>;
};

type FlowEdge = {
  source: string;
  target: string;
};

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'karigai';

function normaliseKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

const isTriggerNodeType = (nodeType: string | undefined): boolean =>
  ['start', 'order', 'cart'].includes(normaliseKey(nodeType));

const extractNodes = (flow: AutomationFlow): FlowNode[] =>
  Array.isArray(flow.graph?.nodes) ? (flow.graph.nodes as FlowNode[]) : [];

const extractEdges = (flow: AutomationFlow): FlowEdge[] =>
  Array.isArray(flow.graph?.edges) ? (flow.graph.edges as FlowEdge[]) : [];

const buildAdjacency = (edges: FlowEdge[]) => {
  const map = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!edge?.source || !edge?.target) return;
    const list = map.get(edge.source) ?? [];
    list.push(edge.target);
    map.set(edge.source, list);
  });
  return map;
};

const getDeep = (obj: unknown, path: string): unknown => {
  if (!obj || typeof path !== 'string') return undefined;
  return path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
};

const renderTemplate = (template: string, context: Record<string, unknown>): string => {
  if (!template) return '';
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_match, rawPath) => {
    const value = getDeep(context, String(rawPath).trim());
    return value === undefined || value === null ? '' : String(value);
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchEvolutionConfig() {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API credentials are not configured');
  }
}

async function sendEvolutionTextMessage(number: string, text: string, delayMs?: number) {
  await fetchEvolutionConfig();
  if (!number) throw new Error('Missing recipient number for Evolution message');
  if (delayMs && delayMs > 0) await delay(delayMs);
  const body = {
    number,
    text,
    options: {
      delay: 1200,
      presence: 'composing',
      linkPreview: true,
    },
    textMessage: {
      text,
    },
  };

  const response = await fetch(
    `${String(EVOLUTION_API_URL).replace(/\/$/, '')}/message/sendText/${EVOLUTION_INSTANCE_NAME}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY as string,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Evolution text send failed: ${response.status} ${payload}`);
  }
}

async function sendEvolutionMediaMessage(number: string, mediaUrl: string, options: { caption?: string; mediaType?: string; fileName?: string; delayMs?: number }) {
  await fetchEvolutionConfig();
  if (!number) throw new Error('Missing recipient number for Evolution media message');
  if (!mediaUrl) throw new Error('Missing mediaUrl for Evolution media message');
  if (options.delayMs && options.delayMs > 0) await delay(options.delayMs);
  const payload = {
    number,
    options: {
      mimetype: options.mediaType || 'image/jpeg',
      fileName: options.fileName || 'media.jpg',
      caption: options.caption || '',
      media: mediaUrl,
    },
  };

  const response = await fetch(
    `${String(EVOLUTION_API_URL).replace(/\/$/, '')}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY as string,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Evolution media send failed: ${response.status} ${text}`);
  }
}

const normaliseString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveRecipientPhone = (nodeData: Record<string, unknown>, context: Record<string, unknown>): string | undefined => {
  const configuredPath = normaliseString(nodeData.recipientPath);
  if (configuredPath) {
    const resolved = getDeep(context, configuredPath);
    const phone = normaliseString(resolved);
    if (phone) return phone;
  }

  const fallback = normaliseString(nodeData.fallbackRecipient);
  if (fallback) return fallback;

  const candidates = [
    getDeep(context, 'data.customer_phone'),
    getDeep(context, 'data.payload.customer_phone'),
    getDeep(context, 'order.customer_phone'),
    getDeep(context, 'customer.phone'),
    getDeep(context, 'event.data.customer_phone'),
    getDeep(context, 'metadata.customer_phone'),
  ];
  for (const candidate of candidates) {
    const phone = normaliseString(candidate);
    if (phone) return phone;
  }

  return undefined;
};

async function enrichContext(event: AutomationEvent): Promise<Record<string, unknown>> {
  const context: Record<string, unknown> = {
    event,
    data: event.data || {},
    metadata: event.metadata || {},
  };

  try {
    await ensureAdminAuth();
  } catch (error) {
    console.warn('Automation runner could not ensure PocketBase auth:', error);
  }

  const orderId = getDeep(event, 'data.order_id') ?? getDeep(event, 'data.payload.order_id');
  if (typeof orderId === 'string' && orderId.trim()) {
    try {
      const order = await pb.collection('orders').getOne(orderId.trim(), { expand: 'user,shipping_address' });
      context.order = order;
    } catch (error) {
      console.warn('Automation runner failed to load order', orderId, error);
    }
  }

  const customerId = getDeep(event, 'data.customer_id');
  if (typeof customerId === 'string' && customerId.trim()) {
    try {
      const customer = await pb.collection('users').getOne(customerId.trim());
      context.customer = customer;
    } catch (error) {
      console.warn('Automation runner failed to load customer', customerId, error);
    }
  }

  return context;
}

function nodeMatchesEvent(node: FlowNode, event: AutomationEvent): boolean {
  const data = node?.data || {};
  const nodeType = normaliseKey(data.type);
  if (!isTriggerNodeType(nodeType)) return false;
  const key = normaliseKey(data.activityEventKey || data.eventKey);
  const eventType = normaliseKey(event.type);
  if (key && key === eventType) return true;

  if (nodeType === 'order') {
    const trigger = normaliseKey(data.orderTrigger);
    if (trigger && `order.${trigger}` === eventType) return true;
  }

  if (nodeType === 'cart') {
    const trigger = normaliseKey(data.cartTrigger);
    if (trigger && `cart.${trigger}` === eventType) return true;
  }

  return false;
}

async function handleMessageNode(node: FlowNode, context: Record<string, unknown>) {
  const data = node.data || {};
  const channel = normaliseKey(data.channel);
  if (!channel) return;

  if (channel === 'evolution_text' || channel === 'evolution_media') {
    const message = data.evolutionMessage || {};
    const text = renderTemplate(String(message.text || data.customMessage || ''), context);
    const recipient = resolveRecipientPhone(data, context);
    if (!recipient) {
      throw new Error('Evolution message skipped: no recipient phone number found in event context');
    }

    if (channel === 'evolution_text') {
      await sendEvolutionTextMessage(recipient, text, Number(message.delayMs) || Number(data.waitMs) || 0);
      console.log('[automation] Evolution text sent to', recipient);
    } else {
      const mediaUrl = renderTemplate(String(message.mediaUrl || ''), context);
      await sendEvolutionMediaMessage(recipient, mediaUrl, {
        caption: renderTemplate(String(message.caption || ''), context),
        mediaType: message.mediaType,
        fileName: message.fileName,
        delayMs: Number(message.delayMs) || 0,
      });
      console.log('[automation] Evolution media sent to', recipient);
    }
    return;
  }

  if (channel === 'whatsapp' || channel === 'sms' || channel === 'email') {
    console.info('[automation] Message node encountered for unsupported channel', channel, '– skipping delivery (logging only).');
    return;
  }
}

async function handleNode(node: FlowNode, context: Record<string, unknown>) {
  const data = node.data || {};
  const nodeType = normaliseKey(data.type);
  switch (nodeType) {
    case 'message':
      await handleMessageNode(node, context);
      break;
    case 'wait':
      if (typeof data.waitMinutes === 'number' && data.waitMinutes > 0) {
        const ms = data.waitMinutes * 60 * 1000;
        console.log('[automation] Waiting', ms, 'ms before continuing');
        await delay(ms);
      }
      break;
    case 'webhook':
      if (typeof data.webhookUrl === 'string' && data.webhookUrl.trim()) {
        try {
          await axios.request({
            method: data.webhookMethod || 'POST',
            url: data.webhookUrl,
            data: { event: context.event, context },
          });
          console.log('[automation] Webhook invoked', data.webhookUrl);
        } catch (error) {
          console.error('[automation] Webhook call failed', data.webhookUrl, error);
        }
      }
      break;
    default:
      break;
  }
}

async function processFlowFromNode(nodeId: string, nodesMap: Map<string, FlowNode>, adjacency: Map<string, string[]>, context: Record<string, unknown>, visited: Set<string>) {
  const queue: string[] = [nodeId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;
    visited.add(currentId);
    const node = nodesMap.get(currentId);
    if (!node) continue;
    try {
      await handleNode(node, context);
    } catch (error) {
      console.error('[automation] Error handling node', currentId, error);
    }

    const nextNodes = adjacency.get(currentId) || [];
    nextNodes.forEach((nextId) => {
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    });
  }
}

export async function runAutomationsForEvent(event: AutomationEvent): Promise<void> {
  if (!event?.type) return;
  try {
    const flows = await listAutomationFlows();
    if (!flows?.length) return;
    const relevantFlows = flows.filter((flow) => normaliseKey(flow.status) === 'active');
    if (!relevantFlows.length) return;

    const context = await enrichContext(event);

    for (const flow of relevantFlows) {
      try {
        const nodes = extractNodes(flow);
        if (!nodes.length) continue;
        const edges = extractEdges(flow);
        const adjacency = buildAdjacency(edges);
        const nodesMap = new Map(nodes.map((node) => [node.id, node]));

        const triggerNodes = nodes.filter((node) => nodeMatchesEvent(node, event));
        if (!triggerNodes.length) continue;

        for (const trigger of triggerNodes) {
          const visited = new Set<string>();
          await processFlowFromNode(trigger.id, nodesMap, adjacency, context, visited);
        }
      } catch (flowError) {
        console.error('[automation] Failed to evaluate automation flow', flow.id, flowError);
      }
    }
  } catch (error) {
    console.error('[automation] Failed to execute automations for event', event?.type, error);
  }
}

export type { AutomationEvent };
