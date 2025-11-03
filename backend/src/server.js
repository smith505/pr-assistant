// GitHub PR Assistant Backend Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow chrome extensions and localhost
    if (origin.startsWith('chrome-extension://') ||
        origin === 'http://localhost:3001' ||
        origin === 'http://localhost:3000') {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Special handling for Stripe webhooks (needs raw body)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON body parser for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  // Skip logging for webhook raw body route
  if (req.path !== '/api/stripe/webhook') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// Serve static files (privacy policy, etc.)
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
const authRoutes = require('./routes/auth');
const prRoutes = require('./routes/pr');
const stripeRoutes = require('./routes/stripe');

app.use('/api/auth', authRoutes);
app.use('/api/pr', prRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'GitHub PR Review Assistant API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify',
        me: 'GET /api/auth/me'
      },
      pr: {
        analyze: 'POST /api/pr/analyze',
        usage: 'GET /api/pr/usage'
      },
      stripe: {
        createCheckout: 'POST /api/stripe/create-checkout',
        webhook: 'POST /api/stripe/webhook',
        config: 'GET /api/stripe/config'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server with async database initialization
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   GitHub PR Review Assistant Backend API                   ║
║                                                            ║
║   Server running on: http://localhost:${PORT}                ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   OpenAI configured: ${process.env.OPENAI_API_KEY ? 'Yes ✓' : 'No ✗'}                           ║
║   Stripe configured: ${process.env.STRIPE_SECRET_KEY ? 'Yes ✓' : 'No ✗'}                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Warn about missing configuration
  if (!process.env.OPENAI_API_KEY) {
    console.warn('\n⚠️  WARNING: OPENAI_API_KEY not configured');
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  WARNING: STRIPE_SECRET_KEY not configured');
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️  WARNING: STRIPE_WEBHOOK_SECRET not configured');
  }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const { closeDatabase } = require('./database');

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Start the server
startServer();
