import express from 'express';
import { generatePuckContent } from '../lib/gemini.js';
import { pb } from '../lib/pocketbase.js';
const router = express.Router();
router.post('/ai/puck-content', async (req, res) => {
    try {
        const body = (req.body || {});
        if (!body.description || typeof body.description !== 'string') {
            return res.status(400).json({ error: 'description is required' });
        }
        let product;
        if (body.productId && typeof body.productId === 'string') {
            try {
                const record = await pb.collection('products').getOne(body.productId);
                product = {
                    id: record.id,
                    name: record.name,
                    category: record.category,
                    price: record.price,
                    tags: record.tags,
                    description: record.description,
                };
            }
            catch (err) {
                console.warn('[AI] Failed to load product context for', body.productId, err);
            }
        }
        const result = await generatePuckContent({
            mode: body.mode === 'page' ? 'page' : 'section',
            description: body.description,
            tone: body.tone,
            product,
        });
        return res.json({ ok: true, data: result });
    }
    catch (err) {
        const e = err;
        console.error('[AI] Puck content generation error', e);
        return res
            .status(500)
            .json({ error: e.message || 'Failed to generate Puck content' });
    }
});
export default router;
