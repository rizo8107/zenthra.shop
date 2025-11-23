import express, { Request, Response } from 'express';
import PocketBase from 'pocketbase';

const router = express.Router();

// Initialize PocketBase
const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

/**
 * Health check for PocketBase connection
 * GET /api/pocketbase/health
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    await pb.health.check();
    res.json({
      ok: true,
      pocketbase_url: process.env.POCKETBASE_URL,
      timestamp: new Date().toISOString()
    });
    return;
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'PocketBase connection failed'
    });
    return;
  }
});

/**
 * Query any PocketBase collection
 * POST /api/pocketbase/query
 */
router.post('/query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection, filter, sort, limit } = req.body;
    
    if (!collection) {
      res.status(400).json({ error: 'collection is required' });
      return;
    }
    
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    const records = await pb.collection(collection).getFullList({
      filter: filter || '',
      sort: sort || '-created',
      ...(limit && { limit: Number(limit) })
    });
    
    res.json({
      success: true,
      collection,
      count: records.length,
      records
    });
    return;
  } catch (error) {
    console.error('Error querying PocketBase:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Query failed'
    });
    return;
  }
});

export default router;
