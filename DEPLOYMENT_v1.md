# Deployment Guide - Version 1.0

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- `.env` file configured at repository root
- PocketBase instance running and accessible

### Step 1: Update Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
# Required
VITE_POCKETBASE_URL=https://backend.viruthigold.in
VITE_POCKETBASE_ADMIN_EMAIL=admin@example.com
VITE_POCKETBASE_ADMIN_PASSWORD=yourpassword123
VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_KEY

# Optional (Branding fallbacks)
VITE_SITE_TITLE=Viruthi Gold
VITE_SITE_LOGO=/logo.png
```

### Step 2: Build and Deploy

```bash
# Pull latest changes
git checkout v1
git pull origin v1

# Build and start containers
docker compose down
docker compose up --build -d

# Check logs
docker compose logs -f
```

### Step 3: Configure Branding

1. **Access Backend Admin**
   - Production: `https://admin.viruthigold.in`
   - Local: `http://localhost:4000`

2. **Login with Admin Credentials**
   - Use credentials from `.env` file

3. **Go to Branding Page**
   - Navigate to: `/admin/branding`

4. **Configure Branding Tab**
   - **Site Title**: Enter your store name (e.g., "Viruthi Gold")
   - **Site Description**: Enter a brief description for SEO
   - **Store Logo**: Upload your logo (PNG/SVG/JPG)
   - **Favicon**: Upload favicon (32x32 or 64x64 .ico/.png)
   - **Social Share Image**: Upload OG image (1200x630 recommended)

5. **Configure Contact Tab**
   - Add contact information
   - Add social media links

6. **Configure Policies Tab**
   - Update Privacy Policy
   - Update Terms & Conditions
   - Update Shipping Policy
   - Update Cancellations & Refunds Policy
   - Update Return Policy

7. **Save Changes**
   - Click "Save Changes" button
   - Verify changes on frontend

### Step 4: Verify Deployment

1. **Frontend Check**
   - Production: `https://viruthigold.in`
   - Local: `http://localhost:8081`
   - ✅ Browser tab shows correct title
   - ✅ Favicon displays correctly
   - ✅ Logo appears in header
   - ✅ No console errors

2. **Page Refresh Test**
   - Hard refresh page (Ctrl+Shift+R)
   - ✅ No flash of old branding
   - ✅ Logo/title loads instantly

3. **Policy Pages Check**
   - Visit each policy page
   - ✅ Content displays correctly
   - ✅ Rich text formatting preserved

## 🐳 Docker Configuration

### Port Mappings

| Service | Internal Port | External Port | URL |
|---------|--------------|---------------|-----|
| Frontend | 80 | 8081 | http://localhost:8081 |
| Backend UI | 8080 | 4000 | http://localhost:4000 |
| Backend API | 3001 | 3001 | http://localhost:3001 |

### Environment Variables in Docker

All `VITE_*` prefixed variables are automatically exposed to the client-side code.

**Backend Build Args:**
- `VITE_POCKETBASE_URL`
- `VITE_RAZORPAY_KEY_ID`
- `VITE_WHATSAPP_API_URL`
- `VITE_EVOLUTION_API_KEY`
- `VITE_EVOLUTION_API_URL`
- `VITE_EVOLUTION_INSTANCE_NAME`
- `VITE_VAPID_PUBLIC_KEY`
- `VITE_GEMINI_API_KEY`
- And more... (see `docker-compose.yml`)

**Backend Runtime Environment:**
- `VITE_POCKETBASE_ADMIN_EMAIL`
- `VITE_POCKETBASE_ADMIN_PASSWORD`
- `WEBHOOKS_ADMIN_API_KEY`
- `WEBHOOKS_COLLECTION`
- `WEBHOOKS_FAILURES_COLLECTION`

## 🔧 Troubleshooting

### Issue: Blank Page on Frontend

**Solution:**
```bash
# Check if containers are running
docker compose ps

# Check frontend logs
docker compose logs frontend

# Rebuild frontend
docker compose up --build -d frontend
```

### Issue: Logo Not Loading

**Cause:** `siteLogoUrl` not set in `site_settings`

**Solution:**
1. Go to `/admin/branding`
2. Upload logo under "Store Logo"
3. Click "Save Changes"
4. Refresh frontend

### Issue: Flash of Old Branding

**Cause:** SessionStorage not working or settings not cached

**Solution:**
1. Clear browser cache and sessionStorage
2. Hard refresh (Ctrl+Shift+R)
3. Check browser console for errors

### Issue: Environment Variables Not Loading

**Cause:** `.env` file not in root directory or missing `VITE_` prefix

**Solution:**
1. Ensure `.env` is at repository root (not in Frontend/Backend)
2. All client-side variables must have `VITE_` prefix
3. Rebuild containers: `docker compose up --build -d`

### Issue: Admin Login Fails

**Cause:** Incorrect credentials or PocketBase not accessible

**Solution:**
1. Verify `VITE_POCKETBASE_URL` is correct
2. Check PocketBase is running and accessible
3. Verify admin credentials in `.env`
4. Check backend logs: `docker compose logs cms`

## 📊 Monitoring

### Health Checks

```bash
# Check all containers
docker compose ps

# Check frontend health
curl http://localhost:8081

# Check backend health
curl http://localhost:4000

# Check backend API health
curl http://localhost:3001/health
```

### Logs

```bash
# All services
docker compose logs -f

# Frontend only
docker compose logs -f frontend

# Backend only
docker compose logs -f cms

# Last 100 lines
docker compose logs --tail=100
```

## 🔄 Rollback

If something goes wrong, rollback to previous version:

```bash
# Switch to main branch
git checkout main

# Rebuild containers
docker compose down
docker compose up --build -d
```

## 🎯 Production Deployment (Dokploy/Traefik)

### Traefik Labels

The `docker-compose.yml` includes Traefik labels for automatic SSL and routing:

**Frontend:**
- Domain: `karigaistore.in` (update to your domain)
- SSL: Automatic via Let's Encrypt
- Port: 80

**Backend:**
- Domain: `admin.karigaistore.in` (update to your domain)
- SSL: Automatic via Let's Encrypt
- UI Port: 8080
- API Port: 3001

### Update Domains

Edit `docker-compose.yml` and replace:
- `karigaistore.in` → `viruthigold.in`
- `admin.karigaistore.in` → `admin.viruthigold.in`

Then rebuild:
```bash
docker compose up --build -d
```

## 📝 Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Docker containers running
- [ ] PocketBase accessible
- [ ] Admin login working
- [ ] Branding configured in admin UI
- [ ] Logo uploaded and displaying
- [ ] Favicon showing in browser tab
- [ ] Site title correct
- [ ] Policy pages updated
- [ ] Contact information added
- [ ] Frontend loads without errors
- [ ] No flash of old branding on refresh
- [ ] SSL certificates active (production)
- [ ] Monitoring/logging configured

## 🆘 Support

If you encounter issues:

1. Check logs: `docker compose logs -f`
2. Review `CHANGELOG_v1.md` for known issues
3. Verify `.env` configuration
4. Check PocketBase connectivity
5. Review browser console for errors

---

**Version**: 1.0  
**Last Updated**: November 23, 2025
