import express from 'express';
import {
  listAutomationFlows,
  createAutomationFlow,
  updateAutomationFlow,
  deleteAutomationFlow,
  type AutomationFlowInput,
} from './automationStore.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const items = await listAutomationFlows();
    res.json({ items });
  } catch (error: any) {
    console.error('Failed to list automations:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to list automations' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = (req.body || {}) as AutomationFlowInput;
    if (!body.name) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!body.graph) {
      return res.status(400).json({ error: 'graph is required' });
    }
    const created = await createAutomationFlow(body);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Failed to create automation:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to create automation' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const body = (req.body || {}) as AutomationFlowInput;
    const updated = await updateAutomationFlow(id, body);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update automation:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to update automation' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteAutomationFlow(id);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Failed to delete automation:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to delete automation' });
  }
});

export default router;
