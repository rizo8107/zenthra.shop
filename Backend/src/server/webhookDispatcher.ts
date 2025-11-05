import crypto from 'crypto';
import axios from 'axios';
import { listWebhooks, recordWebhookFailure, WebhookSubscription } from './webhookStore';

export type OutgoingEvent = {
  id: string;
  type: string;
  timestamp: string;
  source?: string;
  data: any;
  metadata?: Record<string, any>;
};

function signPayload(secret: string, raw: string) {
  const h = crypto.createHmac('sha256', secret || '');
  h.update(raw);
  return 'sha256=' + h.digest('hex');
}

async function dispatchToSubscription(sub: WebhookSubscription, event: OutgoingEvent) {
  const raw = JSON.stringify(event);
  const signature = signPayload(sub.secret || '', raw);
  const timeout = sub.timeout_ms ?? 8000;
  const maxRetries = Math.max(0, sub.retries ?? 3);

  let attempt = 0;
  let lastErr: any = null;

  while (attempt <= maxRetries) {
    try {
      await axios.post(sub.url, raw, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Idempotency-Key': event.id,
          'User-Agent': 'KarigaiWebhooks/1.0'
        },
        timeout
      });
      return; // success
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status;
      const respBody = typeof err?.response?.data === 'string' ? err.response.data : JSON.stringify(err?.response?.data || '');
      await recordWebhookFailure({
        subscription_id: sub.id,
        url: sub.url,
        event_type: event.type,
        payload: event,
        status: status,
        response_body: respBody,
        attempt: attempt + 1,
        error_message: err?.message
      });
      // Backoff: 2^attempt * 500ms
      if (attempt < maxRetries) {
        const waitMs = Math.min(15000, Math.pow(2, attempt) * 500);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
    attempt++;
  }
  // After retries, throw last error
  if (lastErr) throw lastErr;
}

export async function emitEvent(event: OutgoingEvent, subscriptions?: WebhookSubscription[]) {
  try {
    const subs = subscriptions || (await listWebhooks());
    const matching = subs.filter((s) => s.active && s.events?.includes(event.type));
    
    if (matching.length === 0) {
      console.log(`No active webhook subscriptions found for event type: ${event.type}`);
      return; // No subscriptions, but that's OK
    }
    
    await Promise.all(
      matching.map((sub) => dispatchToSubscription(sub, event).catch((err) => {
        console.error(`Failed to dispatch webhook to ${sub.url}:`, err?.message || err);
      }))
    );
  } catch (error: any) {
    // If listWebhooks fails (e.g., collection doesn't exist), log but don't throw
    if (error?.message?.includes('not found') || error?.response?.status === 404) {
      console.warn('Webhooks collection not available. Event will not be dispatched:', event.type);
      return;
    }
    throw error;
  }
}
