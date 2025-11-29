import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config();
const router = express.Router();
// In-memory store of device tokens (per server instance)
const deviceTokens = new Set();
// Initialize Firebase Admin SDK
let firebaseInitialized = false;
function initFirebase() {
    if (firebaseInitialized)
        return true;
    try {
        // Try to load service account from file
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
            path.join(process.cwd(), 'firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            firebaseInitialized = true;
            console.log('[FCM] Firebase Admin initialized with service account file');
            return true;
        }
        // Try to load from environment variable (JSON string)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            firebaseInitialized = true;
            console.log('[FCM] Firebase Admin initialized with env variable');
            return true;
        }
        console.warn('[FCM] No Firebase service account found. Push notifications disabled.');
        console.warn('[FCM] To enable: Download service account JSON from Firebase Console → Project Settings → Service Accounts');
        return false;
    }
    catch (err) {
        console.error('[FCM] Failed to initialize Firebase:', err);
        return false;
    }
}
// Initialize on module load
initFirebase();
async function sendFcmMessage(token, notification, data) {
    if (!firebaseInitialized) {
        console.warn('[FCM] Firebase not initialized, skipping notification');
        return false;
    }
    try {
        const message = {
            token,
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: data || {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'orders',
                },
            },
        };
        const response = await admin.messaging().send(message);
        console.log('[FCM] Message sent:', response);
        return true;
    }
    catch (err) {
        console.error('[FCM] Error sending message:', err);
        return false;
    }
}
// Register / update a device token from the Android app
router.post('/devices', async (req, res) => {
    try {
        const { token, platform } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'token is required' });
        }
        deviceTokens.add(token);
        console.log(`[FCM] Registered device token (${platform || 'unknown'}):`, token.slice(0, 12) + '...');
        return res.json({ ok: true });
    }
    catch (err) {
        const e = err;
        console.error('[FCM] Failed to register device token:', e.message);
        return res.status(500).json({ error: e.message || 'Failed to register device token' });
    }
});
// Trigger a "new order" notification to all registered devices
router.post('/notifications/order', async (req, res) => {
    try {
        const { orderId, title, body, total } = req.body;
        if (!orderId) {
            return res.status(400).json({ error: 'orderId is required' });
        }
        if (deviceTokens.size === 0) {
            console.log('[FCM] No device tokens registered. Skipping push.');
            return res.json({ ok: true, sent: 0 });
        }
        const notificationTitle = title || `New order #${String(orderId).slice(0, 8)}`;
        const notificationBody = body || 'A new order has been placed.';
        const tokens = Array.from(deviceTokens);
        let sentCount = 0;
        await Promise.all(tokens.map(async (token) => {
            const success = await sendFcmMessage(token, { title: notificationTitle, body: notificationBody }, {
                type: 'new_order',
                order_id: String(orderId),
                total: total != null ? String(total) : '',
            });
            if (success)
                sentCount++;
        }));
        console.log(`[FCM] Sent new_order notification for order ${orderId} to ${sentCount} devices.`);
        return res.json({ ok: true, sent: sentCount });
    }
    catch (err) {
        const e = err;
        console.error('[FCM] Failed to send order notification:', e.message);
        return res.status(500).json({ error: e.message || 'Failed to send order notification' });
    }
});
// Test notification endpoint
router.post('/notifications/test', async (req, res) => {
    try {
        if (deviceTokens.size === 0) {
            return res.status(400).json({
                error: 'No devices registered',
                message: 'Open the app on your Android device first to register for notifications.',
                firebaseInitialized,
            });
        }
        const notificationTitle = 'Test Notification 🔔';
        const notificationBody = 'This is a test notification from Zenthra Shop!';
        const tokens = Array.from(deviceTokens);
        let sentCount = 0;
        await Promise.all(tokens.map(async (token) => {
            const success = await sendFcmMessage(token, { title: notificationTitle, body: notificationBody }, { type: 'test' });
            if (success)
                sentCount++;
        }));
        console.log(`[FCM] Sent test notification to ${tokens.length} devices.`);
        return res.json({
            ok: true,
            sent: tokens.length,
            message: `Test notification sent to ${tokens.length} device(s)`
        });
    }
    catch (err) {
        const e = err;
        console.error('[FCM] Failed to send test notification:', e.message);
        return res.status(500).json({ error: e.message || 'Failed to send test notification' });
    }
});
// Get registered devices count
router.get('/devices/count', (req, res) => {
    return res.json({ count: deviceTokens.size });
});
export default router;
