// Generate and inline critical CSS for the built app (home page)
// Run after `vite build` using: npm run build:critical

import path from 'path';
import { fileURLToPath } from 'url';

// Add Node.js polyfills for missing Web APIs
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(fileBits, fileName, options = {}) {
      this.name = fileName;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this.size = 0;
    }
  };
}

if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }
    append(name, value) {
      this._data.set(name, value);
    }
    get(name) {
      return this._data.get(name);
    }
  };
}

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
    console.warn('[critical] Failed to generate critical CSS (this is optional):', error.message);
    console.log('[critical] Continuing without critical CSS optimization...');
    // Don't exit with error code - make this step optional
    process.exit(0);
  }
}

run();
