# Cron Scheduler Implementation

## Summary
Implemented a background cron scheduler service that automatically executes automation flows based on their cron trigger configuration.

## What Was Added

### 1. **Dependencies**
- Installed `node-cron` and `@types/node-cron` packages for cron job scheduling

### 2. **New File: `cronScheduler.ts`**
Location: `Backend/src/server/cronScheduler.ts`

**Features:**
- Authenticates with PocketBase as admin to access flows
- Loads all active flows with cron triggers
- Converts schedule shortcuts (5s, 10s, 1m, 5m, etc.) to cron expressions
- Schedules cron jobs for each trigger
- Executes flows automatically based on schedule
- Reloads flows every 5 minutes to pick up changes
- Handles graceful shutdown

**Supported Schedule Shortcuts:**
- `5s` - Every 5 seconds
- `10s` - Every 10 seconds
- `20s` - Every 20 seconds
- `30s` - Every 30 seconds
- `1m` - Every minute
- `2m` - Every 2 minutes
- `5m` - Every 5 minutes
- `10m` - Every 10 minutes
- `15m` - Every 15 minutes
- `20m` - Every 20 minutes
- `30m` - Every 30 minutes
- `1h` - Every hour
- `6h` - Every 6 hours
- `1d` - Every day at 9 AM

### 3. **Updated: `nodeDefinitions.ts`**
Added more interval options to the cron trigger configuration dropdown.

### 4. **Updated: `server/index.ts`**
- Imported and initialized the cron scheduler
- Added graceful shutdown handlers (SIGTERM, SIGINT)

### 5. **Environment Variables**
Added to `.env.example`:
```
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=yourpassword123
```

## How It Works

1. **Server Startup**: When the backend server starts, it initializes the cron scheduler
2. **Flow Discovery**: The scheduler queries PocketBase for all flows with `status = "active"`
3. **Trigger Detection**: For each active flow, it finds nodes with `type = "trigger.cron"`
4. **Job Scheduling**: Creates a cron job for each trigger based on its schedule configuration
5. **Execution**: When the cron schedule fires, it creates a run record and executes the flow
6. **Auto-Reload**: Every 5 minutes, the scheduler reloads flows to pick up any changes

## Configuration Required

### 1. **Set Environment Variables**
Add to your `.env` file in the root directory:
```bash
POCKETBASE_ADMIN_EMAIL=your_admin_email@example.com
POCKETBASE_ADMIN_PASSWORD=your_admin_password
```

### 2. **Activate Your Flow**
In the automation builder:
1. Create a flow with a cron trigger
2. Configure the schedule (e.g., "Every 10 seconds")
3. **Save the flow**
4. **Change status to "active"** (this is critical!)

### 3. **Restart the Server**
The dev server should automatically restart when you save files. If not:
```bash
npm run dev
```

## Troubleshooting

### Cron Not Triggering?

**Check 1: Flow Status**
- Make sure your flow status is set to "active" (not "draft")
- Only active flows are scheduled

**Check 2: Server Logs**
Look for these messages in the terminal:
```
🕐 Initializing cron scheduler...
✅ Scheduler authenticated with PocketBase
📋 Found X active flows
⏰ Scheduled cron job for flow "Your Flow Name": */10 * * * * *
✅ Loaded X cron jobs
```

**Check 3: Environment Variables**
- Verify `POCKETBASE_ADMIN_EMAIL` and `POCKETBASE_ADMIN_PASSWORD` are set correctly
- These must match your PocketBase admin credentials

**Check 4: PocketBase Running**
- Ensure PocketBase is running on the configured URL (default: http://127.0.0.1:8090)

**Check 5: Trigger Configuration**
- Verify the cron trigger node has a valid schedule selected
- Check the "How often?" dropdown in the node configuration

### See Execution Logs
When a cron job fires, you'll see:
```
🚀 Executing flow <flow-id> from cron trigger <node-id>
✅ Created run <run-id> for flow <flow-id>
✅ Completed run <run-id>
```

### Check Run History
- Go to the automation flow builder
- Click on your flow
- Look at the "Run History" section
- You should see runs with `trigger_type: "cron"`

## Next Steps

The current implementation creates run records but uses a mock execution. To fully execute flows:

1. Implement the actual flow execution engine in `cronScheduler.ts`
2. Process nodes in the correct order based on edges
3. Handle node-specific logic (PocketBase queries, WhatsApp messages, etc.)
4. Update run steps with real input/output data

## Notes

- The scheduler reloads flows every 5 minutes automatically
- Changes to flow configuration require either:
  - Waiting up to 5 minutes for auto-reload, OR
  - Restarting the server for immediate effect
- Cron jobs are in-memory - they don't persist across server restarts
- For production, consider using a dedicated job queue system (Bull, BullMQ, etc.)
