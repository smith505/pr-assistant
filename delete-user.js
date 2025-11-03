// Delete a user from the production PostgreSQL database
const https = require('https');

const RAILWAY_URL = 'https://pr-assistant-production.up.railway.app';
const EMAIL = process.argv[2];

if (!EMAIL) {
  console.error('\n❌ Error: Please provide email address');
  console.log('\nUsage: node delete-user.js corysmth14@gmail.com\n');
  process.exit(1);
}

console.log(`\n🧹 Deleting user: ${EMAIL} from production database...\n`);

// Make HTTPS request to delete endpoint
const data = JSON.stringify({ email: EMAIL });

const options = {
  hostname: 'pr-assistant-production.up.railway.app',
  path: '/api/auth/delete-user',
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
        console.log('✅ SUCCESS! User deleted from database\n');
        console.log(`   Email: ${response.email}`);
        console.log('\n✨ You can now register this email again in the extension!\n');
      } else {
        console.error(`❌ Error: ${response.error || 'Failed to delete'}`);
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
