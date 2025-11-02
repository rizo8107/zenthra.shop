# Migration Guide: Individual .env to Unified Root .env

## 🔄 What Changed?

Your project has been updated to use a **single unified `.env` file** in the root directory instead of separate `.env` files in Frontend and Backend CMS folders.

## ✅ Benefits

- **Simplified Configuration**: One file to manage instead of two
- **No Sync Issues**: Impossible to have mismatched PocketBase URLs
- **Easier Maintenance**: Update credentials in one place
- **Less Confusion**: Clear single source of truth

## 📋 Migration Steps

### Step 1: Create Root .env File

```bash
# From the root directory (e:\ecom\Merge)
cp .env.example .env
```

### Step 2: Copy Your Existing Credentials

If you have existing `.env` files, copy their contents to the new root `.env`:

**From `Frontend/.env`:**
```env
VITE_POCKETBASE_URL=...
VITE_POCKETBASE_ADMIN_EMAIL=...
VITE_POCKETBASE_ADMIN_PASSWORD=...
VITE_RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

**From `Backend CMS/.env`:**
```env
EMAIL_HOST=...
EMAIL_PORT=...
EMAIL_USER=...
EMAIL_PASSWORD=...
EMAIL_FROM=...
```

**Combine into Root `.env`:**
```env
# PocketBase Configuration
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_POCKETBASE_ADMIN_EMAIL=your-admin@email.com
VITE_POCKETBASE_ADMIN_PASSWORD=your-password

# Frontend - Payment Gateway
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY
RAZORPAY_KEY_SECRET=your_secret

# Backend CMS - Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourstore.com
```

### Step 3: Remove Old .env Files

```bash
# Remove Frontend .env
rm Frontend/.env

# Remove Backend CMS .env (Windows)
del "Backend CMS\.env"

# Or (PowerShell/Unix)
rm "Backend CMS/.env"
```

### Step 4: Verify Setup

```bash
npm run verify
```

You should see:
- ✅ Root .env file exists (shared by Frontend & CMS)
- ✅ All required variables configured

## 🔧 Technical Details

### What Was Changed?

**Frontend/vite.config.ts:**
```typescript
// Added
envDir: path.resolve(__dirname, '..'), // Use root .env file
```

**Backend CMS/vite.config.ts:**
```typescript
// Added
envDir: path.resolve(__dirname, '..'), // Use root .env file
```

Both projects now load environment variables from the parent directory (root) instead of their own directories.

## 🧪 Testing

### Test 1: Verify Environment Loading

```bash
# Start the projects
npm run dev

# Check the console output
# Both should show the same PocketBase URL
```

### Test 2: Verify Data Sync

1. Add a product in Backend CMS
2. Check it appears in Frontend immediately
3. Both are using the same PocketBase database

### Test 3: Run Verification

```bash
npm run verify
```

Should pass all checks without warnings about individual .env files.

## 🐛 Troubleshooting

### Issue: "Cannot find .env file"

**Solution:**
```bash
# Make sure you're creating .env in the ROOT directory
cd e:\ecom\Merge
cp .env.example .env
# NOT in Frontend/ or Backend CMS/
```

### Issue: "Environment variables not loading"

**Solution:**
1. Restart the development servers
2. Clear any cached builds:
   ```bash
   rm -rf Frontend/node_modules/.vite
   rm -rf "Backend CMS/node_modules/.vite"
   ```
3. Restart: `npm run dev`

### Issue: "Old .env files still detected"

**Solution:**
```bash
# Remove old files
rm Frontend/.env 2>/dev/null || true
rm "Backend CMS/.env" 2>/dev/null || true

# Verify they're gone
npm run verify
```

## 📊 Before vs After

### Before (Old Approach)
```
Merge/
├── Frontend/
│   └── .env  ← Separate file
└── Backend CMS/
    └── .env  ← Another separate file

❌ Risk: URLs could be different
❌ Maintenance: Update two files
❌ Confusion: Which file has which settings?
```

### After (New Approach)
```
Merge/
├── .env  ← Single unified file
├── Frontend/
└── Backend CMS/

✅ One source of truth
✅ Update once, applies everywhere
✅ Impossible to have mismatched configs
```

## 🎯 Quick Commands

```bash
# Verify migration
npm run verify

# Start development
npm run dev

# View root .env
cat .env

# Edit root .env (Windows)
notepad .env

# Edit root .env (Unix/Mac)
nano .env
```

## ✅ Migration Checklist

- [ ] Root `.env` file created
- [ ] All credentials copied from old files
- [ ] Old `Frontend/.env` removed
- [ ] Old `Backend CMS/.env` removed
- [ ] Verification passes: `npm run verify`
- [ ] Both projects start: `npm run dev`
- [ ] Data syncs between Frontend and CMS

## 🎉 You're Done!

Your project now uses a unified environment configuration. Both Frontend and Backend CMS will automatically read from the root `.env` file.

---

**Need Help?** See [SETUP.md](./SETUP.md) or [QUICKSTART.md](./QUICKSTART.md) for more information.
