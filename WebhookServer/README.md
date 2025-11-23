# Webhook & Payment Verification Server

A standalone Node.js/Express server for handling payment verification, webhooks, and automation workflows. This server can be deployed independently and accessed via REST API from your main application.

## 🚀 Features

- **Payment Verification**: Razorpay payment creation, verification, capture, and refunds
- **Webhook Management**: Create, update, and manage webhook subscriptions
- **Webhook Dispatcher**: Emit events to registered webhook endpoints
- **Automation Triggers**: Trigger and manage automation workflows
- **PocketBase Integration**: Store and retrieve data from PocketBase
- **Signature Verification**: Secure webhook signature validation
- **Health Checks**: Built-in health monitoring endpoints

## 📁 Project Structure

```
WebhookServer/
├── src/
│   ├── index.ts                  # Main server file
│   └── routes/
│       ├── razorpay.ts           # Payment verification endpoints
│       ├── webhooks.ts           # Webhook management endpoints
│       ├── automation.ts         # Automation workflow endpoints
│       └── pocketbase.ts         # PocketBase query endpoints
├── .env.example                  # Environment variables template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── Dockerfile                    # Docker build configuration
├── docker-compose.yml            # Docker Compose setup
└── README.md                     # This file
```

## 🛠️ Installation

### Option 1: Local Development

```bash
# Navigate to WebhookServer directory
cd WebhookServer

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start development server
npm run dev
```

### Option 2: Docker

```bash
# Navigate to WebhookServer directory
cd WebhookServer

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Build and start with Docker Compose
docker compose up --build -d

# View logs
docker compose logs -f
```

## 🔧 Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3001
NODE_ENV=production
CORS_ORIGIN=*

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# PocketBase Configuration
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=yourpassword123

# Webhooks Configuration
WEBHOOKS_ADMIN_API_KEY=your-secure-admin-api-key
WEBHOOKS_COLLECTION=webhooks
WEBHOOKS_FAILURES_COLLECTION=webhook_failures

# Automation Configuration
AUTOMATION_FLOWS_COLLECTION=automation_flows
AUTOMATION_TRIGGERS_COLLECTION=automation_triggers
```

## 📡 API Endpoints

### Health Check

```http
GET /health
```

Returns server health status.

### Razorpay Payment Endpoints

#### Create Order

```http
POST /api/razorpay/create-order
Content-Type: application/json

{
  "amount": 100,
  "currency": "INR",
  "receipt": "receipt_123",
  "notes": {
    "order_id": "order_xyz"
  }
}
```

#### Verify Payment

```http
POST /api/razorpay/verify-payment
Content-Type: application/json

