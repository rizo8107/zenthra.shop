import express, { Request, Response } from 'express';
import crypto from 'crypto';
import PocketBase from 'pocketbase';

const router = express.Router();

// Initialize PocketBase
const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

// Admin API key for protected endpoints
const ADMIN_KEY = process.env.WEBHOOKS_ADMIN_API_KEY || '';

/**
 * Middleware to require admin authentication
 */
function requireAdmin(req: Request, res: Response, next: express.NextFunction) {
  // If no admin key configured, allow open access (development-friendly)
  if (!ADMIN_KEY) return next();
  
  const key = req.headers['x-api-key'] || req.query['api_key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * Health check
 * GET /api/webhooks/health
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

/**
 * List all webhook subscriptions
 * GET /api/webhooks/subscriptions
 */
router.get('/subscriptions', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    const collection = process.env.WEBHOOKS_COLLECTION || 'webhooks';
    const records = await pb.collection(collection).getFullList({
      sort: '-created',
    });
    
    res.json({ items: records });
    return;
  } catch (error) {
    console.error('Error listing webhooks:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list webhooks'
    });
    return;
  }
});

/**
 * Create a new webhook subscription
 * POST /api/webhooks/subscriptions
 */
router.post('/subscriptions', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, events, secret, active, retries, timeout_ms, description } = req.body;
    
    if (!url || !events) {
      res.status(400).json({ error: 'url and events are required' });
      return;
    }
    
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    const collection = process.env.WEBHOOKS_COLLECTION || 'webhooks';
    const record = await pb.collection(collection).create({
      url: String(url),
      events: Array.isArray(events) ? events : String(events).split(',').map(s => s.trim()),
      secret: secret || '',
      active: active !== undefined ? Boolean(active) : true,
      retries: retries !== undefined ? Number(retries) : 3,
      timeout_ms: timeout_ms !== undefined ? Number(timeout_ms) : 8000,
      description: description || ''
    });
    
    res.status(201).json(record);
    return;
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create webhook'
    });
    return;
  }
});

/**
 * Update a webhook subscription
 * PUT /api/webhooks/subscriptions/:id
 */
router.put('/subscriptions/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    const collection = process.env.WEBHOOKS_COLLECTION || 'webhooks';
    const record = await pb.collection(collection).update(id, req.body);
    
    res.json(record);
    return;
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update webhook'
    });
    return;
  }
});

/**
 * Delete a webhook subscription
 * DELETE /api/webhooks/subscriptions/:id
 */
router.delete('/subscriptions/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    const collection = process.env.WEBHOOKS_COLLECTION || 'webhooks';
    await pb.collection(collection).delete(id);
    
    res.json({ ok: true });
    return;
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete webhook'
    });
    return;
  }
});

/**
 * Emit a webhook event
 * POST /api/webhooks/emit
 */
router.post('/emit', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const event = {
      id: body.id || crypto.randomUUID(),
      type: body.type,
      timestamp: body.timestamp || new Date().toISOString(),
      source: body.source || 'api',
      data: body.data || {},
      metadata: body.metadata || {}
    };
    
    if (!event.type) {
      res.status(400).json({ error: 'type is required' });
      return;
    }
    
    console.log('Emitting webhook event:', event.type, event.id);
    
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    // Get active webhook subscriptions for this event type
    const collection = process.env.WEBHOOKS_COLLECTION || 'webhooks';
    const webhooks = await pb.collection(collection).getFullList({
      filter: `active = true && events ~ '${event.type}'`
    });
    
    // Send to all matching webhooks
    const results = await Promise.allSettled(
      webhooks.map(async (webhook: any) => {
        try {
          // Generate signature if secret is configured
          let signature = '';
          if (webhook.secret) {
            signature = crypto
              .createHmac('sha256', webhook.secret)
              .update(JSON.stringify(event))
              .digest('hex');
          }
          
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(signature && { 'X-Webhook-Signature': signature })
            },
            body: JSON.stringify(event),
            signal: AbortSignal.timeout(webhook.timeout_ms || 8000)
          });
          
          if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}`);
          }
          
          return { webhook_id: webhook.id, success: true };
        } catch (error) {
          console.error(`Failed to send webhook to ${webhook.url}:`, error);
          return { webhook_id: webhook.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );
    
    res.json({
      ok: true,
      event_id: event.id,
      webhooks_sent: results.length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' })
    });
    return;
  } catch (error) {
    console.error('Error emitting webhook:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to emit webhook'
    });
    return;
  }
});

/**
 * Receive incoming webhook (generic endpoint)
 * POST /api/webhooks/receive/:identifier
 */
router.post('/receive/:identifier', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    const body = req.body;
    const signature = req.headers['x-webhook-signature'] as string;
    
    console.log(`Received webhook for identifier: ${identifier}`);
    
    // Store webhook in PocketBase for processing
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    const collection = process.env.WEBHOOKS_FAILURES_COLLECTION || 'webhook_logs';
    await pb.collection(collection).create({
      identifier,
      payload: body,
      signature,
      timestamp: new Date().toISOString(),
      processed: false
    });
    
    // You can add custom processing logic here
    
    res.json({ success: true, identifier });
    return;
  } catch (error) {
    console.error('Error receiving webhook:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process webhook'
    });
    return;
  }
});

export default router;
