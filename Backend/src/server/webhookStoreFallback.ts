import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { WebhookSubscription } from './webhookStore.js';

type StoredWebhook = WebhookSubscription & { id: string };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', '..', '.cache');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'webhooks.local.json');
const FAILURES_FILE = path.join(DATA_DIR, 'webhook_failures.local.json');

let subscriptions: StoredWebhook[] = [];
let failures: Array<ReturnType<typeof buildFailureRecord>> = [];
let loaded = false;

function ensureLoaded() {
  if (loaded) return;
  try {
    if (existsSync(SUBSCRIPTIONS_FILE)) {
      const raw = readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      subscriptions = JSON.parse(raw) as StoredWebhook[];
    }
  } catch {
    subscriptions = [];
  }

  try {
    if (existsSync(FAILURES_FILE)) {
      const raw = readFileSync(FAILURES_FILE, 'utf-8');
      failures = JSON.parse(raw);
    }
  } catch {
    failures = [];
  }

  loaded = true;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveSubscriptions() {
  ensureDataDir();
  writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf-8');
}

function saveFailures() {
  ensureDataDir();
  writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2), 'utf-8');
}

function generateId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'wh_' + Math.random().toString(36).slice(2, 10);
}

export function fallbackListWebhooks(): StoredWebhook[] {
  ensureLoaded();
  return subscriptions;
}

export function fallbackCreateWebhook(data: WebhookSubscription): StoredWebhook {
  ensureLoaded();
  const id = data.id || generateId();
  const record: StoredWebhook = {
    id,
    url: data.url,
    events: data.events,
    secret: data.secret,
    active: data.active,
    timeout_ms: data.timeout_ms,
    retries: data.retries,
    description: data.description,
  };

  subscriptions = [record, ...subscriptions.filter((s) => s.id !== id)];
  saveSubscriptions();
  return record;
}

export function fallbackUpdateWebhook(id: string, data: Partial<WebhookSubscription>): void {
  ensureLoaded();
  const idx = subscriptions.findIndex((s) => s.id === id);
  if (idx === -1) return;
  subscriptions[idx] = {
    ...subscriptions[idx],
    ...data,
    id: subscriptions[idx].id,
  };
  saveSubscriptions();
}

export function fallbackDeleteWebhook(id: string): void {
  ensureLoaded();
  subscriptions = subscriptions.filter((s) => s.id !== id);
  saveSubscriptions();
}

type FailureInput = {
  subscription_id?: string;
  url: string;
  event_type: string;
  payload: any;
  status?: number;
  response_body?: string;
  attempt: number;
  error_message?: string;
};

function buildFailureRecord(data: FailureInput) {
  return {
    ...data,
    timestamp: new Date().toISOString(),
  };
}

export function fallbackRecordFailure(data: FailureInput): void {
  ensureLoaded();
  failures.push(buildFailureRecord(data));
  saveFailures();
}

