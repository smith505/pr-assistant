#!/bin/bash

# Production Cleanup Script
# Removes debug logs, secures API keys, and prepares for production launch

set -e  # Exit on error

echo "🧹 Starting Production Cleanup..."
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Create backup
BACKUP_DIR="backups/pre-cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 Creating backup in $BACKUP_DIR..."
cp -r src "$BACKUP_DIR/"
echo "✅ Backup created"
echo ""

# ============================================================================
# SECURITY: Replace hardcoded API keys
# ============================================================================

echo "🔒 SECURITY: Replacing hardcoded API keys..."

# Replace GitHub OAuth credentials
sed -i "s/clientId: 'Ov23liyql47d7rldq1oR'/clientId: 'YOUR_GITHUB_CLIENT_ID'/g" src/config.js src/scripts/background.js
sed -i "s/clientSecret: '0ef7a22d2cd1497f17056d21b0dde1220acbba2a'/clientSecret: 'YOUR_GITHUB_CLIENT_SECRET'/g" src/config.js src/scripts/background.js

# Replace OpenAI API key (handle long key carefully)
sed -i "s/apiKey: 'sk-proj-[^']*'/apiKey: 'YOUR_OPENAI_API_KEY'/g" src/config.js src/scripts/background.js

# Replace Stripe placeholders
sed -i "s/publishableKey: 'pk_test_YOUR_KEY_HERE'/publishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY'/g" src/scripts/subscription.js
sed -i "s|customerPortalUrl: 'https://billing.stripe.com/p/login/YOUR_PORTAL'|customerPortalUrl: 'YOUR_STRIPE_CUSTOMER_PORTAL_URL'|g" src/scripts/subscription.js
sed -i "s|createCheckoutSessionUrl: 'https://your-backend.com/create-checkout-session'|createCheckoutSessionUrl: 'YOUR_BACKEND_API_URL/create-checkout-session'|g" src/scripts/subscription.js

echo "✅ API keys replaced with placeholders"
echo ""

# ============================================================================
# CODE QUALITY: Remove console.log statements
# ============================================================================

echo "🧹 CODE QUALITY: Removing debug console.log statements..."

# Function to remove console.log from a file (keep console.error)
remove_console_logs() {
  local file=$1
  # Remove console.log but NOT console.error
  # This preserves error logging while removing debug logs
  sed -i "/console\.log/d" "$file"
  sed -i "/console\.warn/d" "$file"
  echo "  ✅ Cleaned: $file"
}

# Process JavaScript files
remove_console_logs "src/scripts/background.js"
remove_console_logs "src/scripts/content.js"
remove_console_logs "src/scripts/subscription.js"
remove_console_logs "src/popup/popup.js"
remove_console_logs "src/pages/pricing.js"

echo "✅ Console logs removed"
echo ""

# ============================================================================
# POLISH: Replace placeholder content
# ============================================================================

echo "✨ POLISH: Replacing placeholder content..."

# Replace placeholder email addresses
sed -i "s/support@example\.com/support@github-pr-assistant.com/g" src/options/options.html
sed -i "s/sales@pr-assistant\.com/sales@github-pr-assistant.com/g" src/pages/pricing.js

echo "✅ Placeholders updated"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "=========================================="
echo "✅ PRODUCTION CLEANUP COMPLETE"
echo "=========================================="
echo ""
echo "📊 Changes Made:"
echo "  • API keys replaced with secure placeholders"
echo "  • Console.log statements removed (console.error kept)"
echo "  • Placeholder emails updated"
echo "  • Code ready for production deployment"
echo ""
echo "⚠️  CRITICAL NEXT STEPS:"
echo "  1. REVOKE exposed GitHub OAuth credentials immediately"
echo "  2. REVOKE exposed OpenAI API key immediately"
echo "  3. Generate NEW credentials for production"
echo "  4. Update config.js with new credentials (DO NOT COMMIT)"
echo "  5. Set isDevelopment: false in config.js"
echo "  6. Test extension functionality thoroughly"
echo ""
echo "📖 See PRODUCTION_CLEANUP_REPORT.md for full details"
echo ""
echo "💾 Backup saved to: $BACKUP_DIR"
echo ""
