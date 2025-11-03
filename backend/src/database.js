// PostgreSQL Database setup and management
const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
  console.log('Initializing PostgreSQL database...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        api_token VARCHAR(255) UNIQUE NOT NULL,
        tier VARCHAR(50) DEFAULT 'free' CHECK(tier IN ('free', 'pro', 'team')),
        stripe_customer_id VARCHAR(255),
        active_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Usage tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        pr_url TEXT NOT NULL,
        repo_name VARCHAR(255),
        pr_number INTEGER,
        analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        stripe_subscription_id VARCHAR(255) UNIQUE,
        stripe_customer_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'inactive' CHECK(status IN ('active', 'canceled', 'past_due', 'inactive')),
        plan VARCHAR(50) CHECK(plan IN ('pro', 'team')),
        current_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_token ON users(api_token);
      CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage(user_id, year, month);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
    `);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get user by email
async function getUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

// Get user by API token
async function getUserByToken(token) {
  const result = await pool.query('SELECT * FROM users WHERE api_token = $1', [token]);
  return result.rows[0];
}

// Create new user
async function createUser(email, passwordHash, apiToken) {
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, api_token) VALUES ($1, $2, $3) RETURNING id',
    [email, passwordHash, apiToken]
  );
  return result.rows[0].id;
}

// Get user's monthly usage count
async function getMonthlyUsage(userId) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const result = await pool.query(
    'SELECT COUNT(*) as count FROM usage WHERE user_id = $1 AND month = $2 AND year = $3',
    [userId, month, year]
  );
  return parseInt(result.rows[0].count);
}

// Record PR analysis
async function recordUsage(userId, prUrl, repoName, prNumber) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const result = await pool.query(
    'INSERT INTO usage (user_id, pr_url, repo_name, pr_number, month, year) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [userId, prUrl, repoName, prNumber, month, year]
  );
  return result.rows[0];
}

// Get user's stats
async function getUserStats(userId) {
  const totalResult = await pool.query('SELECT COUNT(*) as count FROM usage WHERE user_id = $1', [userId]);
  const monthlyUsage = await getMonthlyUsage(userId);

  const userResult = await pool.query('SELECT tier FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];

  const limit = user?.tier === 'free' ? parseInt(process.env.FREE_TIER_LIMIT || 5) : -1;

  return {
    totalPRs: parseInt(totalResult.rows[0].count),
    monthlyUsage: monthlyUsage,
    tier: user?.tier || 'free',
    limit: limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - monthlyUsage)
  };
}

// Update user tier
async function updateUserTier(userId, tier) {
  const result = await pool.query(
    'UPDATE users SET tier = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [tier, userId]
  );
  return result;
}

// Create or update subscription
async function upsertSubscription(userId, stripeCustomerId, stripeSubscriptionId, status, plan, periodEnd) {
  const existing = await pool.query('SELECT id FROM subscriptions WHERE user_id = $1', [userId]);

  if (existing.rows.length > 0) {
    const result = await pool.query(
      `UPDATE subscriptions
       SET stripe_customer_id = $1,
           stripe_subscription_id = $2,
           status = $3,
           plan = $4,
           current_period_end = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6`,
      [stripeCustomerId, stripeSubscriptionId, status, plan, periodEnd, userId]
    );
    return result;
  } else {
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, stripeCustomerId, stripeSubscriptionId, status, plan, periodEnd]
    );
    return result;
  }
}

// Get subscription by user ID
async function getSubscriptionByUserId(userId) {
  const result = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
  return result.rows[0];
}

// Get subscription by Stripe subscription ID
async function getSubscriptionByStripeId(stripeSubscriptionId) {
  const result = await pool.query('SELECT * FROM subscriptions WHERE stripe_subscription_id = $1', [stripeSubscriptionId]);
  return result.rows[0];
}

// Cancel subscription
async function cancelSubscription(userId) {
  const result = await pool.query(
    `UPDATE subscriptions
     SET status = 'canceled',
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId]
  );
  return result;
}

// Graceful shutdown
async function closeDatabase() {
  await pool.end();
  console.log('PostgreSQL connection pool closed');
}

module.exports = {
  pool,
  initializeDatabase,
  getUserByEmail,
  getUserByToken,
  createUser,
  getMonthlyUsage,
  recordUsage,
  getUserStats,
  updateUserTier,
  upsertSubscription,
  getSubscriptionByUserId,
  getSubscriptionByStripeId,
  cancelSubscription,
  closeDatabase
};
