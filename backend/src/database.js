// Database setup and management
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', process.env.DATABASE_PATH || 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables
function initializeDatabase() {
  console.log('Initializing database...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      api_token TEXT UNIQUE NOT NULL,
      tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'pro', 'team')),
      stripe_customer_id TEXT,
      active_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add active_until column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN active_until DATETIME`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Usage tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pr_url TEXT NOT NULL,
      repo_name TEXT,
      pr_number INTEGER,
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Subscriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stripe_subscription_id TEXT UNIQUE,
      stripe_customer_id TEXT,
      status TEXT DEFAULT 'inactive' CHECK(status IN ('active', 'canceled', 'past_due', 'inactive')),
      plan TEXT CHECK(plan IN ('pro', 'team')),
      current_period_end DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_token ON users(api_token);
    CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage(user_id, year, month);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
  `);

  console.log('✅ Database initialized successfully');
}

// Get user by email
function getUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}

// Get user by API token
function getUserByToken(token) {
  const stmt = db.prepare('SELECT * FROM users WHERE api_token = ?');
  return stmt.get(token);
}

// Create new user
function createUser(email, passwordHash, apiToken) {
  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, api_token)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(email, passwordHash, apiToken);
  return result.lastInsertRowid;
}

// Get user's monthly usage count
function getMonthlyUsage(userId) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM usage
    WHERE user_id = ? AND month = ? AND year = ?
  `);
  const result = stmt.get(userId, month, year);
  return result.count;
}

// Record PR analysis
function recordUsage(userId, prUrl, repoName, prNumber) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const stmt = db.prepare(`
    INSERT INTO usage (user_id, pr_url, repo_name, pr_number, month, year)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(userId, prUrl, repoName, prNumber, month, year);
}

// Get user's stats
function getUserStats(userId) {
  const totalPRs = db.prepare('SELECT COUNT(*) as count FROM usage WHERE user_id = ?').get(userId);
  const monthlyUsage = getMonthlyUsage(userId);

  const now = new Date();
  const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId);
  const limit = user?.tier === 'free' ? parseInt(process.env.FREE_TIER_LIMIT || 5) : -1;

  return {
    totalPRs: totalPRs.count,
    monthlyUsage: monthlyUsage,
    tier: user?.tier || 'free',
    limit: limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - monthlyUsage)
  };
}

// Update user tier
function updateUserTier(userId, tier) {
  const stmt = db.prepare('UPDATE users SET tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  return stmt.run(tier, userId);
}

// Create or update subscription
function upsertSubscription(userId, stripeCustomerId, stripeSubscriptionId, status, plan, periodEnd) {
  const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ?').get(userId);

  if (existing) {
    const stmt = db.prepare(`
      UPDATE subscriptions
      SET stripe_customer_id = ?,
          stripe_subscription_id = ?,
          status = ?,
          plan = ?,
          current_period_end = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    return stmt.run(stripeCustomerId, stripeSubscriptionId, status, plan, periodEnd, userId);
  } else {
    const stmt = db.prepare(`
      INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(userId, stripeCustomerId, stripeSubscriptionId, status, plan, periodEnd);
  }
}

// Get subscription by user ID
function getSubscriptionByUserId(userId) {
  const stmt = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?');
  return stmt.get(userId);
}

// Get subscription by Stripe subscription ID
function getSubscriptionByStripeId(stripeSubscriptionId) {
  const stmt = db.prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?');
  return stmt.get(stripeSubscriptionId);
}

// Cancel subscription
function cancelSubscription(userId) {
  const stmt = db.prepare(`
    UPDATE subscriptions
    SET status = 'canceled',
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);
  return stmt.run(userId);
}

module.exports = {
  db,
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
  cancelSubscription
};