{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

#### Capture Payment

```http
POST /api/razorpay/capture-payment
Content-Type: application/json

{
  "payment_id": "pay_xxx",
  "amount": 100
}
```

#### Refund Payment

```http
POST /api/razorpay/refund-payment
Content-Type: application/json

{
  "payment_id": "pay_xxx",
  "amount": 50,
  "notes": {
    "reason": "Customer request"
  }
}
```

#### Get Payment Details

```http
GET /api/razorpay/payment/:payment_id
```

#### Razorpay Webhook

```http
POST /api/razorpay/webhook
X-Razorpay-Signature: signature_xxx
Content-Type: application/json

{
  "event": "payment.captured",
  "payload": {...}
}
```

### Webhook Management Endpoints

#### Health Check

```http
GET /api/webhooks/health
```

#### List Webhook Subscriptions

```http
GET /api/webhooks/subscriptions
X-API-Key: your-admin-api-key
```

#### Create Webhook Subscription

```http
POST /api/webhooks/subscriptions
X-API-Key: your-admin-api-key
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["payment.captured", "order.paid"],
  "secret": "your-webhook-secret",
  "active": true,
  "retries": 3,
  "timeout_ms": 8000,
  "description": "Production webhook"
}
```

#### Update Webhook Subscription

```http
PUT /api/webhooks/subscriptions/:id
X-API-Key: your-admin-api-key
Content-Type: application/json

{
  "active": false
}
```

#### Delete Webhook Subscription

```http
DELETE /api/webhooks/subscriptions/:id
X-API-Key: your-admin-api-key
```

#### Emit Webhook Event

```http
POST /api/webhooks/emit
Content-Type: application/json

{
  "type": "order.paid",
  "data": {
    "order_id": "order_123",
    "amount": 100
  },
  "source": "api",
  "metadata": {
    "user_id": "user_456"
  }
}
```

#### Receive Incoming Webhook

```http
POST /api/webhooks/receive/:identifier
X-Webhook-Signature: signature_xxx
Content-Type: application/json

{
  "event": "custom.event",
  "data": {...}
}
```

### Automation Endpoints

#### Trigger Automation Flow

```http
POST /api/automation/trigger
Content-Type: application/json

{
  "flow_id": "flow_abc123",
  "data": {
    "order_id": "order_xyz",
    "customer_email": "customer@example.com"
  }
}
```

#### Get Automation Status

```http
GET /api/automation/status/:trigger_id
```

#### List Automation Flows

```http
GET /api/automation/flows
```

### PocketBase Endpoints

#### PocketBase Health Check

```http
GET /api/pocketbase/health
```

#### Query PocketBase Collection

```http
POST /api/pocketbase/query
Content-Type: application/json

{
  "collection": "orders",
  "filter": "status = 'pending'",
  "sort": "-created",
  "limit": 10
}
```

## 🔐 Security

### Admin API Key

Protected endpoints require an `X-API-Key` header:

```http
X-API-Key: your-secure-admin-api-key
```

### Webhook Signature Verification

Webhooks can be signed with HMAC-SHA256:

```javascript
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

## 🚢 Deployment

### Deploy to Production

1. **Update Environment Variables**

```bash
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.com
# ... other variables
```

2. **Build and Deploy with Docker**

```bash
docker compose up --build -d
```

3. **Use URL in Your App**

```javascript
// In your frontend/backend
const WEBHOOK_SERVER_URL = 'https://webhooks.yourdomain.com';

// Create Razorpay order
const response = await fetch(`${WEBHOOK_SERVER_URL}/api/razorpay/create-order`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 100, currency: 'INR' })
});
```

### Deploy to Cloud Platforms

#### Dokploy/Traefik

Add to your main `docker-compose.yml`:

```yaml
services:
  webhook-server:
    build:
      context: ./WebhookServer
      dockerfile: Dockerfile
    environment:
      PORT: 3001
      # ... other env vars
    labels:
      - traefik.enable=true
      - traefik.http.routers.webhooks.rule=Host(`webhooks.yourdomain.com`)
      - traefik.http.routers.webhooks.entrypoints=websecure
      - traefik.http.routers.webhooks.tls.certresolver=letsencrypt
      - traefik.http.services.webhooks.loadbalancer.server.port=3001
    networks:
      - dokploy-network
```

#### Render/Railway/Fly.io

1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Use `npm run build && npm start` as start command
4. Set PORT to the platform's default

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-11-23T12:00:00.000Z",
  "uptime": 12345.67,
  "environment": "production",
  "version": "1.0.0"
}
```

### Docker Health Check

Docker automatically monitors the health endpoint:

```bash
docker ps
# Shows health status in STATUS column
```

### Logs

```bash
# Docker Compose logs
docker compose logs -f

# Docker logs
docker logs webhook-payment-server -f

# Node.js PM2 (if using PM2)
pm2 logs webhook-server
```

## 🧪 Testing

### Test Payment Verification

```bash
curl -X POST http://localhost:3001/api/razorpay/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "INR"}'
```

### Test Webhook Subscription

```bash
curl -X POST http://localhost:3001/api/webhooks/subscriptions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-admin-api-key" \
  -d '{
    "url": "https://webhook.site/your-unique-url",
    "events": ["payment.captured"],
    "active": true
  }'
```

### Test Webhook Emission

```bash
curl -X POST http://localhost:3001/api/webhooks/emit \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment.captured",
    "data": {"order_id": "test_123", "amount": 100}
  }'
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Change PORT in .env
PORT=3002

# Or find and kill the process
lsof -i :3001
kill -9 <PID>
```

### PocketBase Connection Failed

```bash
# Check PocketBase is running
curl http://127.0.0.1:8090/api/health

# Verify POCKETBASE_URL in .env
# Ensure admin credentials are correct
```

### Webhook Not Receiving Events

1. Check webhook subscription is active
2. Verify webhook URL is accessible
3. Check webhook secret matches
4. Review server logs for errors

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📧 Support

For issues and questions, please create an issue in the GitHub repository.

---

**Version**: 1.0.0  
**Last Updated**: November 23, 2025
