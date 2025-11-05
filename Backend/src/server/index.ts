import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import webpush from 'web-push';
import evolutionRoutes from './evolutionService.js';
import webhooksRouter from './webhooks.js';
import automationsRouter from './automations.js';
import messagingRouter from './messaging.js';
import customerJourneyRoutes from '../api/customerJourney.js';
import { runAutomationsForEvent } from './automationRunner.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Handle ESM in TypeScript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// VAPID keys for web push (optional in dev)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.log('VAPID keys not configured. Push notifications API will be disabled.');
}

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Request started`);
  
  // Log request body for POST/PUT requests
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    console.log('Request body:', JSON.stringify(req.body));
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Response sent in ${duration}ms with status ${res.statusCode}`);
    return originalSend.call(this, body);
  };
  
  next();
});

// Routes (email routes removed)
app.use('/evolution', evolutionRoutes);
// Wrap customer journey router so we can tap into emitted events
app.use('/api', (req, res, next) => {
  if (req.path === '/webhook/customer-journey' && req.method === 'POST') {
    res.once('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const payload = req.body;
        const events: any[] = Array.isArray(payload?.events) ? payload.events : payload ? [payload] : [];
        events.forEach((evt) => {
          if (evt && evt.event) {
            runAutomationsForEvent({
              id: evt.id,
              type: evt.event,
              timestamp: evt.timestamp,
              source: 'customer-journey',
              data: evt.payload || evt.data || evt,
              metadata: evt.metadata || {},
            });
          }
        });
      }
    });
  }
  next();
}, customerJourneyRoutes);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/automations', automationsRouter);
app.use('/api/messaging', messagingRouter);

// In-memory store for push subscriptions
const subscriptions: webpush.PushSubscription[] = [];


// Route to subscribe to push notifications
app.post('/notifications/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  console.log('New subscription added:', subscription.endpoint);
  res.status(201).json({});
});

// Route to send a test notification
app.post('/notifications/send', (req, res) => {
  const notificationPayload = {
    notification: {
      title: 'New Order Created!',
      body: 'A new order has been placed.',
      icon: 'assets/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
      },
      actions: [
        {
          action: 'explore',
          title: 'Go to the site',
        },
      ],
    },
  };

  Promise.all(
    subscriptions.map(sub => webpush.sendNotification(sub, JSON.stringify(notificationPayload)))
  )
    .then(() => res.status(200).json({ message: 'Notification sent successfully.' }))
    .catch(err => {
      console.error('Error sending notification, reason: ', err);
      res.sendStatus(500);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

 

export default app;
