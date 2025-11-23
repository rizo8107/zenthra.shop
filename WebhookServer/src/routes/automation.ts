import express, { Request, Response } from 'express';
import PocketBase from 'pocketbase';

const router = express.Router();

// Initialize PocketBase
const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

/**
 * Trigger an automation flow
 * POST /api/automation/trigger
 */
router.post('/trigger', async (req: Request, res: Response): Promise<void> => {
  try {
    const { flow_id, data } = req.body;
    
    if (!flow_id) {
      res.status(400).json({ error: 'flow_id is required' });
      return;
    }
    
    console.log('Triggering automation flow:', flow_id);
    
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    // Store automation trigger in PocketBase
    const record = await pb.collection('automation_triggers').create({
      flow_id,
      data,
      status: 'pending',
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      trigger_id: record.id,
      flow_id
    });
    return;
  } catch (error) {
    console.error('Error triggering automation:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to trigger automation'
    });
    return;
  }
});

/**
 * Get automation flow status
 * GET /api/automation/status/:trigger_id
 */
router.get('/status/:trigger_id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { trigger_id } = req.params;
    
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    const record = await pb.collection('automation_triggers').getOne(trigger_id);
    
    res.json({
      success: true,
      status: record.status,
      data: record
    });
    return;
  } catch (error) {
    console.error('Error fetching automation status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch status'
    });
    return;
  }
});

/**
 * List all automation flows
 * GET /api/automation/flows
 */
router.get('/flows', async (req: Request, res: Response): Promise<void> => {
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    const flows = await pb.collection('automation_flows').getFullList({
      sort: '-created'
    });
    
    res.json({
      success: true,
      flows
    });
    return;
  } catch (error) {
    console.error('Error fetching flows:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch flows'
    });
    return;
  }
});

export default router;
