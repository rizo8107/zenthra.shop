# Action List: Fix Cron Trigger Setup

## ✅ COMPLETED ACTIONS

### 1. ✅ Added Cron Scheduler Dependencies
- Installed `node-cron` and `@types/node-cron`

### 2. ✅ Created Cron Scheduler Service
- Created `Backend/src/server/cronScheduler.ts`
- Implemented automatic flow scheduling
- Added retry logic for PocketBase connection failures

### 3. ✅ Updated Node Definitions
- Added schedule options: 5s, 10s, 20s, 30s, 1m, 2m, 10m, 20m, 30m
- Updated `Backend/src/features/automation/nodes/nodeDefinitions.ts`

### 4. ✅ Integrated Scheduler into Server
- Updated `Backend/src/server/index.ts`
- Added graceful shutdown handlers

### 5. ✅ Made Scheduler Resilient
- Added connection retry logic
- Graceful handling when PocketBase is not available
- Auto-retry every 5 minutes

---

## 🔧 REQUIRED ACTIONS (DO THESE NOW)

### Action 1: Start PocketBase
**Priority: CRITICAL** ⚠️

PocketBase must be running BEFORE the backend server starts.

**How to start:**
```bash
# Navigate to your PocketBase directory
cd path/to/pocketbase

# Start PocketBase
./pocketbase serve
```

**Expected output:**
```
Server started at http://127.0.0.1:8090
```

---

### Action 2: Configure Environment Variables
**Priority: HIGH** 🔴

Add these to your `.env` file in the **root directory**:

```bash
# PocketBase Admin Credentials (for cron scheduler)
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=yourpassword123
```

**Replace with your actual PocketBase admin credentials!**

To find your credentials:
1. Open PocketBase admin UI: http://127.0.0.1:8090/_/
2. Use the email/password you created when setting up PocketBase

---

### Action 3: Restart the Dev Server
**Priority: HIGH** 🔴

After PocketBase is running and environment variables are set:

```bash
# Stop the current server (Ctrl+C if running)
# Then restart:
npm run dev
```

**Expected logs:**
```
🕐 Initializing cron scheduler...
✅ Scheduler authenticated with PocketBase
📋 Found X active flows
⏰ Scheduled cron job for flow "Your Flow": */10 * * * * *
✅ Loaded X cron jobs
```

---

### Action 4: Activate Your Flow
**Priority: MEDIUM** 🟡

In the automation builder:

1. **Open your flow** in the automation builder
2. **Save the flow** (click Save button)
3. **Change status to "active"**
   - Look for a status dropdown or toggle
   - Change from "draft" to "active"
4. **Wait up to 5 minutes** OR restart the server for immediate effect

**Why?** Only flows with `status = "active"` are scheduled by the cron system.

---

### Action 5: Verify It's Working
**Priority: MEDIUM** 🟡

**Check 1: Server Logs**
Look for these messages in your terminal:
```
⏰ Scheduled cron job for flow "Simple Test Flow": */10 * * * * *
✅ Loaded 1 cron jobs
```

**Check 2: Execution Logs**
When the cron fires (e.g., every 10 seconds):
```
🚀 Executing flow <flow-id> from cron trigger <node-id>
✅ Created run <run-id> for flow <flow-id>
```

**Check 3: Run History**
1. Go to automation flow builder
2. Open your flow
3. Check "Run History" section
4. Look for runs with `trigger_type: "cron"`

---

## 🐛 TROUBLESHOOTING

### Issue: "ECONNREFUSED 127.0.0.1:8090"
**Solution:** PocketBase is not running. Start it first (see Action 1).

### Issue: "Failed to authenticate scheduler"
**Solution:** Check your environment variables (see Action 2).
- Verify `POCKETBASE_ADMIN_EMAIL` and `POCKETBASE_ADMIN_PASSWORD` are correct
- Make sure they match your PocketBase admin credentials

### Issue: No cron jobs scheduled
**Solution:** 
1. Make sure your flow status is "active" (not "draft")
2. Verify the flow has a cron trigger node
3. Check the cron trigger has a schedule configured
4. Restart the server or wait 5 minutes for auto-reload

### Issue: Cron not firing
**Solution:**
1. Check the schedule expression is valid
2. For testing, use short intervals like "10s" or "1m"
3. Look for execution logs in the terminal
4. Check PocketBase is still running

---

## 📋 STARTUP ORDER (IMPORTANT!)

**Correct order:**
1. ✅ Start PocketBase first
2. ✅ Then start the dev server (`npm run dev`)

**Why?** The backend server tries to connect to PocketBase on startup. If PocketBase isn't running, the scheduler will show warnings but will retry every 5 minutes.

---

## 📚 DOCUMENTATION

Full documentation available in:
- `Backend/CRON_SCHEDULER.md` - Complete guide
- This file - Quick action list

---

## ⏭️ NEXT STEPS

After completing all required actions:

1. **Test with a short interval** (e.g., "Every 10 seconds")
2. **Monitor the logs** to see cron executions
3. **Check run history** in the automation builder
4. **Adjust schedules** as needed for your use case

---

## 🎯 SUMMARY

**What you need to do RIGHT NOW:**

1. ✅ Start PocketBase (`./pocketbase serve`)
2. ✅ Add admin credentials to `.env`
3. ✅ Restart dev server (`npm run dev`)
4. ✅ Set your flow status to "active"
5. ✅ Wait and watch the logs!

**The cron scheduler will automatically:**
- Connect to PocketBase
- Find active flows with cron triggers
- Schedule them based on configuration
- Execute them on schedule
- Retry if PocketBase is temporarily unavailable
