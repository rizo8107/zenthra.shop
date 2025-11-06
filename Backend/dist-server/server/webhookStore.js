import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { fallbackCreateWebhook, fallbackDeleteWebhook, fallbackListWebhooks, fallbackRecordFailure, fallbackUpdateWebhook, } from './webhookStoreFallback.js';
dotenv.config();
const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
const WEBHOOKS_COLLECTION = process.env.WEBHOOKS_COLLECTION || 'webhooks';
const WEBHOOKS_FAILURES_COLLECTION = process.env.WEBHOOKS_FAILURES_COLLECTION || 'webhook_failures';
// Create PocketBase client instance like the frontend components do
const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);
// Simple collection creation without authentication
async function ensureWebhookCollections() {
    try {
        // Try to access the webhooks collection
        await pb.collection(WEBHOOKS_COLLECTION).getList(1, 1);
    }
    catch (error) {
        if (error?.status === 404) {
            console.log('⚠️ Webhooks collection not found, but continuing anyway...');
            // Collection doesn't exist, but we'll let PocketBase handle this
            // The admin UI should create the collections manually
        }
    }
}
export async function listWebhooks() {
    try {
        console.log('📋 Listing webhooks from PocketBase...');
        await ensureWebhookCollections();
        const records = await pb.collection(WEBHOOKS_COLLECTION).getFullList({
            sort: '-created',
        });
        console.log(`✅ Found ${records.length} webhook subscriptions`);
        return records.map((item) => ({
            id: item.id,
            url: item.url,
            events: Array.isArray(item.events) ? item.events : (typeof item.events === 'string' ? item.events.split(',').map((s) => s.trim()).filter(Boolean) : []),
            secret: item.secret,
            active: Boolean(item.active),
            timeout_ms: Number(item.timeout_ms || 8000),
            retries: Number(item.retries || 3),
            description: item.description || ''
        }));
    }
    catch (error) {
        console.error('❌ Error listing webhooks from PocketBase:', error?.message);
        console.warn('Using fallback webhook store for list operation.');
        return fallbackListWebhooks();
    }
}
export async function createWebhook(data) {
    console.log('🔄 Creating webhook subscription:', data);
    try {
        console.log('📦 Ensuring webhook collections exist...');
        await ensureWebhookCollections();
        console.log('✅ Webhook collections ready');
        const payload = {
            url: data.url,
            events: data.events,
            secret: data.secret || '',
            active: data.active,
            timeout_ms: data.timeout_ms ?? 8000,
            retries: data.retries ?? 3,
            description: data.description || ''
        };
        console.log('💾 Saving webhook to PocketBase:', payload);
        const record = await pb.collection(WEBHOOKS_COLLECTION).create(payload);
        console.log('✅ Webhook saved to PocketBase with ID:', record.id);
        return { ...data, id: record.id };
    }
    catch (error) {
        console.error('❌ Error creating webhook in PocketBase:', error?.message);
        console.error('Error details:', error);
        console.warn('⚠️ Using fallback webhook store for create operation.');
        return fallbackCreateWebhook(data);
    }
}
export async function updateWebhook(id, data) {
    try {
        await pb.collection(WEBHOOKS_COLLECTION).update(id, data);
    }
    catch (error) {
        console.warn('Using fallback webhook store for update operation.', error?.message);
        fallbackUpdateWebhook(id, data);
    }
}
export async function deleteWebhook(id) {
    try {
        await pb.collection(WEBHOOKS_COLLECTION).delete(id);
    }
    catch (error) {
        console.warn('Using fallback webhook store for delete operation.', error?.message);
        fallbackDeleteWebhook(id);
    }
}
export async function recordWebhookFailure(data) {
    try {
        const payload = {
            ...data,
            timestamp: new Date().toISOString()
        };
        await pb.collection(WEBHOOKS_FAILURES_COLLECTION).create(payload);
    }
    catch (error) {
        console.warn('Using fallback webhook store for recording failures.', error?.message);
        fallbackRecordFailure(data);
    }
}
function shouldUseFallback(error) {
    if (!error)
        return false;
    const status = error?.response?.status;
    const code = error?.code;
    const message = error?.message || '';
    if (status === 404 || status === 401 || status === 403)
        return true;
    if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT')
        return true;
    if (message.includes('Missing PocketBase') || message.includes('Cannot connect to PocketBase'))
        return true;
    return false;
}
