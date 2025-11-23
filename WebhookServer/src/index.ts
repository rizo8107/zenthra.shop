import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import razorpayRoutes from './routes/razorpay.js';
import webhookRoutes from './routes/webhooks.js';
import automationRoutes from './routes/automation.js';
import pocketbaseRoutes from './routes/pocketbase.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - Request started`);
  
  // Log request body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${req.method} ${req.url} - Response sent in ${duration}ms with status ${res.statusCode}`);
    return originalSend.call(this, body);
  };
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/pocketbase', pocketbaseRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.url,
    method: req.method
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 Webhook & Payment Server                       ║
║                                                       ║
║   Status:      RUNNING                               ║
║   Port:        ${PORT}                                    ║
║   Environment: ${process.env.NODE_ENV || 'development'}                           ║
║   Time:        ${new Date().toISOString()}            ║
║                                                       ║
║   Endpoints:                                         ║
║   - Health:      GET  /health                        ║
║   - Razorpay:    POST /api/razorpay/*                ║
║   - Webhooks:    *    /api/webhooks/*                ║
║   - Automation:  *    /api/automation/*              ║
║   - PocketBase:  *    /api/pocketbase/*              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
