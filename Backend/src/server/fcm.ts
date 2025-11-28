import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// In-memory store of device tokens (per server instance)
const deviceTokens = new Set<string>();

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
const FCM_SERVER_KEY = process.env.FIREBASE_SERVER_KEY;

if (!FCM_SERVER_KEY) {
  console.warn('[FCM] FIREBASE_SERVER_KEY is not set. Mobile push notifications will be disabled.');
}

async function sendFcmMessage(payload: unknown) {
  if (!FCM_SERVER_KEY) return;

  const res = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[FCM] Error sending message:', res.status, text);
  }
}

// Register / update a device token from the Android app
router.post('/devices', async (req: Request, res: Response) => {
  try {
    const { token, platform } = req.body as { token?: string; platform?: string };

    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    deviceTokens.add(token);
    console.log(`[FCM] Registered device token (${platform || 'unknown'}):`, token.slice(0, 12) + '...');

    return res.json({ ok: true });
  } catch (err) {
    const e = err as Error;
    console.error('[FCM] Failed to register device token:', e.message);
    return res.status(500).json({ error: e.message || 'Failed to register device token' });
  }
});

// Trigger a "new order" notification to all registered devices
router.post('/notifications/order', async (req: Request, res: Response) => {
  try {
    const { orderId, title, body, total } = req.body as {
      orderId?: string;
      title?: string;
      body?: string;
      total?: number | string;
    };

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    if (deviceTokens.size === 0) {
      console.log('[FCM] No device tokens registered. Skipping push.');
      return res.json({ ok: true, sent: 0 });
    }

    const notificationTitle = title || `New order #${String(orderId).slice(0, 8)}`;
    const notificationBody = body || 'A new order has been placed.';

    const payloadBase = {
      data: {
        type: 'new_order',
        order_id: String(orderId),
        title: notificationTitle,
        body: notificationBody,
        total: total != null ? String(total) : undefined,
      },
    };

    const tokens = Array.from(deviceTokens);
    await Promise.all(
      tokens.map((token) =>
        sendFcmMessage({
          to: token,
          ...payloadBase,
        })
      )
    );

    console.log(`[FCM] Sent new_order notification for order ${orderId} to ${tokens.length} devices.`);
    return res.json({ ok: true, sent: tokens.length });
  } catch (err) {
    const e = err as Error;
    console.error('[FCM] Failed to send order notification:', e.message);
    return res.status(500).json({ error: e.message || 'Failed to send order notification' });
  }
});

export default router;
