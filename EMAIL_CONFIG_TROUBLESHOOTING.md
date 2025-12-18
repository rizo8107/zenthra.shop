# Email Config Page - Quick Fixes

## Issue 1: P ocketBase Collections Missing

### Error:
```
403 Forbidden - Only superusers can perform this action
```

### Solution: Create PocketBase Collections

Go to your PocketBase Admin (http://127.0.0.1:8090/_/) and create these collections:

### 1. Create `email_templates` Collection

**Fields:**
```
name (text, required)
subject (text, required)
htmlContent (text, required)
textContent (text, optional)
description (text, optional)
isActive (bool, default: true)
requiresAdditionalInfo (bool, default: false)
additionalInfoLabel (text, optional)
additionalInfoPlaceholder (text, optional)
includeImage (bool, default: false)
imageUrl (text, optional)
```

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `@request.auth.id != ""`
- Update: `@request.auth.id != ""`
- Delete: `@request.auth.id != ""`

### 2. Create `email_activity` Collection

**Fields:**
```
recipient (text, required)
subject (text, required)
template_name (text, optional)
status (text, required) - options: 'sent', 'failed'
error_message (text, optional)
order_id (text, optional)
```

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `@request.auth.id != ""`

---

## Issue 2: Backend API 404 Error

### Error:
```
POST http://localhost:8081/api/email/test-connection 404 (Not Found)
```

### Root Cause:
The backend server is running on port 8081, but it needs to proxy API requests or the email routes aren't loaded properly.

### Solution 1: Check Backend Server is Running

Make sure your backend server is running:
```bash
# The dev command should start both frontend and backend
npm run dev
```

### Solution 2: Verify .env Configuration

Add/verify in your `.env` file:
```bash
VITE_BACKEND_URL=http://localhost:3001
```

If backend runs on different port (like 8081), update accordingly:
```bash
VITE_BACKEND_URL=http://localhost:8081
```

### Solution 3: Proxy Configuration

Check if `vite.config.ts` has proxy setup for `/api`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Backend port
        changeOrigin: true,
      },
    },
  },
});
```

---

## Quick Test Commands

### Test 1: Check Backend Server
```bash
# Test if backend is running
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

### Test 2: Test Email Endpoint
```bash
curl -X POST http://localhost:3001/api/email/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "test@gmail.com",
    "password": "test123"
  }'
```

### Test 3: Check PocketBase Collections
```bash
# Visit PocketBase Admin
http://127.0.0.1:8090/_/

# Check if collections exist:
- email_templates
- email_activity
```

---

## Alternative: Use Direct Backend URL

If proxy isn't working, you can temporarily use direct backend URL in `EmailConfigPage.tsx`:

### Find and Replace:

```typescript
// Line ~312
const response = await fetch('/api/email/test-connection', {
```

**Replace with:**
```typescript
const response = await fetch('http://localhost:3001/api/email/test-connection', {
```

**Do the same for:**
- Line ~439 (send test email)
- Any other `/api/email/...` calls

---

## Rebuild Backend

The backend might need to be rebuilt to include the new `email.ts` file:

```bash
# Stop the server (Ctrl+C)

# Clean and restart
npm run dev
```

---

## Verify Email Routes are Loaded

Check backend console output when starting server. You should see logs like:
```
[Backend] Server listening on http://localhost:3001
[Backend] Routes loaded: /api/email/test-connection
[Backend] Routes loaded: /api/email/send-test
[Backend] Routes loaded: /api/email/send
```

If you don't see these, the `email.ts` router might not be loaded properly.

---

## Complete Setup Checklist

- [ ] Backend server running on port 3001
- [ ] `email_templates` collection created in PocketBase
- [ ] `email_activity` collection created in PocketBase  
- [ ] Collections have proper API rules (authenticated users can access)
- [ ] `.env` has `VITE_BACKEND_URL=http://localhost:3001`
- [ ] Vite proxy configured for `/api` routes
- [ ] Backend console shows email routes loaded
- [ ] Test connection endpoint returns 200, not 404
- [ ] Admin user is logged in (for PocketBase access)

---

## If Still Not Working

### Debug Steps:

1. **Check browser Network tab:**
   - What URL is being called?
   - What's the actual status code?
   - What's the response body?

2. **Check backend console:**
   - Are there any errors when loading `email.ts`?
   - Are routes being registered?

3. **Test directly:**
   ```bash
   # Test from command line
   curl -X POST http://localhost:3001/api/email/test-connection \
     -H "Content-Type: application/json" \
     -d '{"host":"smtp.gmail.com","port":587,"secure":false,"user":"test","password":"test"}'
   ```

4. **Check file imports:**
   - `Backend/src/server/index.ts` has `import emailRouter from './email.js';`
   - `Backend/src/server/index.ts` has `app.use('/api', emailRouter);`

---

## Quick Fix Script

Run this in your terminal from project root:

```bash
# Restart dev server
npm run dev
```

Then in browser console:
```javascript
// Test if backend is reachable
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(console.log);

// Test email endpoint  
fetch('http://localhost:3001/api/email/test-connection', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'test',
    password: 'test'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

Once you complete these fixes, the Email Config page should work properly! 🎉
