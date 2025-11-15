#!/usr/bin/env node

// This script loads polyfills and then runs the target script
// Usage: node run-with-polyfills.js <target-script>

// Load all necessary polyfills first
import './node-polyfills.js';

// Get the target script from command line arguments
const targetScript = process.argv[2];

if (!targetScript) {
  console.error('Usage: node run-with-polyfills.js <target-script>');
  process.exit(1);
}

// Import and run the target script
try {
  await import(targetScript);
} catch (error) {
  console.error('Error running target script:', error);
  process.exit(1);
}
