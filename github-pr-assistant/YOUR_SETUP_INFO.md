# Your Personal Setup Information

**Your Chrome Extension ID**: `oghnpaboekeijgdlpakpggoogohhecii`

---

## Step 2: GitHub OAuth Setup (Do This Now - 3 minutes)

### 2.1 Register OAuth App

1. **Go to**: https://github.com/settings/developers
2. Click **"New OAuth App"** (green button on the right)
3. Fill in the form with these EXACT values:

```
Application name: GitHub PR Review Assistant

Homepage URL: https://github.com/yourusername/github-pr-assistant
(or use: https://github-pr-assistant.com)

Authorization callback URL: https://oghnpaboekeijgdlpakpggoogohhecii.chromiumapp.org/
```

**⚠️ CRITICAL**: Use this EXACT callback URL:
```
https://oghnpaboekeijgdlpakpggoogohhecii.chromiumapp.org/
```

4. Click **"Register application"**

### 2.2 Copy Your Credentials

After registering, you'll see a page with:

**Client ID**: (looks like `Ov23li1a2b3c4d5e6f7g8`)
- Copy this entire string

**Client secrets**:
- Click **"Generate a new client secret"**
- Copy the secret that appears (you can only see it once!)
- It looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0`

---

## Step 3: OpenAI API Key (Do This Next - 3 minutes)

### 3.1 Create Account
1. **Go to**: https://platform.openai.com/signup
2. Sign up with email or Google
3. Verify your email

### 3.2 Add Payment
1. **Go to**: https://platform.openai.com/account/billing
2. Click **"Add payment method"**
3. Add your credit/debit card
4. **Set billing limit**: $10/month (recommended)
   - Prevents surprise charges
   - $10 = about 250-500 PR analyses

### 3.3 Get API Key
1. **Go to**: https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Name it: "GitHub PR Assistant"
4. **Copy the key** (starts with `sk-proj-...` or `sk-...`)
5. ⚠️ **Save it NOW** - you can't see it again!

---

## Your Credentials Template

Once you get all the keys, paste them here:

```
GitHub OAuth:
  Client ID:     ________________________________
  Client Secret: ________________________________

OpenAI:
  API Key:       sk-________________________________
```

**After you get all three, tell me and I'll update your config.js file!**

---

## Quick Links

- GitHub OAuth: https://github.com/settings/developers
- OpenAI API Keys: https://platform.openai.com/api-keys
- OpenAI Billing: https://platform.openai.com/account/billing
- OpenAI Usage: https://platform.openai.com/usage

---

## Next Step

Once you have all three credentials:
1. Paste them here in the chat
2. I'll update your config.js file
3. You'll reload the extension
4. We'll test on a real PR with REAL data!

**No more fake data! 🎉**
