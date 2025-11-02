// Quick backend test script
const API_URL = 'http://localhost:3001';

async function testBackend() {
  console.log('\n🧪 Testing GitHub PR Assistant Backend\n');

  try {
    // 1. Test health endpoint
    console.log('1️⃣  Testing health endpoint...');
    const healthRes = await fetch(`${API_URL}/health`);
    const health = await healthRes.json();
    console.log('   ✅ Health:', health.status);
    console.log('   OpenAI configured:', health.openaiConfigured);

    // 2. Register a test user
    console.log('\n2️⃣  Registering test user...');
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpass123'
      })
    });

    if (registerRes.status === 409) {
      console.log('   ⚠️  User already exists, trying login...');

      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpass123'
        })
      });
      const loginData = await loginRes.json();

      if (!loginData.success) {
        throw new Error('Login failed');
      }

      var apiToken = loginData.apiToken;
      console.log('   ✅ Logged in successfully');
    } else {
      const registerData = await registerRes.json();

      if (!registerData.success) {
        throw new Error('Registration failed: ' + registerData.message);
      }

      var apiToken = registerData.apiToken;
      console.log('   ✅ Registered successfully');
    }

    console.log('   API Token:', apiToken.substring(0, 20) + '...');

    // 3. Get user info
    console.log('\n3️⃣  Getting user info...');
    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    const meData = await meRes.json();
    console.log('   ✅ Email:', meData.user.email);
    console.log('   Tier:', meData.user.tier);
    console.log('   Monthly usage:', meData.stats.monthlyUsage);
    console.log('   Limit:', meData.stats.limit);

    // 4. Test PR analysis endpoint
    console.log('\n4️⃣  Testing PR analysis...');
    const analyzeRes = await fetch(`${API_URL}/api/pr/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        pr: {
          title: 'Add authentication system',
          description: 'This PR adds JWT-based authentication to the API',
          url: 'https://github.com/test/repo/pull/123',
          repo: 'test/repo',
          number: 123
        },
        files: [
          {
            filename: 'src/auth.js',
            additions: 50,
            deletions: 5,
            patch: `+function authenticateUser(email, password) {
+  const user = getUserByEmail(email);
+  if (!user) return null;
+  return bcrypt.compare(password, user.passwordHash);
+}`
          }
        ]
      })
    });

    if (!analyzeRes.ok) {
      const error = await analyzeRes.json();
      throw new Error(`Analysis failed: ${error.message}`);
    }

    const analyzeData = await analyzeRes.json();
    console.log('   ✅ Analysis completed!');
    console.log('   Model:', analyzeData.metadata.model);
    console.log('   Files analyzed:', analyzeData.metadata.filesAnalyzed);
    console.log('   Updated usage:', analyzeData.usage.monthly + '/' + analyzeData.usage.limit);
    console.log('\n   📝 Analysis preview:');
    console.log('   ' + analyzeData.analysis.substring(0, 200) + '...\n');

    console.log('✅ All tests passed!\n');
    console.log('🎉 Backend is working correctly!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testBackend();
