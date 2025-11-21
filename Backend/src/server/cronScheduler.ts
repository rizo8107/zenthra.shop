import cron, { ScheduledTask } from 'node-cron';
import PocketBase from 'pocketbase';
import { executeFlow as runFlow } from '../features/automation/flowExecutor.js';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(POCKETBASE_URL);

// Authenticate as admin for server-side operations
async function authenticateAdmin() {
  try {
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin123456';
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Scheduler authenticated with PocketBase');
    return true;
  } catch (error: any) {
    if (error?.cause?.code === 'ECONNREFUSED') {
      console.warn('⚠️  PocketBase not available yet. Scheduler will retry later.');
    } else {
      console.error('❌ Failed to authenticate scheduler:', error.message || error);
    }
    return false;
  }
}

// Map schedule shortcuts to cron expressions
function scheduleToCron(schedule: string): string {
  const scheduleMap: Record<string, string> = {
    '5s': '*/5 * * * * *',      // Every 5 seconds
    '10s': '*/10 * * * * *',    // Every 10 seconds
    '20s': '*/20 * * * * *',    // Every 20 seconds
    '30s': '*/30 * * * * *',    // Every 30 seconds
    '1m': '* * * * *',          // Every minute
    '2m': '*/2 * * * *',        // Every 2 minutes
    '5m': '*/5 * * * *',        // Every 5 minutes
    '10m': '*/10 * * * *',      // Every 10 minutes
    '15m': '*/15 * * * *',      // Every 15 minutes
    '20m': '*/20 * * * *',      // Every 20 minutes
    '30m': '*/30 * * * *',      // Every 30 minutes
    '1h': '0 * * * *',          // Every hour
    '6h': '0 */6 * * *',        // Every 6 hours
    '1d': '0 9 * * *',          // Every day at 9 AM
  };
  
  return scheduleMap[schedule] || schedule;
}

// Active cron jobs registry
const activeJobs = new Map<string, ScheduledTask>();

// Execute a flow
async function executeCronFlow(flowId: string, flowCanvas: any, nodeId: string, triggerData: any) {
  try {
    console.log(`🚀 Executing flow ${flowId} from cron trigger ${nodeId}`);
    
    // Create a run record
    const run = await pb.collection('runs').create({
      flow_id: flowId,
      status: 'queued',
      trigger_type: 'cron',
      test_mode: false,
      started_at: new Date().toISOString(),
      input_event: triggerData || { triggered_at: new Date().toISOString() },
    });

    console.log(`✅ Created run ${run.id} for flow ${flowId}`);
    
    // Execute the flow using the real executor
    await runFlow(run.id, flowId, flowCanvas, triggerData || { triggered_at: new Date().toISOString() });
    
  } catch (error) {
    console.error(`❌ Failed to execute flow ${flowId}:`, error);
  }
}

// Load and schedule all active flows with cron triggers
async function loadCronFlows() {
  try {
    // Clear existing jobs
    activeJobs.forEach((job) => job.stop());
    activeJobs.clear();

    // Check if authenticated
    if (!pb.authStore.isValid) {
      console.warn('⚠️  Skipping cron flow loading - not authenticated with PocketBase');
      return;
    }

    // Fetch all active flows
    const flows = await pb.collection('flows').getFullList({
      filter: 'status = "active"',
    });

    console.log(`📋 Found ${flows.length} active flows`);

    for (const flow of flows) {
      const canvasJson = flow.canvas_json;
      if (!canvasJson || !canvasJson.nodes) continue;

      // Find cron trigger nodes
      const cronTriggers = canvasJson.nodes.filter(
        (node: any) => node.data?.type === 'trigger.cron'
      );

      for (const triggerNode of cronTriggers) {
        const config = triggerNode.data?.config || {};
        const schedule = config.schedule || '15m';
        const customCron = config.cron;
        
        // Use custom cron expression if provided, otherwise use schedule shortcut
        const cronExpression = customCron || scheduleToCron(schedule);
        
        try {
          // Validate cron expression
          if (!cron.validate(cronExpression)) {
            console.error(`❌ Invalid cron expression for flow ${flow.id}: ${cronExpression}`);
            continue;
          }

          // Create and start the cron job
          const jobKey = `${flow.id}:${triggerNode.id}`;
          const job = cron.schedule(cronExpression, () => {
            executeCronFlow(flow.id, canvasJson, triggerNode.id, config.testData);
          });

          activeJobs.set(jobKey, job);
          console.log(`⏰ Scheduled cron job for flow "${flow.name}" (${flow.id}): ${cronExpression}`);
        } catch (error) {
          console.error(`❌ Failed to schedule cron for flow ${flow.id}:`, error);
        }
      }
    }

    console.log(`✅ Loaded ${activeJobs.size} cron jobs`);
  } catch (error: any) {
    if (error?.cause?.code === 'ECONNREFUSED') {
      console.warn('⚠️  PocketBase not available. Cron jobs will be loaded on next retry.');
    } else {
      console.error('❌ Failed to load cron flows:', error.message || error);
    }
  }
}

// Initialize the scheduler
export async function initScheduler() {
  console.log('🕐 Initializing cron scheduler...');
  
  // Try to authenticate, but don't fail if PocketBase isn't ready
  const authenticated = await authenticateAdmin();
  
  if (authenticated) {
    await loadCronFlows();
  } else {
    console.log('⏳ Scheduler will retry connecting to PocketBase...');
  }

  // Reload flows every 5 minutes to pick up changes
  // This also retries authentication if it failed initially
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 Reloading cron flows...');
    
    // Re-authenticate if needed
    if (!pb.authStore.isValid) {
      const authenticated = await authenticateAdmin();
      if (!authenticated) {
        console.warn('⚠️  Still cannot connect to PocketBase. Will retry in 5 minutes.');
        return;
      }
    }
    
    await loadCronFlows();
  });

  console.log('✅ Cron scheduler initialized');
}

// Stop all cron jobs
export function stopScheduler() {
  console.log('🛑 Stopping cron scheduler...');
  activeJobs.forEach((job) => job.stop());
  activeJobs.clear();
  console.log('✅ Cron scheduler stopped');
}
