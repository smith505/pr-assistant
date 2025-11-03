// Authentication routes
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  getUserByEmail,
  createUser,
  getUserStats
} = require('../database');
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
    const existingUser = getUserByEmail(email);
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
    const userId = createUser(email, passwordHash, apiToken);

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
    const user = getUserByEmail(email);
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
router.get('/me', verifyToken, (req, res) => {
  try {
    const user = req.user;
    const stats = getUserStats(user.id);

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

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `No user found with email: ${email}`
      });
    }

    // Import database function
    const { db } = require('../database');

    // Calculate expiration (1 year from now)
    const activeUntil = new Date();
    activeUntil.setFullYear(activeUntil.getFullYear() + 1);

    // Update user to Pro tier
    const stmt = db.prepare(`
      UPDATE users
      SET tier = ?, active_until = ?
      WHERE id = ?
    `);

    stmt.run('pro', activeUntil.toISOString(), user.id);

    // Get updated user stats
    const stats = getUserStats(user.id);

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

module.exports = router;
