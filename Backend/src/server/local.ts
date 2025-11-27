import app from './index.js';
import { createServer } from 'http';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { startRunFromCron } from '../features/automation/engine.js';

const DEFAULT_PORT = parseInt(process.env.SERVER_PORT || '3001', 10);
const ALTERNATIVE_PORTS = [3002, 3003, 3004, 4001, 4002, 4003];

const server = createServer(app);

const savePortInfo = (port: number) => {
  try {
    const portInfoPath = join(process.cwd(), 'port-info.json');
    writeFileSync(portInfoPath, JSON.stringify({ port }));
    console.log(`Port information saved to ${portInfoPath}`);
  } catch (err) {
    console.error('Failed to save port information:', err);
  }
};

// Start cron scheduler - runs every minute
let cronInterval: NodeJS.Timeout | null = null;

const startCronScheduler = () => {
  console.log('[cron] Starting automation cron scheduler (every minute)');
  
  // Run immediately on startup
  setTimeout(() => {
    startRunFromCron().catch(err => {
      console.error('[cron] Initial cron check failed:', err);
    });
  }, 5000); // Wait 5 seconds for server to fully start
  
  // Then run every minute
  cronInterval = setInterval(() => {
    startRunFromCron().catch(err => {
      console.error('[cron] Scheduled cron check failed:', err);
    });
  }, 60000); // Every 60 seconds
};

const startServer = (port: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use, trying another port...`);
        reject(err);
      } else {
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
  } catch (err) {
    let started = false;
    for (const port of ALTERNATIVE_PORTS) {
      try {
        await startServer(port);
        started = true;
        break;
      } catch (err) {
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
  if (cronInterval) {
    clearInterval(cronInterval);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[cron] Stopping cron scheduler...');
  if (cronInterval) {
    clearInterval(cronInterval);
  }
  process.exit(0);
});

tryPorts();
