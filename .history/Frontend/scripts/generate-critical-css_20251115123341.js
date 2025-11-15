// Generate and inline critical CSS for the built app (home page)
// Run after `vite build` using: npm run build:critical

import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from 'critical';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');

async function run() {
  try {
    console.log('[critical] Generating critical CSS for dist/index.html...');

    await generate({
      base: distDir,
      src: 'index.html',
      target: {
        html: 'index.html',
      },
      inline: true,
      minify: true,
      width: 1280,
      height: 720,
    });

    console.log('[critical] Successfully inlined critical CSS into dist/index.html');
  } catch (error) {
    console.error('[critical] Failed to generate critical CSS:', error);
    process.exit(1);
  }
}

run();
