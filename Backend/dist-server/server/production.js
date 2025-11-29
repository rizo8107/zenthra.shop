import app from './index.js';
import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { startRunFromCron } from '../features/automation/engine.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = parseInt(process.env.PORT || '8080', 10);
// Serve static files from the dist folder (Vite build output)
const distPath = join(__dirname, '../../dist');
if (existsSync(distPath)) {
    console.log(`[Static] Serving static files from ${distPath}`);
    // Serve static assets
    app.use(express.static(distPath, {
        maxAge: '1d',
        etag: true,
    }));
    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api') ||
            req.path.startsWith('/evolution') ||
            req.path.startsWith('/health') ||
            req.path.startsWith('/notifications')) {
            return next();
        }
        res.sendFile(join(distPath, 'index.html'));
    });
}
else {
    console.warn(`[Static] dist folder not found at ${distPath}. Only API routes will work.`);
}
const server = createServer(app);
// Start cron scheduler
let cronInterval = null;
let cronRunning = false;
const startCronScheduler = () => {
    console.log('[cron] Starting automation cron scheduler');
    const runCronCheck = async () => {
        if (cronRunning) {
            console.log('[cron] Skipping - previous check still running');
            return;
        }
        cronRunning = true;
        try {
            await startRunFromCron();
        }
        catch (err) {
            console.error('[cron] Check failed:', err);
        }
        finally {
            cronRunning = false;
        }
    };
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    console.log(`[cron] First check in ${Math.round(msUntilNextMinute / 1000)}s (at next minute)`);
    setTimeout(() => {
        runCronCheck();
        cronInterval = setInterval(runCronCheck, 60000);
    }, msUntilNextMinute);
};
// Start server
server.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
    console.log(`[Server] API routes: /api/*, /evolution/*, /health`);
    console.log(`[Server] Static files: /*`);
    startCronScheduler();
});
// Cleanup on shutdown
process.on('SIGINT', () => {
    console.log('[Server] Shutting down...');
    if (cronInterval)
        clearInterval(cronInterval);
    server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
    console.log('[Server] Shutting down...');
    if (cronInterval)
        clearInterval(cronInterval);
    server.close(() => process.exit(0));
});
