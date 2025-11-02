// Upgrade a user to Pro tier (useful for testing or manual upgrades)
require('dotenv').config();
const { getUserByEmail, updateUserTier, upsertSubscription } = require('./src/database');

const email = process.argv[2];
const tier = process.argv[3] || 'pro';

if (!email) {
  console.log('\n❌ Usage: node upgrade-to-pro.js <email> [tier]');
  console.log('   Example: node upgrade-to-pro.js user@example.com pro');
  console.log('   Tiers: free, pro, team\n');
  process.exit(1);
}

if (!['free', 'pro', 'team'].includes(tier)) {
  console.log('\n❌ Invalid tier. Must be: free, pro, or team\n');
  process.exit(1);
}

console.log(`\n🔄 Upgrading user to ${tier} tier...\n`);

const user = getUserByEmail(email);

if (!user) {
  console.log(`❌ User not found: ${email}\n`);
  process.exit(1);
}

console.log(`Found user: ${user.email} (ID: ${user.id})`);
console.log(`Current tier: ${user.tier}`);

// Update tier
updateUserTier(user.id, tier);

// If upgrading to paid tier, create a manual subscription record
if (tier === 'pro' || tier === 'team') {
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 year from now

  upsertSubscription(
    user.id,
    'manual',
    `manual_${user.id}_${Date.now()}`,
    'active',
    tier,
    periodEnd.toISOString()
  );

  console.log(`✅ Subscription created (manual, active until ${periodEnd.toLocaleDateString()})`);
}

console.log(`✅ User upgraded to ${tier} tier\n`);
