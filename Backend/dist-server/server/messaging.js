import express from 'express';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
dotenv.config();
const router = express.Router();
const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://backend-karigaibackend.7za6uc.easypanel.host';
const pb = new PocketBase(POCKETBASE_URL);
function isWhatsappConfig(config) {
    return config.provider !== undefined ||
        config.phoneNumberId !== undefined;
}
function isEvolutionConfig(config) {
    return config.authType !== undefined ||
        config.defaultSender !== undefined;
}
async function getPluginConfig(key) {
    try {
        const item = await pb.collection('plugins').getFirstListItem(`key = "${key}"`);
        const configRaw = item?.config;
        const parsed = typeof configRaw === 'string' ? JSON.parse(configRaw) : (configRaw || {});
        return { enabled: Boolean(item?.enabled), ...parsed };
    }
    catch {
        return null;
    }
}
router.post('/whatsapp/send', async (req, res) => {
    try {
        const cfg = await getPluginConfig('whatsapp_api');
        if (!cfg || cfg.enabled !== true)
            return res.status(400).json({ error: 'WhatsApp API is not configured or disabled' });
        const { to, template, variables, message } = (req.body || {});
        if (cfg.provider === 'meta') {
            if (!cfg.phoneNumberId || !cfg.accessToken)
                return res.status(400).json({ error: 'Missing Meta WhatsApp credentials' });
            const url = `https://graph.facebook.com/v17.0/${cfg.phoneNumberId}/messages`;
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cfg.accessToken}`,
            };
            const body = template?.name ? {
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: template.name,
                    language: { code: template.lang || cfg.defaultTemplate?.lang || 'en_US' },
                    components: variables ? [
                        { type: 'body', parameters: Object.values(variables).map((v) => ({ type: 'text', text: String(v ?? '') })) }
                    ] : undefined,
                },
            } : {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: String(message || '') },
            };
            const r = await globalThis.fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
            const data = await r.json();
            if (!r.ok)
                return res.status(r.status).json({ error: data?.error || 'Send failed', details: data });
            return res.json({ ok: true, data });
        }
        // Custom provider
        if (!cfg.baseUrl)
            return res.status(400).json({ error: 'Missing custom WhatsApp baseUrl' });
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.accessToken)
            headers['Authorization'] = `Bearer ${cfg.accessToken}`;
        const r = await fetch(String(cfg.baseUrl).replace(/\/$/, '') + '/messages', {
            method: 'POST',
            headers,
            body: JSON.stringify({ to, template, variables, message }),
        });
        const data = await r.json();
        if (!r.ok)
            return res.status(r.status).json({ error: data?.error || 'Send failed', details: data });
        return res.json({ ok: true, data });
    }
    catch (err) {
        const e = err;
        return res.status(500).json({ error: e.message || 'Request failed' });
    }
});
router.post('/evolution/send', async (req, res) => {
    try {
        const cfg = await getPluginConfig('evolution_api');
        if (!cfg || cfg.enabled !== true)
            return res.status(400).json({ error: 'Evolution API is not configured or disabled' });
        const { to, message, template, variables, sender } = (req.body || {});
        if (!cfg.baseUrl)
            return res.status(400).json({ error: 'Missing Evolution baseUrl' });
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.authType === 'header') {
            headers[String(cfg.authHeader || 'Authorization')] = String(cfg.tokenOrKey || '');
        }
        else if (cfg.tokenOrKey) {
            headers['Authorization'] = `Bearer ${cfg.tokenOrKey}`;
        }
        const body = {
            to,
            sender: sender || cfg.defaultSender,
            message,
            template,
            variables,
        };
        const url = String(cfg.baseUrl).replace(/\/$/, '') + '/messages/send';
        const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        const data = await r.json();
        if (!r.ok)
            return res.status(r.status).json({ error: data?.error || 'Send failed', details: data });
        return res.json({ ok: true, data });
    }
    catch (err) {
        const e = err;
        return res.status(500).json({ error: e.message || 'Request failed' });
    }
});
export default router;
