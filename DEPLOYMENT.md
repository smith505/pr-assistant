# Production Deployment Guide

## Railway Deployment (Recommended)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub (recommended for easy repo connection)
3. Verify your email

### Step 2: Deploy Backend
1. Click "New Project" on Railway dashboard
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub
4. Select your `github-pr-assistant` repository
5. Railway will detect the Node.js project automatically
6. Select the `backend` directory as the root directory

### Step 3: Configure Environment Variables
In Railway project settings → Variables, add these:

```
NODE_ENV=production
OPENAI_API_KEY=your-openai-api-key-here
JWT_SECRET=your-random-jwt-secret-here
FREE_TIER_LIMIT=5
PRO_TIER_LIMIT=-1
STRIPE_SECRET_KEY=your-stripe-secret-key-here
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key-here
STRIPE_PRO_PRICE_ID=your-stripe-price-id-here
```

### Step 4: Get Your Production URL
1. After deployment, Railway provides a URL like: `https://your-app.railway.app`
2. Click "Settings" → "Generate Domain" if not auto-generated
3. Copy this URL - you'll need it for the extension

### Step 5: Configure Stripe Webhook
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your Railway URL + `/api/stripe/webhook`
   - Example: `https://your-app.railway.app/api/stripe/webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add to Railway environment variables as `STRIPE_WEBHOOK_SECRET`

### Step 6: Verify Deployment
Visit your Railway URL in a browser - you should see:
```json
{
  "name": "GitHub PR Review Assistant API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": { ... }
}
```

Check health endpoint: `https://your-app.railway.app/health`
Should show:
```json
{
  "status": "ok",
  "environment": "production",
  "openaiConfigured": true,
  "stripeConfigured": true
}
```

---

## Alternative: Render Deployment

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub

### Step 2: Deploy Backend
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - Name: `github-pr-assistant-api`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free (upgrade for production)

### Step 3: Add Environment Variables
Same as Railway (see Step 3 above)

### Step 4: Get Production URL
Render provides URL like: `https://github-pr-assistant-api.onrender.com`

---

## After Deployment

### Update Extension URLs
You'll need to update these files with your production URL:

**src/popup/popup.js** (line 2):
```javascript
const BACKEND_URL = 'https://your-production-url.railway.app';
```

**src/scripts/background.js** (line 29):
```javascript
const BACKEND_URL = 'https://your-production-url.railway.app';
```

**src/scripts/subscription.js** (STRIPE_CONFIG):
```javascript
backendUrl: 'https://your-production-url.railway.app'
```

### Test Production Backend
1. Update extension URLs to production
2. Reload extension in Chrome
3. Test login/register
4. Test PR analysis
5. Test Stripe checkout

### Package for Chrome Web Store
1. Create ZIP file:
   ```bash
   cd github-pr-assistant
   powershell -Command "Compress-Archive -Path manifest.json,src,assets -DestinationPath 'pr-assistant-v1.0.0.zip' -Force"
   ```
2. Upload to Chrome Web Store
3. Wait for review (typically 1-3 days)

---

## Troubleshooting

### Database Persistence
Railway automatically persists the SQLite database. If users/data reset:
- Check Railway volumes are enabled
- Consider upgrading to PostgreSQL for production

### CORS Errors
If extension can't reach backend:
- Verify Railway URL is correct
- Check CORS settings in server.js allow chrome-extension origins

### Stripe Webhook Not Working
- Verify webhook URL is publicly accessible
- Check webhook secret is correctly set in Railway
- Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3001/api/stripe/webhook`

### API Rate Limits
If OpenAI requests fail:
- Check OpenAI account has credits
- Verify API key is correct
- Consider implementing rate limiting

---

## Production Checklist

- [ ] Backend deployed to Railway/Render
- [ ] Environment variables configured
- [ ] Production URL obtained
- [ ] Stripe webhook configured
- [ ] Health check endpoint returns 200
- [ ] Extension URLs updated to production
- [ ] End-to-end testing complete
- [ ] Chrome Web Store submission ready
- [ ] Database backup strategy in place
- [ ] Monitoring/logging configured
