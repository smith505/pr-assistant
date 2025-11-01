# Setup Guide - GitHub PR Review Assistant

Complete setup guide for Day 2 API integration and configuration.

---

## 📋 Prerequisites

Before starting, you'll need:
- Chrome browser with extension developer mode enabled
- GitHub account
- OpenAI account (for GPT-4 API access)
- Stripe account (optional, for monetization)

---

## 🔑 Step 1: GitHub OAuth Configuration

### 1.1 Register GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the application details:

```
Application name: GitHub PR Review Assistant
Homepage URL: https://github-pr-assistant.com (or your landing page)
Application description: AI-powered PR review assistant
Authorization callback URL: See step 1.2 below
```

### 1.2 Get Your Extension ID

1. Load your unpacked extension in Chrome (`chrome://extensions/`)
2. Find your extension and copy the **Extension ID** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)
3. Your callback URL will be: `https://<your-extension-id>.chromiumapp.org/`
4. Paste this URL as the **Authorization callback URL** in your GitHub OAuth App

### 1.3 Get Client ID and Secret

After creating the OAuth App:
1. Copy the **Client ID**
2. Click **"Generate a new client secret"**
3. Copy the **Client Secret** (save it immediately, it won't be shown again!)

### 1.4 Configure the Extension

Open `src/config.js` and update:

```javascript
github: {
  clientId: 'YOUR_GITHUB_CLIENT_ID',        // Paste your Client ID
  clientSecret: 'YOUR_GITHUB_CLIENT_SECRET' // Paste your Client Secret
}
```

Enable real GitHub authentication:

```javascript
features: {
  realGitHubAuth: true,  // Set to true
  realAIAnalysis: false, // Will enable in Step 2
  stripePayments: false  // Will enable in Step 3
}
```

---

## 🤖 Step 2: OpenAI API Configuration

### 2.1 Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Give it a name like "PR Assistant"
4. Copy the API key (starts with `sk-...`)

### 2.2 Add Billing Information

OpenAI requires a payment method:
1. Go to https://platform.openai.com/account/billing
2. Add a payment method
3. Consider setting a usage limit (e.g., $10/month for development)

**Estimated Costs:**
- GPT-4: ~$0.02-0.05 per PR analysis
- 100 PRs = ~$2-5
- 1,000 PRs = ~$20-50

### 2.3 Configure the Extension

Open `src/config.js` and update:

```javascript
openai: {
  apiKey: 'sk-YOUR_OPENAI_API_KEY', // Paste your API key
  apiBase: 'https://api.openai.com/v1',
  model: 'gpt-4',
  maxTokens: 2000
}
```

Enable real AI analysis:

```javascript
features: {
  realGitHubAuth: true,
  realAIAnalysis: true,  // Set to true
  stripePayments: false
}
```

---

## 💳 Step 3: Stripe Configuration (Optional)

**Note:** This is optional for Day 2. You can enable this when you're ready to monetize.

### 3.1 Create Stripe Account

1. Go to https://stripe.com and sign up
2. Complete account verification

### 3.2 Get API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_test_...` for test mode)
3. Copy your **Secret key** (starts with `sk_test_...` for test mode)

### 3.3 Configure Products and Pricing

1. Go to https://dashboard.stripe.com/products
2. Create products:
   - **Pro Plan**: $9/month
   - **Team Plan**: $29/month
   - **Enterprise Plan**: $99/month

### 3.4 Configure the Extension

Open `src/config.js` and update:

```javascript
stripe: {
  publishableKey: 'pk_test_YOUR_STRIPE_KEY' // Paste your publishable key
}
```

Enable Stripe payments:

```javascript
features: {
  realGitHubAuth: true,
  realAIAnalysis: true,
  stripePayments: true  // Set to true
}
```

---

## ✅ Step 4: Verify Configuration

### 4.1 Check Console Output

1. Go to `chrome://extensions/`
2. Find your extension
3. Click **"service worker"** to open the background console
4. Look for configuration warnings:

```
✅ GitHub OAuth configured
✅ OpenAI API configured
⚠️ Stripe not configured (optional)
```

### 4.2 Test Authentication Flow

1. Go to any GitHub PR (e.g., https://github.com/facebook/react/pull/30875)
2. Click **"Connect GitHub"** button
3. You should see the real GitHub OAuth flow
4. After authorizing, you should be redirected back to the extension

### 4.3 Test AI Analysis

1. On a GitHub PR page, click **"Analyze PR"**
2. Watch the background console for:
```
🤖 Generating AI summary...
✅ AI analysis complete
```
3. Verify the AI summary displays on the page with:
   - Summary
   - Key Changes
   - Impact Assessment
   - Security Concerns (if any)
   - Potential Issues (if any)
   - Critical Files (if any)
   - Review Checklist

---

## 🐛 Troubleshooting

### GitHub OAuth Not Working

**Error: "No authorization code received"**
- ✅ Check your callback URL matches: `https://<extension-id>.chromiumapp.org/`
- ✅ Verify Client ID and Secret are correct
- ✅ Ensure `realGitHubAuth: true` in config.js

**Error: "Failed to exchange code for token"**
- ✅ Verify Client Secret is correct (regenerate if needed)
- ✅ Check Chrome console for detailed error messages

### OpenAI API Not Working

**Error: "OpenAI API error: Invalid API key"**
- ✅ Verify API key starts with `sk-`
- ✅ Check for extra spaces or characters
- ✅ Ensure billing is set up in OpenAI account

**Error: "Rate limit exceeded"**
- ✅ Check your OpenAI usage limits
- ✅ Wait and retry (limits reset every minute)

**Error: "Model not found"**
- ✅ Verify you have access to GPT-4
- ✅ Try changing to `gpt-3.5-turbo` if GPT-4 isn't available

### Extension Not Loading Config

**Config warnings persist after updating config.js**
- ✅ Reload extension from `chrome://extensions/` (click refresh icon)
- ✅ Check console for JavaScript syntax errors
- ✅ Verify config.js is saved properly

---

## 🔒 Security Best Practices

### API Key Safety

1. **Never commit API keys to git**
   - config.js is in .gitignore
   - Never push config.js to public repositories

2. **Use environment-specific keys**
   - Test keys for development (`pk_test_...`, `sk_test_...`)
   - Production keys only for live extension

3. **Rotate keys regularly**
   - Change API keys every 90 days
   - Immediately rotate if exposed

### OAuth Security

1. **Validate OAuth state parameter**
   - Prevents CSRF attacks
   - Already implemented in background.js

2. **Store tokens securely**
   - Uses Chrome Storage API (encrypted)
   - Never log tokens to console

3. **Limit OAuth scopes**
   - Only request necessary permissions
   - Current: `repo`, `read:user`

---

## 📊 Monitoring and Limits

### GitHub API Limits

- **Authenticated**: 5,000 requests/hour
- **Rate limit reset**: 1 hour
- Monitor via: `https://api.github.com/rate_limit`

### OpenAI API Limits

- **Tier 1**: 200 requests/day, 40K tokens/min
- **Tier 2**: 500 requests/day, 150K tokens/min
- Monitor via: https://platform.openai.com/account/usage

### Chrome Storage Limits

- **Local storage**: 10 MB per extension
- **Sync storage**: 100 KB per extension
- Current usage: ~5 KB per user

---

## 🎯 Next Steps

After completing setup:

1. ✅ Test with 5-10 different PRs
2. ✅ Verify all features work correctly
3. ✅ Check console for errors
4. ✅ Monitor API usage and costs
5. ✅ Ready for Day 3: Core Features (highlighting, scoring, analytics)

---

## 💡 Development vs Production

### Development Mode

Current configuration (`isDevelopment: true`):
- Detailed console logging
- Mock fallbacks enabled
- Test API keys
- Verbose error messages

### Production Mode

When ready to launch (`isDevelopment: false`):
- Minimal logging
- No mock fallbacks
- Production API keys
- User-friendly error messages
- Error reporting to monitoring service

---

## 📞 Support Resources

- **GitHub OAuth Docs**: https://docs.github.com/en/developers/apps/building-oauth-apps
- **OpenAI API Docs**: https://platform.openai.com/docs
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/mv3/
- **Stripe Docs**: https://stripe.com/docs

---

## ✅ Configuration Checklist

- [ ] GitHub OAuth App created
- [ ] Extension ID obtained
- [ ] GitHub Client ID and Secret configured
- [ ] OpenAI API key obtained
- [ ] OpenAI billing configured
- [ ] config.js updated with all credentials
- [ ] Feature flags enabled
- [ ] Extension reloaded in Chrome
- [ ] Authentication tested successfully
- [ ] AI analysis tested successfully
- [ ] No console errors
- [ ] Ready for Day 3

**Congratulations! Day 2 API integration is complete! 🎉**
