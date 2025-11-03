// Authentication middleware
const jwt = require('jsonwebtoken');

// Use PostgreSQL for production (Railway), SQLite for local development
const databaseModule = process.env.DATABASE_URL ? '../database' : '../database-sqlite';
const { getUserByToken, getMonthlyUsage } = require(databaseModule);

// Verify API token from request headers
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authorization token provided'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const user = getUserByToken(token);

  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authorization token'
    });
  }

  // Attach user to request
  req.user = user;
  next();
}

// Check usage limits based on user tier
function checkUsageLimit(req, res, next) {
  const user = req.user;
  const monthlyUsage = getMonthlyUsage(user.id);

  // Pro and Team tiers have unlimited usage
  if (user.tier === 'pro' || user.tier === 'team') {
    req.usageInfo = {
      usage: monthlyUsage,
      limit: -1,
      remaining: -1,
      tier: user.tier
    };
    return next();
  }

  // Free tier has limited usage
  const limit = parseInt(process.env.FREE_TIER_LIMIT || 5);

  if (monthlyUsage >= limit) {
    return res.status(429).json({
      error: 'Usage limit reached',
      message: `You have reached your monthly limit of ${limit} PR analyses`,
      usage: monthlyUsage,
      limit: limit,
      tier: user.tier,
      upgradeUrl: '/pricing'
    });
  }

  req.usageInfo = {
    usage: monthlyUsage,
    limit: limit,
    remaining: limit - monthlyUsage,
    tier: user.tier
  };

  next();
}

// Optional auth - doesn't fail if no token provided
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const user = getUserByToken(token);

  if (user) {
    req.user = user;
  }

  next();
}

module.exports = {
  verifyToken,
  checkUsageLimit,
  optionalAuth
};
