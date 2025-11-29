import app from './index.js';
import { createServer } from 'http';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { startRunFromCron } from '../features/automation/engine.js';
const DEFAULT_PORT = parseInt(process.env.SERVER_PORT || '3001', 10);
const ALTERNATIVE_PORTS = [3002, 3003, 3004, 4001, 4002, 4003];
const server = createServer(app);
const savePortInfo = (port) => {
    try {
        const portInfoPath = join(process.cwd(), 'port-info.json');
        writeFileSync(portInfoPath, JSON.stringify({ port }));
        console.log(`Port information saved to ${portInfoPath}`);
    }
    catch (err) {
        console.error('Failed to save port information:', err);
    }
};
// Start cron scheduler - runs every minute, aligned to clock
let cronInterval = null;
let cronRunning = false; // Prevent concurrent runs
const startCronScheduler = () => {
    console.log('[cron] Starting automation cron scheduler');
    const runCronCheck = async () => {
        // Prevent concurrent runs
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
    // Calculate delay to next minute boundary (aligned to clock)
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    console.log(`[cron] First check in ${Math.round(msUntilNextMinute / 1000)}s (at next minute)`);
    // Start at next minute boundary, then every 60 seconds
    setTimeout(() => {
        runCronCheck(); // First run at minute boundary
        cronInterval = setInterval(runCronCheck, 60000); // Then every 60 seconds
    }, msUntilNextMinute);
};
const startServer = (port) => {
    return new Promise((resolve, reject) => {
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is already in use, trying another port...`);
                reject(err);
            }
            else {
                reject(err);
            }
        });
        server.once('listening', () => {
            console.log(`[API] Server running on port ${port}`);
            savePortInfo(port);
            // Start cron scheduler after server is running
            startCronScheduler();
            resolve(port);
        });
        server.listen(port);
    });
};
const tryPorts = async () => {
    try {
        await startServer(DEFAULT_PORT);
    }
    catch (err) {
        let started = false;
        for (const port of ALTERNATIVE_PORTS) {
            try {
                await startServer(port);
                started = true;
                break;
            }
            catch (err) {
                console.log(`Port ${port} also failed, trying next...`);
            }
        }
        if (!started) {
            console.error('Failed to start server on any port');
            process.exit(1);
        }
    }
};
// Cleanup on shutdown
process.on('SIGINT', () => {
    console.log('[cron] Stopping cron scheduler...');
    if (cronInterval)
        clearInterval(cronInterval);
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('[cron] Stopping cron scheduler...');
    if (cronInterval)
        clearInterval(cronInterval);
    process.exit(0);
});
tryPorts();
