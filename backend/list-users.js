// List all users in the database
require('dotenv').config();
const { db } = require('./src/database');

console.log('\n📋 GitHub PR Assistant - User List\n');

const users = db.prepare(`
  SELECT
    u.id,
    u.email,
    u.tier,
    u.created_at,
    COUNT(us.id) as total_analyses,
    s.status as subscription_status,
    s.plan as subscription_plan
  FROM users u
  LEFT JOIN usage us ON u.id = us.user_id
  LEFT JOIN subscriptions s ON u.id = s.user_id
  GROUP BY u.id
  ORDER BY u.created_at DESC
`).all();

if (users.length === 0) {
  console.log('No users found in database.\n');
  process.exit(0);
}

console.log(`Total Users: ${users.length}\n`);
console.log('─'.repeat(100));

users.forEach((user, index) => {
  console.log(`\n${index + 1}. ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Tier: ${user.tier}`);
  console.log(`   Total Analyses: ${user.total_analyses}`);
  console.log(`   Subscription: ${user.subscription_status || 'None'} ${user.subscription_plan ? `(${user.subscription_plan})` : ''}`);
  console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
});

console.log('\n' + '─'.repeat(100) + '\n');

// Tier summary
const tierCounts = users.reduce((acc, user) => {
  acc[user.tier] = (acc[user.tier] || 0) + 1;
  return acc;
}, {});

console.log('📊 Tier Distribution:');
Object.entries(tierCounts).forEach(([tier, count]) => {
  console.log(`   ${tier}: ${count} users`);
});

console.log('\n');
