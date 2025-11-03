// Upgrade user to Pro tier on Production Railway backend
const https = require('https');

const RAILWAY_URL = 'https://pr-assistant-production.up.railway.app';
const EMAIL = process.argv[2];

if (!EMAIL) {
  console.error('\n❌ Error: Please provide email address');
  console.log('\nUsage: node upgrade-production-user.js corysmth14@gmail.com\n');
  process.exit(1);
}

console.log(`\n🔄 Upgrading ${EMAIL} to Pro tier on production...\n`);

// Make HTTPS request to upgrade endpoint
const data = JSON.stringify({ email: EMAIL });

const options = {
  hostname: 'pr-assistant-production.up.railway.app',
  path: '/api/auth/upgrade-to-pro',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(body);

      if (res.statusCode === 200) {
        console.log('✅ SUCCESS! User upgraded to Pro tier\n');
        console.log('📊 User Details:');
        console.log(`   Email: ${response.user.email}`);
        console.log(`   Tier: ${response.user.tier}`);
        console.log(`   Active Until: ${response.user.activeUntil}`);
        console.log(`   Monthly Usage: ${response.user.monthlyUsage}`);
        console.log('\n🎉 You now have unlimited PR analyses!\n');
      } else {
        console.error(`❌ Error: ${response.error || 'Failed to upgrade'}`);
        console.error(`   Message: ${response.message || 'Unknown error'}\n`);
      }
    } catch (e) {
      console.error('❌ Error parsing response:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n💡 Make sure your Railway backend is running and accessible\n');
});

req.write(data);
req.end();
