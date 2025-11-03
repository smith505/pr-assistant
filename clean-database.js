// Clean up broken user records from PostgreSQL
const https = require('https');

const RAILWAY_URL = 'https://pr-assistant-production.up.railway.app';
const EMAIL = process.argv[2] || 'corysmth14@gmail.com';

console.log(`\n🧹 Cleaning up user: ${EMAIL}...\n`);

// Create a simple admin endpoint call to delete the user
// We'll use a direct PostgreSQL query via a new endpoint

const deleteUserScript = `
// Add this to your backend temporarily if needed, or run SQL directly in Railway
DELETE FROM usage WHERE user_id IN (SELECT id FROM users WHERE email = '${EMAIL}');
DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM users WHERE email = '${EMAIL}');
DELETE FROM users WHERE email = '${EMAIL}';
`;

console.log('⚠️  Since we don\'t have an admin delete endpoint, you need to:');
console.log('\n1. Go to Railway Dashboard');
console.log('2. Click on your PostgreSQL service');
console.log('3. Click "Data" tab');
console.log('4. Click "Query" or find the SQL console');
console.log('5. Run this SQL:\n');
console.log('━'.repeat(60));
console.log(deleteUserScript);
console.log('━'.repeat(60));
console.log('\n6. After running the SQL, try registering again in the extension\n');
