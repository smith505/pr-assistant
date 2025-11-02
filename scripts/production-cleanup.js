#!/usr/bin/env node

/**
 * Production Cleanup Script
 * Automates the cleanup of debug logs and security improvements
 *
 * Usage: node scripts/production-cleanup.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const CHANGES = {
  modified: [],
  errors: []
};

console.log('🧹 Starting production cleanup...\n');
if (DRY_RUN) {
  console.log('📋 DRY RUN MODE - No files will be modified\n');
}

// ============================================================================
// CLEANUP RULES
// ============================================================================

const CLEANUP_RULES = {
  // Remove console.log (keep console.error for production error tracking)
  removeLogs: {
    pattern: /console\.log\([^)]*\);?\n?/g,
    replacement: '',
    description: 'Remove console.log statements'
  },

  // Remove console.warn (unless critical)
  removeWarnings: {
    pattern: /console\.warn\([^)]*\);?\n?/g,
    replacement: '',
    description: 'Remove console.warn statements'
  },

  // Replace hardcoded API keys in config.js
  replaceGitHubClientId: {
    pattern: /clientId: 'Ov23liyql47d7rldq1oR'/g,
    replacement: "clientId: 'YOUR_GITHUB_CLIENT_ID'",
    description: 'Replace GitHub Client ID with placeholder',
    files: ['src/config.js', 'src/scripts/background.js']
  },

  replaceGitHubClientSecret: {
    pattern: /clientSecret: '0ef7a22d2cd1497f17056d21b0dde1220acbba2a'/g,
    replacement: "clientSecret: 'YOUR_GITHUB_CLIENT_SECRET'",
    description: 'Replace GitHub Client Secret with placeholder',
    files: ['src/config.js', 'src/scripts/background.js']
  },

  replaceOpenAIKey: {
    pattern: /apiKey: 'sk-proj-[^']+'/g,
    replacement: "apiKey: 'YOUR_OPENAI_API_KEY'",
    description: 'Replace OpenAI API key with placeholder',
    files: ['src/config.js', 'src/scripts/background.js']
  },

  // Replace placeholder emails
  replaceSupportEmail: {
    pattern: /support@example\.com/g,
    replacement: 'support@github-pr-assistant.com',
    description: 'Replace placeholder support email',
    files: ['src/options/options.html']
  },

  // Replace Stripe placeholders
  replaceStripeKey: {
    pattern: /publishableKey: 'pk_test_YOUR_KEY_HERE'/g,
    replacement: "publishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY'",
    description: 'Replace Stripe key placeholder',
    files: ['src/scripts/subscription.js']
  },

  replaceStripePortal: {
    pattern: /customerPortalUrl: 'https:\/\/billing\.stripe\.com\/p\/login\/YOUR_PORTAL'/g,
    replacement: "customerPortalUrl: 'YOUR_STRIPE_CUSTOMER_PORTAL_URL'",
    description: 'Replace Stripe portal URL',
    files: ['src/scripts/subscription.js']
  },

  replaceBackendUrl: {
    pattern: /createCheckoutSessionUrl: 'https:\/\/your-backend\.com\/create-checkout-session'/g,
    replacement: "createCheckoutSessionUrl: 'YOUR_BACKEND_API_URL/create-checkout-session'",
    description: 'Replace backend API URL',
    files: ['src/scripts/subscription.js']
  }
};

// ============================================================================
// FILE PROCESSING
// ============================================================================

const FILES_TO_PROCESS = [
  'src/scripts/background.js',
  'src/scripts/content.js',
  'src/scripts/subscription.js',
  'src/config.js',
  'src/popup/popup.js',
  'src/pages/pricing.js',
  'src/options/options.html'
];

function processFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    CHANGES.errors.push(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let changesCount = 0;

  // Apply general rules (logs, warnings)
  for (const [ruleName, rule] of Object.entries(CLEANUP_RULES)) {
    // Skip file-specific rules if this file isn't in the list
    if (rule.files && !rule.files.includes(filePath)) {
      continue;
    }

    // Count matches before replacement
    const matches = content.match(rule.pattern);
    if (matches && matches.length > 0) {
      content = content.replace(rule.pattern, rule.replacement);
      changesCount += matches.length;
      console.log(`  ✅ ${rule.description}: ${matches.length} replacements in ${filePath}`);
    }
  }

  // Save if content changed
  if (content !== originalContent) {
    if (!DRY_RUN) {
      fs.writeFileSync(fullPath, content, 'utf8');
    }
    CHANGES.modified.push({
      file: filePath,
      changes: changesCount
    });
    console.log(`  📝 Modified: ${filePath} (${changesCount} changes)\n`);
  } else {
    console.log(`  ⏭️  No changes needed: ${filePath}\n`);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('Processing files...\n');

FILES_TO_PROCESS.forEach(processFile);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 CLEANUP SUMMARY');
console.log('='.repeat(60) + '\n');

console.log(`Files processed: ${FILES_TO_PROCESS.length}`);
console.log(`Files modified: ${CHANGES.modified.length}`);
console.log(`Errors: ${CHANGES.errors.length}\n`);

if (CHANGES.modified.length > 0) {
  console.log('Modified files:');
  CHANGES.modified.forEach(item => {
    console.log(`  • ${item.file} (${item.changes} changes)`);
  });
  console.log();
}

if (CHANGES.errors.length > 0) {
  console.log('❌ Errors:');
  CHANGES.errors.forEach(error => {
    console.log(`  • ${error}`);
  });
  console.log();
}

if (DRY_RUN) {
  console.log('📋 DRY RUN COMPLETE - No files were modified');
  console.log('   Run without --dry-run to apply changes\n');
} else {
  console.log('✅ CLEANUP COMPLETE\n');
  console.log('⚠️  NEXT STEPS:');
  console.log('   1. Review the changes in git diff');
  console.log('   2. Test the extension functionality');
  console.log('   3. Update config.js with REAL credentials (DO NOT COMMIT)');
  console.log('   4. Set isDevelopment: false in config.js\n');
}

console.log('📖 See PRODUCTION_CLEANUP_REPORT.md for full details\n');
