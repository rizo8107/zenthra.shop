import axios from 'axios';
import { adminAuth } from './pocketbase.js';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
const WEBHOOKS_COLLECTION = process.env.WEBHOOKS_COLLECTION || 'webhooks';
const WEBHOOKS_FAILURES_COLLECTION = process.env.WEBHOOKS_FAILURES_COLLECTION || 'webhook_failures';

let initialized = false;
let initializingPromise: Promise<void> | null = null;

function buildWebhookCollectionPayload() {
  return {
    name: WEBHOOKS_COLLECTION,
    type: 'base',
    schema: [
      {
        name: 'url',
        type: 'url',
        required: true,
      },
      {
        name: 'events',
        type: 'json',
        required: true,
      },
      {
        name: 'secret',
        type: 'text',
      },
      {
        name: 'active',
        type: 'bool',
        required: true,
        default: true,
      },
      {
        name: 'timeout_ms',
        type: 'number',
        required: false,
        default: 8000,
      },
      {
        name: 'retries',
        type: 'number',
        required: false,
        default: 3,
      },
      {
        name: 'description',
        type: 'text',
      },
    ],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  };
}

function buildFailuresCollectionPayload() {
  return {
    name: WEBHOOKS_FAILURES_COLLECTION,
    type: 'base',
    schema: [
      { name: 'subscription_id', type: 'text' },
      { name: 'url', type: 'url', required: true },
      { name: 'event_type', type: 'text', required: true },
      { name: 'payload', type: 'json', required: true },
      { name: 'status', type: 'number' },
      { name: 'response_body', type: 'text' },
      { name: 'attempt', type: 'number', required: true },
      { name: 'error_message', type: 'text' },
      { name: 'timestamp', type: 'date', required: true },
    ],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  };
}

async function createCollectionIfMissing(token: string, name: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await axios.get(`${POCKETBASE_URL}/api/collections/${name}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      await axios.post(`${POCKETBASE_URL}/api/collections`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return;
    }
    throw err;
  }
}

export async function ensureWebhookCollections(providedToken?: string): Promise<void> {
  if (initialized) return;
  if (initializingPromise) {
    await initializingPromise;
    return;
  }

  initializingPromise = (async () => {
    const token = providedToken || (await adminAuth()).token;
    await createCollectionIfMissing(token, WEBHOOKS_COLLECTION, buildWebhookCollectionPayload());
    await createCollectionIfMissing(token, WEBHOOKS_FAILURES_COLLECTION, buildFailuresCollectionPayload());
    initialized = true;
  })().finally(() => {
    initializingPromise = null;
  });

  await initializingPromise;
}
