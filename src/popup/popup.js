// GitHub PR Assistant - Popup Script
const BACKEND_URL = 'https://pr-assistant-production.up.railway.app';

// DOM Elements - Auth
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const btnUpgrade = document.getElementById('btn-upgrade');

// Check authentication status on load
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupEventListeners();
});

// Check if user is authenticated
async function checkAuth() {
  try {
    const result = await chrome.storage.local.get(['apiToken', 'userEmail']);

    if (result.apiToken) {
      // Verify token with backend
      const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${result.apiToken}` }
      });

      if (response.ok) {
        // Token is valid, show dashboard
        showDashboard();
        await loadUserData(result.apiToken);
      } else {
        // Token is invalid, clear and show auth
        await chrome.storage.local.remove(['apiToken', 'userEmail']);
        showAuth();
      }
    } else {
      // Not authenticated, show auth
      showAuth();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showAuth();
  }
}

// Show authentication section
function showAuth() {
  authSection.style.display = 'block';
  dashboardSection.style.display = 'none';
}

// Show dashboard section
function showDashboard() {
  authSection.style.display = 'none';
  dashboardSection.style.display = 'block';
}

// Setup event listeners
function setupEventListeners() {
  // Auth tabs
  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

  // Auth buttons
  btnLogin.addEventListener('click', handleLogin);
  btnRegister.addEventListener('click', handleRegister);
  btnLogout.addEventListener('click', handleLogout);

  // Upgrade button
  if (btnUpgrade) {
    btnUpgrade.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/pricing.html') });
    });
  }

  // Premium banner and button
  const premiumBanner = document.getElementById('premium-banner');
  const btnPremium = document.getElementById('btn-premium');
  if (premiumBanner) {
    premiumBanner.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/pricing.html') });
    });
  }
  if (btnPremium) {
    btnPremium.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent banner click
      chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/pricing.html') });
    });
  }

  // Enter key support for forms
  document.getElementById('login-email').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('login-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('register-email').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
  document.getElementById('register-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
  document.getElementById('register-password-confirm').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });

  // Stats functionality
  const resetStatsBtn = document.getElementById('reset-stats');
  if (resetStatsBtn) {
    resetStatsBtn.addEventListener('click', resetStats);
  }

  const autoAnalyze = document.getElementById('auto-analyze');
  if (autoAnalyze) {
    // Load saved setting
    chrome.storage.local.get(['autoAnalyze'], (result) => {
      autoAnalyze.checked = result.autoAnalyze || false;
    });

    autoAnalyze.addEventListener('change', () => {
      chrome.storage.local.set({ autoAnalyze: autoAnalyze.checked });
    });
  }
}

// Switch between login and register tabs
function switchTab(tab) {
  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    clearErrors();
  } else {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    clearErrors();
  }
}

// Handle login
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');

  if (!email || !password) {
    showError(errorDiv, 'Please enter email and password');
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = 'Logging in...';
  clearErrors();

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(errorDiv, data.message || 'Login failed');
      return;
    }

    // Store token and email
    await chrome.storage.local.set({
      apiToken: data.apiToken,
      userEmail: email
    });

    // Show dashboard
    showDashboard();
    await loadUserData(data.apiToken);

  } catch (error) {
    console.error('Login error:', error);
    showError(errorDiv, 'Network error. Is the backend running?');
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Login';
  }
}

// Handle registration
async function handleRegister() {
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;
  const errorDiv = document.getElementById('register-error');

  // Validation
  if (!email || !password || !passwordConfirm) {
    showError(errorDiv, 'Please fill in all fields');
    return;
  }

  if (password !== passwordConfirm) {
    showError(errorDiv, 'Passwords do not match');
    return;
  }

  if (password.length < 6) {
    showError(errorDiv, 'Password must be at least 6 characters');
    return;
  }

  btnRegister.disabled = true;
  btnRegister.textContent = 'Creating account...';
  clearErrors();

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(errorDiv, data.message || 'Registration failed');
      return;
    }

    // Store token and email
    await chrome.storage.local.set({
      apiToken: data.apiToken,
      userEmail: email
    });

    // Show dashboard
    showDashboard();
    await loadUserData(data.apiToken);

  } catch (error) {
    console.error('Registration error:', error);
    showError(errorDiv, 'Network error. Is the backend running?');
  } finally {
    btnRegister.disabled = false;
    btnRegister.textContent = 'Create Account';
  }
}

// Handle logout
async function handleLogout() {
  await chrome.storage.local.remove(['apiToken', 'userEmail']);
  showAuth();

  // Clear form fields
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('register-email').value = '';
  document.getElementById('register-password').value = '';
  document.getElementById('register-password-confirm').value = '';
}

// Load user data from backend
async function loadUserData(apiToken) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load user data');
    }

    const data = await response.json();
    console.log('User data loaded:', data); // Debug log

    // Update user info
    const emailElement = document.getElementById('user-email');
    console.log('Email element:', emailElement); // Debug log
    console.log('Setting email to:', data.user.email); // Debug log

    if (emailElement) {
      emailElement.textContent = data.user.email;
    } else {
      console.error('user-email element not found!');
    }

    document.getElementById('user-tier').textContent = data.user.tier.toUpperCase();

    // Update usage stats
    const usageCurrent = data.stats.monthlyUsage;
    const usageLimit = data.stats.limit === -1 ? '∞' : data.stats.limit;
    const usagePercentage = data.stats.limit === -1 ? 0 : (usageCurrent / data.stats.limit) * 100;

    document.getElementById('usage-current').textContent = usageCurrent;
    document.getElementById('usage-limit').textContent = usageLimit;
    document.getElementById('usage-bar-fill').style.width = `${Math.min(usagePercentage, 100)}%`;

    // Show upgrade prompt if limit reached
    const upgradePrompt = document.getElementById('upgrade-prompt');
    if (data.stats.remaining === 0 && data.user.tier === 'free') {
      upgradePrompt.style.display = 'block';
    } else {
      upgradePrompt.style.display = 'none';
    }

    // Show premium banner only for free tier users
    const premiumBanner = document.getElementById('premium-banner');
    if (premiumBanner) {
      if (data.user.tier === 'free') {
        premiumBanner.style.display = 'block';
      } else {
        premiumBanner.style.display = 'none';
      }
    }

    // Update tier badge styling
    const tierBadge = document.getElementById('user-tier');
    tierBadge.className = 'user-tier';
    tierBadge.classList.add(`tier-${data.user.tier}`);

    // Load analytics data
    await loadAnalytics();

  } catch (error) {
    console.error('Failed to load user data:', error);
  }
}

// Load analytics data
async function loadAnalytics() {
  try {
    const result = await chrome.storage.local.get(['prAnalyses']);
    const analyses = result.prAnalyses || [];

    updateStats(analyses);
  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}

// Update statistics display
function updateStats(analyses) {
  const total = analyses.length;
  document.getElementById('total-analyzed').textContent = total;

  if (total === 0) {
    document.getElementById('time-saved').textContent = '0h';
    document.getElementById('avg-impact').textContent = '-';
    document.getElementById('critical-count').textContent = '0';
    return;
  }

  // Calculate time saved (assume 30 min per PR)
  const timeSaved = Math.round(total * 0.5);
  document.getElementById('time-saved').textContent = `${timeSaved}h`;

  // Calculate average impact
  const avgImpact = analyses.reduce((sum, a) => sum + (a.impactScore || 0), 0) / total;
  document.getElementById('avg-impact').textContent = avgImpact.toFixed(1);

  // Count critical/high impact
  const criticalCount = analyses.filter(a => a.impactLevel === 'CRITICAL' || a.impactLevel === 'HIGH').length;
  document.getElementById('critical-count').textContent = criticalCount;

  // This week stats
  const weekStart = getWeekStart(new Date());
  const thisWeek = analyses.filter(a => new Date(a.timestamp) >= weekStart);

  document.getElementById('week-analyzed').textContent = thisWeek.length;
  document.getElementById('week-high-impact').textContent =
    thisWeek.filter(a => a.impactLevel === 'HIGH' || a.impactLevel === 'CRITICAL').length;
  document.getElementById('week-security').textContent =
    thisWeek.filter(a => a.patterns && a.patterns.security && a.patterns.security.length > 0).length;

  // Impact distribution
  const impactCounts = {
    CRITICAL: analyses.filter(a => a.impactLevel === 'CRITICAL').length,
    HIGH: analyses.filter(a => a.impactLevel === 'HIGH').length,
    MEDIUM: analyses.filter(a => a.impactLevel === 'MEDIUM').length,
    LOW: analyses.filter(a => a.impactLevel === 'LOW').length
  };

  const maxCount = Math.max(...Object.values(impactCounts), 1);

  document.getElementById('bar-critical').style.width = `${(impactCounts.CRITICAL / maxCount) * 100}%`;
  document.getElementById('bar-high').style.width = `${(impactCounts.HIGH / maxCount) * 100}%`;
  document.getElementById('bar-medium').style.width = `${(impactCounts.MEDIUM / maxCount) * 100}%`;
  document.getElementById('bar-low').style.width = `${(impactCounts.LOW / maxCount) * 100}%`;

  document.getElementById('count-critical').textContent = impactCounts.CRITICAL;
  document.getElementById('count-high').textContent = impactCounts.HIGH;
  document.getElementById('count-medium').textContent = impactCounts.MEDIUM;
  document.getElementById('count-low').textContent = impactCounts.LOW;
}

// Helper: Get week start date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Reset statistics
async function resetStats() {
  if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
    await chrome.storage.local.remove(['prAnalyses']);
    await loadAnalytics();
  }
}

// Show error message
function showError(element, message) {
  element.textContent = message;
  element.style.display = 'block';
}

// Clear all error messages
function clearErrors() {
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('register-error').style.display = 'none';
}
