# GitHub PR Review Assistant - Backend API

Backend server for the GitHub PR Review Assistant Chrome extension.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required environment variables:
- `OPENAI_API_KEY` - Your OpenAI API key from https://platform.openai.com/api-keys
- `STRIPE_SECRET_KEY` - Your Stripe secret key from https://dashboard.stripe.com/apikeys
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from https://dashboard.stripe.com/webhooks
- `JWT_SECRET` - Random string for JWT signing (generate with `openssl rand -base64 32`)

### 3. Run the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will run on http://localhost:3001

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login and get API token
- `GET /api/auth/verify` - Verify API token
- `GET /api/auth/me` - Get user info and stats

### PR Analysis
- `POST /api/pr/analyze` - Analyze a GitHub PR (requires auth)
- `GET /api/pr/usage` - Get monthly usage stats (requires auth)

### Stripe Payments
- `POST /api/stripe/create-checkout` - Create payment checkout session
- `POST /api/stripe/webhook` - Stripe webhook handler
- `GET /api/stripe/config` - Get Stripe publishable key

## Usage Limits

- **Free Tier**: 5 PR analyses per month
- **Pro Tier**: Unlimited analyses ($29/month)
- **Team Tier**: Unlimited analyses ($99/month)

## Database

Uses SQLite for local development. Schema includes:
- `users` - User accounts and tiers
- `usage` - Monthly PR analysis tracking
- `subscriptions` - Stripe subscription status

## Testing the API

### Register a new user:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Analyze PR (replace TOKEN with your API token):
```bash
curl -X POST http://localhost:3001/api/pr/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "pr": {
      "title": "Add new feature",
      "description": "This PR adds a new feature",
      "url": "https://github.com/owner/repo/pull/123",
      "repo": "owner/repo",
      "number": 123
    },
    "files": [
      {
        "filename": "src/feature.js",
        "additions": 50,
        "deletions": 10,
        "patch": "// code changes here"
      }
    ]
  }'
```

## Deployment

### Railway
1. Create account at https://railway.app
2. Create new project
3. Connect GitHub repo
4. Add environment variables
5. Deploy

### Render
1. Create account at https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Add environment variables
5. Deploy

## Security Notes

- API tokens are UUIDs stored in database
- Passwords are hashed with bcryptjs (10 rounds)
- CORS configured for Chrome extensions
- Stripe webhooks verified with signing secret
- Usage limits enforced server-side (client cannot bypass)

## Admin Scripts

### List all users:
```bash
node list-users.js
```

### Upgrade user to Pro:
```bash
node upgrade-to-pro.js user@example.com
```
