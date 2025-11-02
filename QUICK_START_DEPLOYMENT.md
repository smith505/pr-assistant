# 🚀 Quick Start: Deploy to Production

## Current Status ✅
- ✅ Backend code production-ready
- ✅ Stripe integrated and tested locally
- ✅ Database with your user account (corysmth14@gmail.com, Pro tier)
- ✅ Railway deployment configuration created
- ✅ Auto-update script ready

## Next Steps (30-45 minutes)

### 1. Deploy Backend to Railway (15 minutes)

**Option A: Deploy from GitHub (Recommended)**
1. Go to https://railway.app and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub
4. Select your repository
5. **Important:** Set root directory to `backend`
6. Railway will auto-detect Node.js and deploy

**Option B: Deploy using Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize in backend directory
cd backend
railway init

# Deploy
railway up
```

### 2. Configure Environment Variables (5 minutes)

In Railway dashboard → Your Project → Variables, add:

```env
NODE_ENV=production
OPENAI_API_KEY=your-openai-api-key-here
JWT_SECRET=your-random-jwt-secret-here
FREE_TIER_LIMIT=5
PRO_TIER_LIMIT=-1
STRIPE_SECRET_KEY=your-stripe-secret-key-here
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key-here
STRIPE_PRO_PRICE_ID=your-stripe-price-id-here
```

**Note:** Leave `STRIPE_WEBHOOK_SECRET` empty for now - we'll add it in step 4.

### 3. Get Your Production URL (2 minutes)

Railway automatically generates a URL like:
- `https://github-pr-assistant-backend.up.railway.app`

To find it:
1. Go to Railway dashboard → Your Project → Settings
2. Click "Generate Domain" if not auto-generated
3. **Copy this URL** - you'll need it next

Test it works:
- Visit `https://your-url.railway.app` - should show API info
- Visit `https://your-url.railway.app/health` - should show:
  ```json
  {
    "status": "ok",
    "environment": "production",
    "openaiConfigured": true,
    "stripeConfigured": true
  }
  ```

### 4. Configure Stripe Webhook (5 minutes)

1. Go to https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Endpoint URL: `https://your-railway-url.railway.app/api/stripe/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add to Railway environment variables:
   - Variable: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_xxxxx` (your signing secret)

### 5. Update Extension URLs (2 minutes)

Run the auto-update script:

```bash
cd github-pr-assistant
node update-production-urls.js https://your-railway-url.railway.app
```

This automatically updates:
- ✅ src/popup/popup.js
- ✅ src/scripts/background.js
- ✅ src/scripts/subscription.js

### 6. Test Production Backend (5 minutes)

1. **Reload extension in Chrome:**
   - Go to `chrome://extensions`
   - Click refresh icon on "GitHub PR Assistant"

2. **Test authentication:**
   - Click extension icon
   - Logout if already logged in
   - Try registering a new test account
   - Or login with: `corysmth14@gmail.com`

3. **Test PR analysis:**
   - Go to any GitHub PR
   - Click "Analyze PR" button
   - Verify analysis completes

4. **Test Stripe checkout:**
   - Click extension icon
   - Click "Upgrade to Pro" banner
   - Complete test checkout (card: 4242 4242 4242 4242)
   - Verify upgrade completes

### 7. Package for Chrome Web Store (2 minutes)

Create production ZIP:

```bash
cd github-pr-assistant
powershell -Command "Compress-Archive -Path manifest.json,src,assets -DestinationPath 'pr-assistant-v1.0.0.zip' -Force"
```

File created: `pr-assistant-v1.0.0.zip` (ready for upload)

### 8. Submit to Chrome Web Store (5 minutes)

1. Go to https://chrome.google.com/webstore/devconsole
2. **Withdraw current submission** (if exists) - it won't work without backend
3. Click "New Item"
4. Upload `pr-assistant-v1.0.0.zip`
5. Fill in store listing (if not already done)
6. Submit for review
7. **Expected review time:** 1-3 business days

---

## 🎯 Final Production Checklist

Before submitting to Chrome Web Store:

- [ ] Backend deployed and health check returns 200
- [ ] All environment variables configured in Railway
- [ ] Stripe webhook configured and secret added to Railway
- [ ] Extension URLs updated to production (all 3 files)
- [ ] Extension reloaded in Chrome
- [ ] Test: Register new account works
- [ ] Test: Login works
- [ ] Test: PR analysis works
- [ ] Test: Stripe checkout completes
- [ ] Test: Webhook upgrades user to Pro automatically
- [ ] ZIP file created with production URLs
- [ ] Old Chrome Web Store submission withdrawn
- [ ] New submission uploaded

---

## 📊 Your Current Setup

**Backend:**
- Database: SQLite with your account
- Your account: corysmth14@gmail.com (Pro tier, upgraded manually)
- PR analyses completed: 2

**Stripe:**
- Mode: Test
- Pro Price: $9/month (price_1SPA3A2MNNechcXydfRwQkcG)
- Checkout: ✅ Working locally

**Extension:**
- Version: 1.0.0
- Current URLs: localhost:3001 (needs production update)
- Features: Auth, PR Analysis, Usage Limits, Stripe Payments, Premium UI

---

## ⚠️ Important Notes

**Database Migration:**
- Your local database won't transfer to Railway automatically
- Users will need to register again on production
- Your local test account won't exist on production initially
- After deployment, you can manually create your account again

**Moving to Live Mode:**
When ready for real customers:
1. Switch Stripe to Live mode
2. Update Stripe keys in Railway to live keys
3. Test with real card (will charge)
4. Update pricing page with real payment flow

**Monitoring:**
- Railway provides logs in dashboard
- Check logs for errors after deployment
- Monitor Stripe dashboard for webhooks

---

## 🆘 Troubleshooting

**Backend won't start:**
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure Node version compatible (14+)

**Extension can't reach backend:**
- Verify production URL is correct
- Check Railway service is running
- Test health endpoint in browser

**Stripe checkout fails:**
- Verify Stripe keys are test keys
- Check webhook secret is correct
- Review Stripe dashboard for errors

**Need help?**
- Railway docs: https://docs.railway.app
- Stripe docs: https://stripe.com/docs/webhooks
- Chrome extension docs: https://developer.chrome.com/docs/webstore
