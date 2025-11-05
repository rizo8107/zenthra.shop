export type WebhookEvent = {
  type: string;
  id?: string;
  timestamp?: string;
  source?: 'frontend' | 'backend';
  data: any;
  metadata?: Record<string, any>;
};

const API_BASE = (import.meta as any).env?.VITE_WEBHOOKS_API_BASE || '/api/webhooks';

export async function sendWebhookEvent(evt: WebhookEvent): Promise<{ ok: boolean; id?: string }> {
  try {
    const res = await fetch(`${API_BASE}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: evt.id,
        type: evt.type,
        timestamp: evt.timestamp || new Date().toISOString(),
        source: evt.source || 'frontend',
        data: evt.data || {},
        metadata: evt.metadata || {}
      })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Webhook emit failed: ${res.status} ${txt}`);
    }
    return await res.json();
  } catch (e) {
    console.error('sendWebhookEvent error:', e);
    return { ok: false };
  }
}
