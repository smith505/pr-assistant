// Authentication routes
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Use PostgreSQL for production (Railway), SQLite for local development
const databaseModule = process.env.DATABASE_URL ? '../database' : '../database-sqlite';
const {
  getUserByEmail,
  createUser,
  getUserStats
} = require(databaseModule);
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate API token
    const apiToken = uuidv4();

    // Create user
    const userId = await createUser(email, passwordHash, apiToken);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: userId,
        email: email,
        tier: 'free'
      },
      apiToken: apiToken
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred while creating your account'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier
      },
      apiToken: user.api_token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred while logging in'
    });
  }
});

// Get current user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const stats = await getUserStats(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        createdAt: user.created_at
      },
      stats: stats
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user info'
    });
  }
});

// Verify token (for extension to check if token is valid)
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      tier: req.user.tier
    }
  });
});

// Admin endpoint to manually upgrade user to Pro (for testing/manual upgrades)
router.post('/upgrade-to-pro', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Email address is required'
      });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `No user found with email: ${email}`
      });
    }

    // Calculate expiration (1 year from now)
    const activeUntil = new Date();
    activeUntil.setFullYear(activeUntil.getFullYear() + 1);

    // Update user to Pro tier
    if (process.env.DATABASE_URL) {
      // PostgreSQL syntax
      const { pool } = require('../database');
      await pool.query(
        'UPDATE users SET tier = $1, active_until = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['pro', activeUntil, user.id]
      );
    } else {
      // SQLite syntax
      const { db } = require('../database-sqlite');
      const stmt = db.prepare('UPDATE users SET tier = ?, active_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run('pro', activeUntil.toISOString(), user.id);
    }

    // Get updated user stats
    const stats = await getUserStats(user.id);

    res.json({
      success: true,
      message: 'User upgraded to Pro tier successfully',
      user: {
        id: user.id,
        email: user.email,
        tier: 'pro',
        activeUntil: activeUntil.toISOString(),
        monthlyUsage: stats.monthlyUsage,
        limit: stats.limit
      }
    });

  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({
      error: 'Upgrade failed',
      message: 'An error occurred while upgrading user'
    });
  }
});

// Admin endpoint to delete a user (for cleaning up broken records)
router.post('/delete-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Email address is required'
      });
    }

    let deletedEmail;

    if (process.env.DATABASE_URL) {
      // PostgreSQL
      const { pool } = require('../database');
      await pool.query('DELETE FROM usage WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
      await pool.query('DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
      const result = await pool.query('DELETE FROM users WHERE email = $1 RETURNING email', [email]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'User not found',
          message: `No user found with email: ${email}`
        });
      }
      deletedEmail = result.rows[0].email;
    } else {
      // SQLite
      const { db } = require('../database-sqlite');
      const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: `No user found with email: ${email}`
        });
      }

      db.prepare('DELETE FROM usage WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM users WHERE email = ?').run(email);
      deletedEmail = user.email;
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      email: deletedEmail
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: 'An error occurred while deleting user'
    });
  }
});

module.exports = router;
