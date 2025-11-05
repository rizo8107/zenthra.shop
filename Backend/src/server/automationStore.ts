import axios, { AxiosError } from 'axios';
import { adminAuth } from './pocketbase.js';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
const AUTOMATIONS_COLLECTION = process.env.AUTOMATIONS_COLLECTION || 'automations';
const AUTOMATION_DEFAULT_STATUSES = ['draft', 'active', 'paused'];

export type AutomationGraph = {
  nodes: unknown[];
  edges: unknown[];
};

export type AutomationFlow = {
  id: string;
  name: string;
  description?: string;
  status: string;
  graph: AutomationGraph;
  triggers?: unknown;
  webhooks?: unknown;
  metadata?: unknown;
  created?: string;
  updated?: string;
};

let ensurePromise: Promise<void> | null = null;

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  } as const;
}

async function ensureAutomationsCollectionInternal(token: string): Promise<void> {
  try {
    await axios.get(`${POCKETBASE_URL}/api/collections/${AUTOMATIONS_COLLECTION}`, {
      headers: getAuthHeaders(token),
    });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      await axios.post(
        `${POCKETBASE_URL}/api/collections`,
        {
          name: AUTOMATIONS_COLLECTION,
          type: 'base',
          schema: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              options: AUTOMATION_DEFAULT_STATUSES,
              default: 'draft',
            },
            {
              name: 'graph',
              type: 'json',
              required: true,
            },
            {
              name: 'triggers',
              type: 'json',
            },
            {
              name: 'webhooks',
              type: 'json',
            },
            {
              name: 'metadata',
              type: 'json',
            },
          ],
          listRule: null,
          viewRule: null,
          createRule: null,
          updateRule: null,
          deleteRule: null,
        },
        {
          headers: getAuthHeaders(token),
        }
      );
    } else {
      throw err;
    }
  }
}

async function ensureAutomationsCollection(): Promise<void> {
  if (ensurePromise) {
    return ensurePromise;
  }
  ensurePromise = (async () => {
    try {
      const { token } = await adminAuth();
      await ensureAutomationsCollectionInternal(token);
    } catch (error) {
      console.error('Failed to ensure automations collection exists:', (error as Error)?.message || error);
      throw error;
    }
  })();
  try {
    await ensurePromise;
  } finally {
    ensurePromise = null;
  }
}

function mapRecord(record: Record<string, unknown>): AutomationFlow {
  return {
    id: String(record.id ?? ''),
    name: String(record.name ?? 'Untitled journey'),
    description: record.description ? String(record.description) : undefined,
    status: String(record.status ?? 'draft'),
    graph: (record.graph as AutomationGraph) || { nodes: [], edges: [] },
    triggers: record.triggers,
    webhooks: record.webhooks,
    metadata: record.metadata,
    created: record.created ? String(record.created) : undefined,
    updated: record.updated ? String(record.updated) : undefined,
  };
}

export async function listAutomationFlows(): Promise<AutomationFlow[]> {
  await ensureAutomationsCollection();
  const { token } = await adminAuth();
  const res = await axios.get(`${POCKETBASE_URL}/api/collections/${AUTOMATIONS_COLLECTION}/records`, {
    headers: getAuthHeaders(token),
    params: {
      sort: '-updated',
      perPage: 200,
    },
  });
  const items = Array.isArray(res.data?.items) ? (res.data.items as Record<string, unknown>[]) : [];
  return items.map(mapRecord);
}

export type AutomationFlowInput = {
  name: string;
  description?: string;
  status?: string;
  graph?: AutomationGraph;
  triggers?: unknown;
  webhooks?: unknown;
  metadata?: unknown;
};

export async function createAutomationFlow(input: AutomationFlowInput): Promise<AutomationFlow> {
  await ensureAutomationsCollection();
  const { token } = await adminAuth();
  const payload = {
    name: input.name || 'Untitled journey',
    description: input.description || '',
    status: input.status && AUTOMATION_DEFAULT_STATUSES.includes(input.status) ? input.status : 'draft',
    graph: input.graph || { nodes: [], edges: [] },
    triggers: input.triggers || [],
    webhooks: input.webhooks || [],
    metadata: input.metadata || {},
  };
  const res = await axios.post(
    `${POCKETBASE_URL}/api/collections/${AUTOMATIONS_COLLECTION}/records`,
    payload,
    {
      headers: getAuthHeaders(token),
    }
  );
  return mapRecord(res.data as Record<string, unknown>);
}

export async function updateAutomationFlow(id: string, input: AutomationFlowInput): Promise<AutomationFlow> {
  await ensureAutomationsCollection();
  const { token } = await adminAuth();
  const payload: Record<string, unknown> = {};
  if (input.name) payload.name = input.name;
  if (typeof input.description === 'string') payload.description = input.description;
  if (input.status && AUTOMATION_DEFAULT_STATUSES.includes(input.status)) payload.status = input.status;
  if (input.graph) payload.graph = input.graph;
  if (input.triggers !== undefined) payload.triggers = input.triggers;
  if (input.webhooks !== undefined) payload.webhooks = input.webhooks;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  const res = await axios.patch(
    `${POCKETBASE_URL}/api/collections/${AUTOMATIONS_COLLECTION}/records/${id}`,
    payload,
    {
      headers: getAuthHeaders(token),
    }
  );
  return mapRecord(res.data as Record<string, unknown>);
}

export async function deleteAutomationFlow(id: string): Promise<void> {
  await ensureAutomationsCollection();
  const { token } = await adminAuth();
  await axios.delete(`${POCKETBASE_URL}/api/collections/${AUTOMATIONS_COLLECTION}/records/${id}`, {
    headers: getAuthHeaders(token),
  });
}
