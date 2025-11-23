# Webhook Server Deployment Guide

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd WebhookServer
npm install
```

**Note:** This will resolve all TypeScript lint errors you see in the IDE.

### Step 2: Configure Environment

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Update with your actual credentials:

```env
# Razorpay credentials
RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=your_actual_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# PocketBase URL (your production URL)
POCKETBASE_URL=https://backend.viruthigold.in
POCKETBASE_ADMIN_EMAIL=admin@viruthigold.in
POCKETBASE_ADMIN_PASSWORD=your_secure_password

# Secure admin API key for webhook management
WEBHOOKS_ADMIN_API_KEY=generate_a_random_secure_key_here
```

### Step 3: Test Locally

```bash
npm run dev
```

Visit `http://localhost:3001/health` to verify it's running.

### Step 4: Test Payment Creation

```bash
curl -X POST http://localhost:3001/api/razorpay/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "INR"}'
```

## 🐳 Docker Deployment

### Option 1: Docker Compose (Recommended)

```bash
cd WebhookServer

# Build and start
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Option 2: Docker Build Only

```bash
# Build image
docker build -t webhook-server:latest .

# Run container
docker run -d \
  --name webhook-server \
  -p 3001:3001 \
  --env-file .env \
  webhook-server:latest

# View logs
docker logs -f webhook-server
```

## ☁️ Cloud Deployment

### Deploy to Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Configure:
   - **Build Command**: `cd WebhookServer && npm install && npm run build`
   - **Start Command**: `cd WebhookServer && npm start`
   - **Branch**: `webhook-payment-server`
4. Add environment variables from `.env.example`
5. Deploy

Your server will be available at: `https://your-app-name.onrender.com`

### Deploy to Railway

1. Connect GitHub repository
2. Create new project from the webhook-payment-server branch
3. Set Root Directory: `WebhookServer`
4. Add environment variables
5. Deploy

### Deploy to Fly.io

```bash
cd WebhookServer

# Install flyctl if needed
# https://fly.io/docs/hands-on/install-flyctl/

# Initialize fly app
fly launch

# Set environment variables
fly secrets set RAZORPAY_KEY_ID=rzp_xxx
fly secrets set RAZORPAY_KEY_SECRET=xxx
fly secrets set POCKETBASE_URL=https://backend.viruthigold.in
# ... set all other secrets

# Deploy
fly deploy
```

### Deploy to Your Own Server (VPS)

```bash
# SSH into your server
ssh user@your-server.com

# Clone repository
git clone https://github.com/rizo8107/zenthra.shop.git
cd zenthra.shop
git checkout webhook-payment-server

# Install dependencies
cd WebhookServer
npm install

# Build
npm run build

# Install PM2 for process management
npm install -g pm2

# Create .env file
nano .env
# Paste your environment variables

# Start with PM2
pm2 start dist/index.js --name webhook-server

# Setup PM2 to start on reboot
pm2 startup
pm2 save

# View logs
pm2 logs webhook-server
```

## 🔗 Use in Your Applications

### Frontend Integration

```javascript
// In your frontend checkout page
const WEBHOOK_SERVER_URL = 'https://webhooks.viruthigold.in'; // or your deployed URL

// Create Razorpay order
async function createOrder(amount) {
  const response = await fetch(`${WEBHOOK_SERVER_URL}/api/razorpay/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency: 'INR' })
  });
  return response.json();
}

// Verify payment after Razorpay checkout
async function verifyPayment(paymentData) {
  const response = await fetch(`${WEBHOOK_SERVER_URL}/api/razorpay/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData)
  });
  return response.json();
}
```

### Backend Integration

```javascript
// Emit webhook events
async function notifyOrderPaid(orderId, amount) {
  await fetch(`${WEBHOOK_SERVER_URL}/api/webhooks/emit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'order.paid',
      data: { order_id: orderId, amount },
      source: 'checkout'
    })
  });
}
```

### Environment Variable in Other Services

Update your main `.env` file:

```env
# Add to root .env
VITE_WEBHOOK_SERVER_URL=https://webhooks.viruthigold.in
```

## 🔒 Security Checklist

- [ ] Changed `WEBHOOKS_ADMIN_API_KEY` to a secure random value
- [ ] Updated `RAZORPAY_KEY_SECRET` with production credentials
- [ ] Set `RAZORPAY_WEBHOOK_SECRET` to match Razorpay dashboard
- [ ] Updated `POCKETBASE_ADMIN_PASSWORD` to a strong password
- [ ] Set `CORS_ORIGIN` to your frontend domain (not `*` in production)
- [ ] Enabled HTTPS (handled by cloud platform or reverse proxy)
- [ ] Webhook signatures are being verified
- [ ] Monitored logs for suspicious activity

## 📊 Monitoring

### Health Check

```bash
curl https://webhooks.viruthigold.in/health
```

### Set Up Uptime Monitoring

Use services like:
- UptimeRobot (Free)
- Better Uptime
- Pingdom

Monitor: `https://webhooks.viruthigold.in/health`

### Logging

```bash
# Docker logs
docker logs -f webhook-server

# PM2 logs
pm2 logs webhook-server

# Cloud platform logs
# Use platform's dashboard/CLI
```

## 🐛 Troubleshooting

### TypeScript Errors in IDE

**Solution**: Run `npm install` in the WebhookServer directory. All lint errors are due to missing node_modules.

### Server Won't Start

```bash
# Check logs
docker logs webhook-server

# Verify environment variables
docker exec webhook-server env | grep RAZORPAY

# Test PocketBase connection
curl $POCKETBASE_URL/api/health
```

### Payment Verification Fails

1. Verify `RAZORPAY_KEY_SECRET` is correct
2. Check signature is being passed from frontend
3. Review server logs for detailed error
4. Test with Razorpay test credentials first

### Webhooks Not Firing

1. Check webhook subscription is active: `GET /api/webhooks/subscriptions`
2. Verify events array includes the event type
3. Test webhook URL is accessible
4. Check webhook secret matches

## 📈 Scaling

### Horizontal Scaling

Deploy multiple instances behind a load balancer:

```bash
# Start 3 instances on different ports
docker run -p 3001:3001 --env PORT=3001 webhook-server
docker run -p 3002:3001 --env PORT=3002 webhook-server
docker run -p 3003:3001 --env PORT=3003 webhook-server

# Use nginx/HAProxy to load balance
```

### Database Connection Pooling

PocketBase client handles this automatically, but for high traffic:
- Consider Redis for caching webhook subscriptions
- Use queue systems (Bull/BullMQ) for async webhook delivery

## 🔄 Updates

### Pull Latest Changes

```bash
cd WebhookServer
git pull origin webhook-payment-server
npm install
npm run build

# Restart
pm2 restart webhook-server
# or
docker compose up --build -d
```

## 📝 Next Steps

1. Deploy the server to your preferred platform
2. Update your frontend to use the new URL
3. Configure Razorpay webhook URL in Razorpay dashboard
4. Test end-to-end payment flow
5. Set up monitoring and alerts
6. Document any custom integrations

---

**Need Help?** Create an issue in the repository or refer to README.md for API documentation.
