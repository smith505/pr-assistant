# Quick API Setup Guide - ChatGPT Version

**Goal**: Get your extension working with real data in 10 minutes

**Cost**: ~$0.02-0.04 per PR analysis

---

## Step 1: Load Extension & Get ID (2 minutes)

### 1.1 Load Extension in Chrome
1. Open Chrome
2. Go to: `chrome://extensions/`
3. Toggle "Developer mode" (top right corner)
4. Click "Load unpacked"
5. Select folder: `C:\Users\Cory\Desktop\New folder (3)\github-pr-assistant`

### 1.2 Copy Your Extension ID
- Your extension now shows with an ID like: `abcdefghijklmnopqrstuvwxyz123456`
- **Copy this ID** (you'll need it in Step 2)
- Example: `kbpgddbgniojgndnhlkjbkpfohghlnbm`

**Your Extension ID**: `_________________________________`

---

## Step 2: GitHub OAuth Setup (3 minutes)

### 2.1 Register OAuth App
1. Go to: https://github.com/settings/developers
2. Click "New OAuth App" (green button)
3. Fill in the form:

```
Application name: GitHub PR Review Assistant
Homepage URL: https://github.com/yourname/github-pr-assistant
Authorization callback URL: https://[YOUR_EXTENSION_ID].chromiumapp.org/
```

**IMPORTANT**: Replace `[YOUR_EXTENSION_ID]` with your actual ID from Step 1

Example:
```
https://kbpgddbgniojgndnhlkjbkpfohghlnbm.chromiumapp.org/
```

4. Click "Register application"

### 2.2 Get Credentials
After registering, you'll see:
- **Client ID**: `Ov23liabcdef123456` (copy this)
- Click "Generate a new client secret"
- **Client Secret**: `1234567890abcdefghijklmnopqrstuvwxyz1234` (copy this)

⚠️ **IMPORTANT**: Copy the Client Secret NOW - you can't see it again!

**Your GitHub OAuth Credentials**:
```
Client ID:     _________________________________
Client Secret: _________________________________
```

---

## Step 3: OpenAI API Key (3 minutes)

### 3.1 Create OpenAI Account
1. Go to: https://platform.openai.com/signup
2. Sign up with email or Google
3. Verify your email

### 3.2 Add Payment Method
1. Go to: https://platform.openai.com/account/billing
2. Click "Add payment method"
3. Add credit/debit card
4. Set billing limit: **$10/month** (recommended for testing)
   - This prevents surprise bills
   - $10 = ~250-500 PR analyses

### 3.3 Get API Key
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it: "GitHub PR Assistant"
4. **Copy the key** (starts with `sk-`)

**Your OpenAI API Key**:
```
sk-_________________________________
```

⚠️ **IMPORTANT**: This key gives access to your OpenAI account. Keep it secret!

---

## Step 4: Update config.js (2 minutes)

Now let's add your credentials to the extension.

1. Open file: `github-pr-assistant/src/config.js`
2. Replace the placeholder values:

```javascript
const CONFIG = {
  github: {
    clientId: 'YOUR_GITHUB_CLIENT_ID',        // ← Replace with your GitHub Client ID
    clientSecret: 'YOUR_GITHUB_CLIENT_SECRET', // ← Replace with your GitHub Client Secret
    // ... rest stays the same
  },

  openai: {
    apiKey: 'YOUR_OPENAI_API_KEY',            // ← Replace with your OpenAI API key (sk-...)
    // ... rest stays the same
  },

  // Enable real APIs
  features: {
    realGitHubAuth: true,  // ← Change false to true
    realAIAnalysis: true,  // ← Change false to true
    stripePayments: false  // ← Keep false for now
  }
};
```

3. Save the file

---

## Step 5: Reload Extension (1 minute)

1. Go back to: `chrome://extensions/`
2. Find "GitHub PR Review Assistant"
3. Click the **reload icon** (circular arrow)
4. Check for errors in console (click "Errors" if any)

---

## Step 6: Test It! (2 minutes)

### 6.1 Test Authentication
1. Click the extension icon in Chrome toolbar
2. You should see the analytics dashboard (all zeros)
3. Extension is loaded successfully!

### 6.2 Test on Real PR
1. Go to: https://github.com/facebook/react/pull/28710
2. Wait 2-3 seconds for extension to inject
3. Look for the "🤖 PR Review Assistant" panel on the right side
4. Click "Connect GitHub" button
5. GitHub authorization page should open
6. Click "Authorize"
7. Click "Analyze PR" button
8. Wait ~5-10 seconds for AI analysis
9. See REAL data appear!

---

## ✅ Success Checklist

- [ ] Extension loaded in Chrome
- [ ] Extension ID copied
- [ ] GitHub OAuth app created
- [ ] GitHub Client ID & Secret obtained
- [ ] OpenAI account created
- [ ] Payment method added to OpenAI
- [ ] OpenAI API key obtained
- [ ] config.js updated with all credentials
- [ ] Feature flags set to `true`
- [ ] Extension reloaded
- [ ] GitHub authentication works
- [ ] AI analysis works on real PR
- [ ] No more fake data!

---

## 💰 Cost Monitoring

### Check Your OpenAI Usage:
https://platform.openai.com/usage

### Typical Costs:
- Small PR (<10 files): $0.02
- Medium PR (10-30 files): $0.03
- Large PR (30+ files): $0.04-0.06

### Monthly Estimates:
- 10 PRs: ~$0.30
- 50 PRs: ~$1.50
- 100 PRs: ~$3.00
- 500 PRs: ~$15.00

### Set Billing Limit:
1. Go to: https://platform.openai.com/account/limits
2. Set hard limit: $10/month
3. Set email alerts at 50% usage

---

## 🐛 Troubleshooting

### "Invalid Client ID"
- Check that you copied the full Client ID (starts with `Ov23li`)
- No extra spaces in config.js

### "Invalid API Key"
- Check that you copied the full key (starts with `sk-`)
- Make sure you didn't include any spaces

### "Extension won't load"
- Check console for errors: chrome://extensions → Click "Errors"
- Make sure config.js has valid JavaScript syntax
- Try reloading the extension

### "No panel appears on GitHub"
- Refresh the PR page
- Check that you're on a PR page (not issues or code view)
- Open browser console (F12) and check for errors

### "OAuth fails"
- Verify callback URL matches your extension ID exactly
- Make sure you're using the callback URL format: `https://[ID].chromiumapp.org/`

---

## 🎯 Next Steps After Setup

Once everything works:
1. ✅ Test on multiple PRs to see different impact scores
2. ✅ Check analytics dashboard (click extension icon)
3. ✅ Verify patterns are being detected
4. ✅ Monitor OpenAI costs in dashboard
5. ✅ Move to Day 4: Stripe monetization

---

## 📞 Need Help?

If you get stuck:
1. Check the error message in browser console (F12)
2. Verify all credentials are correct in config.js
3. Make sure feature flags are set to `true`
4. Try reloading the extension

**Common fixes**:
- Reload extension after config.js changes
- Clear Chrome cache: Settings → Privacy → Clear browsing data
- Restart Chrome completely
