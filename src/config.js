// GitHub PR Review Assistant - Configuration
// OAuth and API configuration

// GitHub OAuth Configuration
// To get these credentials:
// 1. Go to https://github.com/settings/developers
// 2. Click "New OAuth App"
// 3. Fill in:
//    - Application name: GitHub PR Review Assistant
//    - Homepage URL: https://github-pr-assistant.com (or your landing page)
//    - Authorization callback URL: https://<your-extension-id>.chromiumapp.org/
// 4. After creation, copy Client ID and generate a Client Secret
// 5. Replace the values below

const CONFIG = {
  github: {
    // Replace with your GitHub OAuth App credentials
    clientId: 'YOUR_GITHUB_CLIENT_ID',
    clientSecret: 'YOUR_GITHUB_CLIENT_SECRET',

    // GitHub OAuth URLs
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',

    // Scopes needed for the extension
    scopes: [
      'repo', // Access to repository data
      'read:user' // Read user profile info
    ],

    // API endpoints
    apiBase: 'https://api.github.com'
  },

  openai: {
    // Replace with your OpenAI API key from https://platform.openai.com/api-keys
    apiKey: 'YOUR_OPENAI_API_KEY',
    apiBase: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    maxTokens: 2000
  },

  stripe: {
    // Replace with your Stripe publishable key from https://dashboard.stripe.com/apikeys
    publishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY'
  },

  // Feature flags
  features: {
    realGitHubAuth: false, // Set to true once OAuth credentials are configured
    realAIAnalysis: false, // Set to true once OpenAI API key is configured
    stripePayments: false  // Set to true once Stripe is configured
  },

  // Development mode
  isDevelopment: false // Set to false for production
};

// Validate configuration
function validateConfig() {
  const warnings = [];

  if (CONFIG.github.clientId === 'YOUR_GITHUB_CLIENT_ID') {
    warnings.push('⚠️ GitHub OAuth not configured. Using mock authentication.');
  }

  if (CONFIG.openai.apiKey === 'YOUR_OPENAI_API_KEY') {
    warnings.push('⚠️ OpenAI API not configured. Using mock AI analysis.');
  }

  if (CONFIG.stripe.publishableKey === 'YOUR_STRIPE_PUBLISHABLE_KEY') {
    warnings.push('⚠️ Stripe not configured. Payments disabled.');
  }

  if (warnings.length > 0) {
    console.log('Configuration warnings:');
    warnings.forEach(w => console.log(w));
  }

  return warnings.length === 0;
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, validateConfig };
}
