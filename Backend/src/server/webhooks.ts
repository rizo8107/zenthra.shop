import express from 'express';
import crypto from 'crypto';
import { createWebhook, deleteWebhook, listWebhooks, updateWebhook, WebhookSubscription } from './webhookStore';
import { emitEvent, OutgoingEvent } from './webhookDispatcher';

const router = express.Router();

const ADMIN_KEY = process.env.WEBHOOKS_ADMIN_API_KEY || '';

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  // If no admin key configured, allow open access (development-friendly)
  if (!ADMIN_KEY) return next();
  const key = req.headers['x-api-key'] || req.query['api_key'];
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Health
router.get('/health', (_req, res) => res.json({ ok: true }));

// Subscriptions CRUD
router.get('/subscriptions', requireAdmin, async (_req, res) => {
  try {
    const items = await listWebhooks();
    res.json({ items });
  } catch (e: any) {
    console.error('Error listing webhooks:', e);
    const errorMessage = e?.message || 'Failed to list webhooks';
    const errorDetails = e?.response?.data || e?.stack || '';
    console.error('Error details:', errorDetails);
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

router.post('/subscriptions', requireAdmin, async (req, res) => {
  try {
    const data = req.body as WebhookSubscription;
    if (!data?.url || !data?.events) return res.status(400).json({ error: 'url and events required' });
    const created = await createWebhook({
      url: String(data.url),
      events: Array.isArray(data.events) ? data.events : String(data.events).split(',').map((s)=>s.trim()).filter(Boolean),
      secret: String(data.secret || ''),
      active: Boolean(data.active),
      retries: Number(data.retries ?? 3),
      timeout_ms: Number(data.timeout_ms ?? 8000),
      description: String(data.description || '')
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to create webhook' });
  }
});

router.put('/subscriptions/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await updateWebhook(id, req.body);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to update webhook' });
  }
});

router.delete('/subscriptions/:id', requireAdmin, async (req, res) => {
  try {
    await deleteWebhook(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to delete webhook' });
  }
});

// Emit event (public endpoint for internal use by frontend/backend)
router.post('/emit', async (req, res) => {
  try {
    const body = req.body || {};
    const event: OutgoingEvent = {
      id: body.id || (crypto as any).randomUUID?.() || 'evt_' + Math.random().toString(36).slice(2, 10),
      type: body.type,
      timestamp: body.timestamp || new Date().toISOString(),
      source: body.source || 'frontend',
      data: body.data || {},
      metadata: body.metadata || {}
    };
    if (!event.type) return res.status(400).json({ error: 'type required' });
    
    // Optional: direct targets for testing (bypass store)
    const targets: string[] = Array.isArray(body.targets) ? body.targets.filter((u: any) => typeof u === 'string' && u.trim()) : [];
    if (targets.length > 0) {
      const tempSubs = targets.map((url) => ({ url, events: [event.type], active: true, retries: 0, timeout_ms: 8000 }));
      await emitEvent(event, tempSubs as any);
    } else {
      // Try to emit event, but don't fail if no webhooks are configured
      try {
        await emitEvent(event);
      } catch (emitError: any) {
        // If the error is about missing collections or auth, log it but don't fail the request
        // This allows the webhook system to work even if PocketBase isn't fully configured
        console.warn('Webhook emit warning (non-fatal):', emitError?.message);
        // Only throw if it's a critical error
        if (emitError?.message?.includes('Failed to obtain') || emitError?.message?.includes('Missing')) {
          throw emitError;
        }
      }
    }
    res.json({ ok: true, id: event.id });
  } catch (e: any) {
    console.error('Error emitting webhook event:', e);
    const errorMessage = e?.message || 'Failed to emit event';
    const errorDetails = e?.response?.data || e?.stack || '';
    console.error('Error details:', errorDetails);
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

export default router;
