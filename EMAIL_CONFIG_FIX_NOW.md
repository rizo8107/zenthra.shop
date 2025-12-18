# URGENT: Email Config Page Quick Fix Guide

## What I See in Your Screenshot

❌ **Error:** "Failed to verify SMTP connection"
❌ **Console Errors:** 
- API trying to connect to `https://localhost:9091` (wrong!)
- 403 errors for `email_templates` collection
- Connection REFUSED errors

---

## ✅ I Just Fixed

### 1. **Backend URL Corrected** ✅

Updated `EmailConfigPage.tsx`:
- ❌ Was using: `/api/email/test-connection` (relative path - going to wrong port)
- ✅ Now using: `http://localhost:3001/api/email/test-connection` (correct backend)

**Files changed:**
- Line 312: Test connection endpoint
- Line 440: Send test email endpoint

---

## 🔧 What YOU Need to Do Now

### Step 1: Create PocketBase Collections

**Open PocketBase Admin:** http://127.0.0.1:8090/_/

#### Create Collection 1: `email_templates`

1. Click **Collections** → **New Collection**
2. Name: `email_templates`
3. Type: **Base**
4. Add these fields:

```
name (Text, Required)
subject (Text, Required)  
htmlContent (Text, Required)
textContent (Text, Optional)
description (Text, Optional)
isActive (Bool, Default: true)
requiresAdditionalInfo (Bool, Default: false)
additionalInfoLabel (Text, Optional)
additionalInfoPlaceholder (Text, Optional)
includeImage (Bool, Default: false)
imageUrl (Text, Optional)
```

5. **API Rules Tab:**
   - List rule: `@request.auth.id != ""`
   - View rule: `@request.auth.id != ""`
   - Create rule: `@request.auth.id != ""`
   - Update rule: `@request.auth.id != ""`
   - Delete rule: `@request.auth.id != ""`

6. Click **Save**

#### Create Collection 2: `email_activity`

1. Click **New Collection** again
2. Name: `email_activity`
3. Type: **Base**
4. Add these fields:

```
recipient (Text, Required)
subject (Text, Required)
template_name (Text, Optional)
status (Select, Options: 'sent', 'failed', Required)
error_message (Text, Optional)
order_id (Text, Optional)
```

5. **API Rules Tab:**
   - List rule: `@request.auth.id != ""`
   - View rule: `@request.auth.id != ""`
   - Create rule: `@request.auth.id != ""`

6. Click **Save**

---

### Step 2: Restart Dev Server

```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

---

### Step 3: Reload Email Config Page

1. Go back to browser
2. **Hard refresh** the email config page: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
3. The page should now load without 403 errors

---

### Step 4: Configure & Test SMTP

**I see you already have settings filled in:**
- Host: karigairseregmail.com (this looks wrong - should be `smtp.gmail.com`)
- Port: shown (verify it's 587)
- Username/Password: filled in

**Fix the SMTP Host:**
```
SMTP Host: smtp.gmail.com  (NOT karigairseregmail.com)
Port: 587
Secure: false (uncheck SSL/TLS box)
Username: karigairser@gmail.com
Password: [Your Gmail App Password]
```

Then:
1. Click **Save Configuration**
2. Click **Test Connection**
3. Should show ✅ **Connected**

---

## 📋 Quick Checklist

- [ ] Create `email_templates` collection in PocketBase
- [ ] Create `email_activity` collection in PocketBase
- [ ] Set API rules (all authenticated users: `@request.auth.id != ""`)
- [ ] Restart `npm run dev`
- [ ] Hard refresh browser (`Ctrl + Shift + R`)
- [ ] Fix SMTP host to `smtp.gmail.com`
- [ ] Save configuration
- [ ] Click Test Connection → Should work! ✅

---

## 🐛 If Still Not Working

**Test backend is running:**
Open new terminal:
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok"}`

**Test email endpoint:**
```bash
curl -X POST http://localhost:3001/api/email/test-connection \
  -H "Content-Type: application/json" \
  -d '{"host":"smtp.gmail.com","port":587,"secure":false,"user":"test","password":"test"}'
```

Should return JSON (not 404)

---

## 📸 What Fixed in Code

**Before:**
```typescript
const response = await fetch('/api/email/test-connection', {
```

**After:**
```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const response = await fetch(`${backendUrl}/api/email/test-connection`, {
```

This ensures the API calls go to the correct backend server at port 3001, not the Vite dev server at port 9091.

---

## ⚡ Expected Result After Fixes

1. ✅ Templates tab loads without errors
2. ✅ Connection tab shows "Unknown" initially (until you configure SMTP)
3. ✅ Settings tab lets you save SMTP config
4. ✅ Test Connection button works
5. ✅ No more 403 or 404 errors in console

---

Once you complete these steps, try the **Test Connection** button again - it should work! 🎉
