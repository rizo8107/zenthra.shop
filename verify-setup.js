#!/usr/bin/env node

/**
 * Setup Verification Script
 * This script checks if the unified e-commerce project is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying E-commerce Project Setup...\n');

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper to check if file exists
function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    checks.passed.push(`✅ ${description}`);
    return true;
  } else {
    checks.failed.push(`❌ ${description} - File not found: ${filePath}`);
    return false;
  }
}

// Helper to read .env file
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

console.log('📦 Checking Dependencies...');

// Check root package.json
checkFile(path.join(__dirname, 'package.json'), 'Root package.json exists');

// Check if node_modules exists
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
  checks.passed.push('✅ Root dependencies installed');
} else {
  checks.warnings.push('⚠️  Root dependencies not installed - Run: npm install');
}

// Check Frontend
if (fs.existsSync(path.join(__dirname, 'Frontend', 'node_modules'))) {
  checks.passed.push('✅ Frontend dependencies installed');
} else {
  checks.warnings.push('⚠️  Frontend dependencies not installed - Run: npm run install:all');
}

// Check Backend
if (fs.existsSync(path.join(__dirname, 'Backend', 'node_modules'))) {
  checks.passed.push('✅ Backend dependencies installed');
} else {
  checks.warnings.push('⚠️  Backend dependencies not installed - Run: npm run install:all');
}

console.log('\n🔧 Checking Environment Configuration...');

// Check ROOT .env (shared by both projects)
const rootEnvPath = path.join(__dirname, '.env');
const rootEnv = readEnvFile(rootEnvPath);

if (rootEnv) {
  checks.passed.push('✅ Root .env file exists (shared by Frontend & CMS)');
  
  if (rootEnv.VITE_POCKETBASE_URL) {
    checks.passed.push('✅ PocketBase URL configured');
    console.log(`   URL: ${rootEnv.VITE_POCKETBASE_URL}`);
  } else {
    checks.failed.push('❌ Missing VITE_POCKETBASE_URL in root .env');
  }
  
  if (rootEnv.VITE_POCKETBASE_ADMIN_EMAIL) {
    checks.passed.push('✅ PocketBase admin email configured');
  } else {
    checks.warnings.push('⚠️  Missing VITE_POCKETBASE_ADMIN_EMAIL in root .env');
  }
  
  if (rootEnv.VITE_POCKETBASE_ADMIN_PASSWORD) {
    checks.passed.push('✅ PocketBase admin password configured');
  } else {
    checks.warnings.push('⚠️  Missing VITE_POCKETBASE_ADMIN_PASSWORD in root .env');
  }
  
  // Check for Frontend-specific config
  if (rootEnv.VITE_RAZORPAY_KEY_ID) {
    checks.passed.push('✅ Razorpay configuration found');
  } else {
    checks.warnings.push('⚠️  Missing VITE_RAZORPAY_KEY_ID (required for payments)');
  }
  
  // Check for Backend CMS-specific config
  if (rootEnv.EMAIL_HOST) {
    checks.passed.push('✅ Email configuration found');
  } else {
    checks.warnings.push('⚠️  Missing EMAIL_HOST (optional for email notifications)');
  }
} else {
  checks.failed.push('❌ Root .env file not found');
  checks.warnings.push('⚠️  Create .env file in root directory (copy from .env.example)');
}

// Warn about old individual .env files
const frontendEnvPath = path.join(__dirname, 'Frontend', '.env');
const cmsEnvPath = path.join(__dirname, 'Backend', '.env');

if (fs.existsSync(frontendEnvPath)) {
  checks.warnings.push('⚠️  Frontend/.env file found - please remove it, use root .env instead');
}

if (fs.existsSync(cmsEnvPath)) {
  checks.warnings.push('⚠️  Backend/.env file found - please remove it, use root .env instead');
}

console.log('\n📁 Checking Project Structure...');

// Check key directories
checkFile(path.join(__dirname, 'Frontend', 'src'), 'Frontend source directory exists');
checkFile(path.join(__dirname, 'Backend', 'src'), 'Backend source directory exists');
checkFile(path.join(__dirname, 'Frontend', 'package.json'), 'Frontend package.json exists');
checkFile(path.join(__dirname, 'Backend', 'package.json'), 'Backend package.json exists');

// Check for PocketBase directory
if (fs.existsSync(path.join(__dirname, 'PocketBase'))) {
  checks.passed.push('✅ PocketBase directory exists');
  
  // Check for PocketBase executable
  const pbExe = process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase';
  if (fs.existsSync(path.join(__dirname, 'PocketBase', pbExe))) {
    checks.passed.push('✅ PocketBase executable found');
  } else {
    checks.warnings.push(`⚠️  PocketBase executable not found (${pbExe})`);
    checks.warnings.push('   Download from: https://pocketbase.io/docs/');
  }
} else {
  checks.warnings.push('⚠️  PocketBase directory not found');
  checks.warnings.push('   Create a PocketBase folder and download PocketBase from: https://pocketbase.io/docs/');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(60) + '\n');

if (checks.passed.length > 0) {
  console.log('✅ Passed Checks:');
  checks.passed.forEach(check => console.log('   ' + check));
  console.log('');
}

if (checks.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  checks.warnings.forEach(check => console.log('   ' + check));
  console.log('');
}

if (checks.failed.length > 0) {
  console.log('❌ Failed Checks:');
  checks.failed.forEach(check => console.log('   ' + check));
  console.log('');
}

console.log('='.repeat(60));

// Final verdict
if (checks.failed.length === 0 && checks.warnings.length === 0) {
  console.log('\n🎉 All checks passed! Your project is ready to run.');
  console.log('   Start with: npm run dev');
} else if (checks.failed.length === 0) {
  console.log('\n⚠️  Setup is mostly complete, but there are some warnings.');
  console.log('   You can proceed, but review the warnings above.');
  console.log('   Start with: npm run dev');
} else {
  console.log('\n❌ Setup is incomplete. Please address the failed checks above.');
  console.log('   See SETUP.md for detailed instructions.');
}

console.log('\n📚 Documentation:');
console.log('   - Complete setup guide: SETUP.md');
console.log('   - Project overview: README.md');
console.log('   - Frontend docs: Frontend/README.md');
console.log('   - Backend docs: Backend/README.md');
console.log('');
