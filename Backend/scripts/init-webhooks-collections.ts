import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: resolve(__dirname, '../..', '.env') });

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
const POCKETBASE_ADMIN_EMAIL = process.env.VITE_POCKETBASE_ADMIN_EMAIL || '';
const POCKETBASE_ADMIN_PASSWORD = process.env.VITE_POCKETBASE_ADMIN_PASSWORD || '';

console.log(`Connecting to PocketBase at: ${POCKETBASE_URL}`);

const pb = new PocketBase(POCKETBASE_URL);

async function initializeWebhookCollections() {
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD);
    console.log('Successfully authenticated as admin');

    // Create webhooks collection
    const webhooksCollection = 'webhooks';
    try {
      await pb.collections.getOne(webhooksCollection);
      console.log(`Collection '${webhooksCollection}' already exists`);
    } catch (error: any) {
      if (error?.status === 404) {
        console.log(`Creating collection '${webhooksCollection}'...`);
        await pb.collections.create({
          name: webhooksCollection,
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
              required: false,
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
              required: false,
            },
          ],
          listRule: null,
          viewRule: null,
          createRule: null,
          updateRule: null,
          deleteRule: null,
        });
        console.log(`Collection '${webhooksCollection}' created successfully`);
      } else {
        throw error;
      }
    }

    // Create webhook_failures collection
    const failuresCollection = 'webhook_failures';
    try {
      await pb.collections.getOne(failuresCollection);
      console.log(`Collection '${failuresCollection}' already exists`);
    } catch (error: any) {
      if (error?.status === 404) {
        console.log(`Creating collection '${failuresCollection}'...`);
        await pb.collections.create({
          name: failuresCollection,
          type: 'base',
          schema: [
            {
              name: 'subscription_id',
              type: 'text',
              required: false,
            },
            {
              name: 'url',
              type: 'url',
              required: true,
            },
            {
              name: 'event_type',
              type: 'text',
              required: true,
            },
            {
              name: 'payload',
              type: 'json',
              required: true,
            },
            {
              name: 'status',
              type: 'number',
              required: false,
            },
            {
              name: 'response_body',
              type: 'text',
              required: false,
            },
            {
              name: 'attempt',
              type: 'number',
              required: true,
            },
            {
              name: 'error_message',
              type: 'text',
              required: false,
            },
            {
              name: 'timestamp',
              type: 'date',
              required: true,
            },
          ],
          listRule: null,
          viewRule: null,
          createRule: null,
          updateRule: null,
          deleteRule: null,
        });
        console.log(`Collection '${failuresCollection}' created successfully`);
      } else {
        throw error;
      }
    }

    console.log('✅ Webhook collections initialized successfully!');
  } catch (error: any) {
    console.error('❌ Error initializing webhook collections:', error);
    if (error?.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

initializeWebhookCollections();

