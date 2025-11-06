import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', '..', '.cache');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'webhooks.local.json');
const FAILURES_FILE = path.join(DATA_DIR, 'webhook_failures.local.json');
let subscriptions = [];
let failures = [];
let loaded = false;
function ensureLoaded() {
    if (loaded)
        return;
    try {
        if (existsSync(SUBSCRIPTIONS_FILE)) {
            const raw = readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
            subscriptions = JSON.parse(raw);
        }
    }
    catch {
        subscriptions = [];
    }
    try {
        if (existsSync(FAILURES_FILE)) {
            const raw = readFileSync(FAILURES_FILE, 'utf-8');
            failures = JSON.parse(raw);
        }
    }
    catch {
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
export function fallbackListWebhooks() {
    ensureLoaded();
    return subscriptions;
}
export function fallbackCreateWebhook(data) {
    ensureLoaded();
    const id = data.id || generateId();
    const record = {
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
export function fallbackUpdateWebhook(id, data) {
    ensureLoaded();
    const idx = subscriptions.findIndex((s) => s.id === id);
    if (idx === -1)
        return;
    subscriptions[idx] = {
        ...subscriptions[idx],
        ...data,
        id: subscriptions[idx].id,
    };
    saveSubscriptions();
}
export function fallbackDeleteWebhook(id) {
    ensureLoaded();
    subscriptions = subscriptions.filter((s) => s.id !== id);
    saveSubscriptions();
}
function buildFailureRecord(data) {
    return {
        ...data,
        timestamp: new Date().toISOString(),
    };
}
export function fallbackRecordFailure(data) {
    ensureLoaded();
    failures.push(buildFailureRecord(data));
    saveFailures();
}
