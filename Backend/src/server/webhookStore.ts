import axios from 'axios';
import dotenv from 'dotenv';
import { adminAuth } from './pocketbase.js';
import {
  fallbackCreateWebhook,
  fallbackDeleteWebhook,
  fallbackListWebhooks,
  fallbackRecordFailure,
  fallbackUpdateWebhook,
} from './webhookStoreFallback.js';
import { ensureWebhookCollections } from './webhookCollections.js';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
const WEBHOOKS_COLLECTION = process.env.WEBHOOKS_COLLECTION || 'webhooks';
const WEBHOOKS_FAILURES_COLLECTION = process.env.WEBHOOKS_FAILURES_COLLECTION || 'webhook_failures';

export type WebhookSubscription = {
  id?: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  timeout_ms?: number;
  retries?: number;
  description?: string;
};

export async function listWebhooks(): Promise<WebhookSubscription[]> {
  try {
    const { token } = await adminAuth();
    await ensureWebhookCollections(token);
    const res = await axios.get(`${POCKETBASE_URL}/api/collections/${WEBHOOKS_COLLECTION}/records`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { perPage: 200, sort: '-created' }
    });
    return (res.data?.items || []).map((item: any) => ({
      id: item.id,
      url: item.url,
      events: Array.isArray(item.events) ? item.events : (typeof item.events === 'string' ? item.events.split(',').map((s:string)=>s.trim()).filter(Boolean) : []),
      secret: item.secret,
      active: Boolean(item.active),
      timeout_ms: Number(item.timeout_ms || 8000),
      retries: Number(item.retries || 3),
      description: item.description || ''
    }));
  } catch (error: any) {
    if (shouldUseFallback(error)) {
      console.warn('Using fallback webhook store for list operation.');
      return fallbackListWebhooks();
    }

    // Log other errors but return empty array to prevent breaking the UI
    console.error('Error listing webhooks:', error?.message || error);
    console.error('Error details:', {
      status: error?.response?.status,
      code: error?.code,
      message: error?.message,
      url: error?.config?.url
    });
    return [];
  }
}

export async function createWebhook(data: WebhookSubscription): Promise<WebhookSubscription> {
  try {
    const { token } = await adminAuth();
    await ensureWebhookCollections(token);
    const payload = {
      url: data.url,
      events: data.events,
      secret: data.secret || '',
      active: data.active,
      timeout_ms: data.timeout_ms ?? 8000,
      retries: data.retries ?? 3,
      description: data.description || ''
    };
    const res = await axios.post(`${POCKETBASE_URL}/api/collections/${WEBHOOKS_COLLECTION}/records`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { ...data, id: res.data?.id };
  } catch (error: any) {
    if (shouldUseFallback(error)) {
      console.warn('Using fallback webhook store for create operation.', error?.message);
      return fallbackCreateWebhook(data);
    }
    throw error;
  }
}

export async function updateWebhook(id: string, data: Partial<WebhookSubscription>): Promise<void> {
  try {
    const { token } = await adminAuth();
    await ensureWebhookCollections(token);
    const payload: any = { ...data };
    if (Array.isArray(payload.events)) payload.events = payload.events;
    await axios.patch(`${POCKETBASE_URL}/api/collections/${WEBHOOKS_COLLECTION}/records/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error: any) {
    if (shouldUseFallback(error)) {
      console.warn('Using fallback webhook store for update operation.', error?.message);
      fallbackUpdateWebhook(id, data);
      return;
    }
    throw error;
  }
}

export async function deleteWebhook(id: string): Promise<void> {
  try {
    const { token } = await adminAuth();
    await ensureWebhookCollections(token);
    await axios.delete(`${POCKETBASE_URL}/api/collections/${WEBHOOKS_COLLECTION}/records/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error: any) {
    if (shouldUseFallback(error)) {
      console.warn('Using fallback webhook store for delete operation.', error?.message);
      fallbackDeleteWebhook(id);
      return;
    }
    throw error;
  }
}

export async function recordWebhookFailure(data: {
  subscription_id?: string;
  url: string;
  event_type: string;
  payload: any;
  status?: number;
  response_body?: string;
  attempt: number;
  error_message?: string;
}): Promise<void> {
  try {
    const { token } = await adminAuth();
    await ensureWebhookCollections(token);
    const payload = {
      ...data,
      timestamp: new Date().toISOString()
    };
    await axios.post(`${POCKETBASE_URL}/api/collections/${WEBHOOKS_FAILURES_COLLECTION}/records`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error: any) {
    if (shouldUseFallback(error)) {
      console.warn('Using fallback webhook store for recording failures.', error?.message);
      fallbackRecordFailure(data);
      return;
    }
    console.error('Failed to record webhook failure:', error?.message || error);
  }
}

function shouldUseFallback(error: any): boolean {
  if (!error) return false;
  const status = error?.response?.status;
  const code = error?.code;
  const message = error?.message || '';

  if (status === 404 || status === 401 || status === 403) return true;
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT') return true;
  if (message.includes('Missing PocketBase') || message.includes('Cannot connect to PocketBase')) return true;
  return false;
}
