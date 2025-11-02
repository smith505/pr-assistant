// GitHub PR Review Assistant - Background Service Worker
// Handles API calls, authentication, and extension lifecycle

// Load subscription management module
importScripts('subscription.js');

// Configuration - Load from storage or use defaults
// IMPORTANT: Backend URL is required for PR analysis
const CONFIG = {
  github: {
    clientId: '', // Set in options
    clientSecret: '', // Set in options
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user'],
    apiBase: 'https://api.github.com'
  },
  backend: {
    apiUrl: 'http://localhost:3001', // Backend API URL
    apiToken: '' // User's API token (loaded from storage)
  },
  features: {
    realGitHubAuth: true,
    realAIAnalysis: true,
    stripePayments: false
  },
  isDevelopment: false
};

// Load configuration from storage on startup
chrome.storage.local.get(['apiConfig', 'apiToken', 'userEmail'], (result) => {
  if (result.apiConfig) {
    Object.assign(CONFIG.github, result.apiConfig.github || {});
  }
  if (result.apiToken) {
    CONFIG.backend.apiToken = result.apiToken;
    console.log('✅ API token loaded from storage');
  } else {
    console.log('⚠️ No API token found - user needs to login');
  }
});

console.log('🤖 PR Assistant: Background worker initialized');
if (CONFIG.features.realGitHubAuth && CONFIG.features.realAIAnalysis) {
  console.log('✅ Real APIs enabled - GitHub OAuth & OpenAI GPT-4');
} else {
  console.log('⚠️ Using mock mode (API keys not configured)');
}

// ============================================================================
// UTILITY FUNCTIONS - Impact Scoring & Pattern Detection
// ============================================================================

// Import would be: import { calculateEnhancedImpact, categorizeFile } from '../utils/impact-scoring.js';
// But service workers need inline or importScripts, so including key functions here

/**
 * Calculate enhanced impact score
 */
function calculateEnhancedImpact(pr, files, metadata) {
  const scores = {
    volume: calculateVolumeScore(metadata),
    criticality: calculateCriticalityScore(files),
    complexity: calculateComplexityScore(files, metadata),
    blastRadius: calculateContextAwareBlastRadius(files, metadata),
    changeType: calculateSynergisticChangeType(pr, files, metadata)
  };

  // Research-optimized weights (based on industry analysis)
  // Criticality 30%: Most important per SonarQube/CodeClimate patterns
  // Volume 25%: Size matters but less than criticality
  // Complexity 20%: Good balance indicator
  // Change Type 15%: Breaking vs feature vs docs makes big difference
  // Blast Radius 10%: Context-dependent, less reliable alone
  let weightedScore =
    scores.volume * 0.25 +
    scores.criticality * 0.30 +
    scores.complexity * 0.20 +
    scores.blastRadius * 0.10 +
    scores.changeType * 0.15;

  // Research finding: "Small size + hard difficulty = HIGH risk"
  // Boost small changes to critical files (dependencies, security, config)
  if (scores.volume < 40 && scores.criticality > 60) {
    weightedScore += 10; // Boost small but dangerous changes
  }

  // Pure test PRs should be capped lower
  const allTestFiles = files.every(f => /test|spec|__tests__/.test(f.filename));
  if (allTestFiles && scores.changeType === 20) {
    weightedScore = Math.min(25, weightedScore); // Cap at LOW range
  }

  const finalScore = Math.round(weightedScore);

  return {
    score: finalScore,
    level: getImpactLevelFromScore(finalScore), // Use rounded score for threshold comparison
    confidence: calculateConfidence(scores),
    breakdown: scores,
    explanation: generateExplanation(scores, finalScore)
  };
}

function calculateVolumeScore(metadata) {
  const totalChanges = metadata.additions + metadata.deletions;
  if (totalChanges === 0) return 0;
  if (totalChanges < 20) return 10;
  if (totalChanges < 50) return 25;
  if (totalChanges < 100) return 40;
  if (totalChanges < 200) return 55;
  if (totalChanges < 500) return 70;
  if (totalChanges < 1000) return 85;
  return 95;
}

function calculateCriticalityScore(files) {
  if (!files || files.length === 0) return 0;

  // v2.4 FIX: Weighted averaging by lines changed
  // Problem: Equal averaging treated 10-line test file same as 500-line production file
  // Solution: Weight each file's multiplier by its lines changed
  let totalWeightedScore = 0;
  let totalLines = 0;

  files.forEach(file => {
    const linesChanged = (file.additions || 0) + (file.deletions || 0);
    const category = categorizeFile(file.filename);
    totalWeightedScore += linesChanged * category.multiplier;
    totalLines += linesChanged;
  });

  // Calculate weighted average multiplier
  const weightedAvgMultiplier = totalLines > 0 ? totalWeightedScore / totalLines : 1.0;

  // Additional check: if all files are docs/tests/tooling, cap criticality at 25
  const allLowPriority = files.every(f => {
    const category = categorizeFile(f.filename);
    return category.multiplier <= 0.6;
  });
  if (allLowPriority) {
    return Math.min(25, Math.round(weightedAvgMultiplier * 50));
  }

  // v2.4 FIX: Restored ×50 scaling (from ×35)
  // ×35 was too conservative and prevented HIGH scores
  // ×50 is the correct scaling factor from original research
  return Math.min(100, Math.round(weightedAvgMultiplier * 50)); // 2.0 multiplier = 100 score
}

function calculateComplexityScore(files, metadata) {
  let complexityPoints = 0;
  if (metadata.changedFiles > 10) complexityPoints += 30;
  else if (metadata.changedFiles > 5) complexityPoints += 20;
  else if (metadata.changedFiles > 2) complexityPoints += 10;

  const changeRatio = metadata.additions / (metadata.deletions + 1);
  if (changeRatio > 3 || changeRatio < 0.33) {
    complexityPoints += 20;
  }

  const fileTypes = new Set(files.map(f => getFileExtension(f.filename)));
  if (fileTypes.size > 5) complexityPoints += 20;
  else if (fileTypes.size > 3) complexityPoints += 10;

  return Math.min(100, complexityPoints);
}

function calculateBlastRadiusScore(metadata) {
  const fileCount = metadata.changedFiles;
  if (fileCount === 0) return 0;
  if (fileCount === 1) return 15;
  if (fileCount <= 3) return 30;
  if (fileCount <= 5) return 45;
  if (fileCount <= 10) return 60;
  if (fileCount <= 20) return 75;
  if (fileCount <= 50) return 90;
  return 100;
}

function calculateContextAwareBlastRadius(files, metadata) {
  const rawBlastRadius = calculateBlastRadiusScore(metadata);

  // Check if ALL files are low-risk types (docs, tests, configs)
  const allLowRiskFiles = files.every(f => {
    const cat = categorizeFile(f.filename);
    return cat.multiplier <= 0.6; // docs (0.3), tests (0.5), tooling (0.6)
  });

  // Apply 50% dampening for low-risk file types
  // Rationale: Even if docs touch 50 files, actual failure risk is LOW
  if (allLowRiskFiles) {
    return Math.round(rawBlastRadius * 0.5);
  }

  return rawBlastRadius;
}

function detectChangeType(pr, files) {
  const title = (pr.title || '').toLowerCase();
  const body = (pr.body || '').toLowerCase();
  const fullText = title + ' ' + body;

  if (/\b(breaking|major|migration)\b/i.test(fullText)) return 95;
  if (/\b(security|vulnerability|cve)\b/i.test(fullText)) return 90;
  if (/\b(refactor|restructure|rewrite|cleanup)\b/i.test(fullText)) return 70;
  if (/\b(feature|feat|add|new|implement)\b/i.test(fullText)) return 60;
  if (/\b(enhance|improve|update|upgrade)\b/i.test(fullText)) return 50;
  if (/\b(fix|bug|issue|patch|resolve)\b/i.test(fullText)) return 35;
  if (/\b(docs|documentation|readme)\b/i.test(fullText)) return 10;
  if (files.every(f => /test|spec/.test(f.filename))) return 20;
  return 40;
}

function calculateSynergisticChangeType(pr, files, metadata) {
  const volumeScore = calculateVolumeScore(metadata);
  let baseTypeScore = detectChangeType(pr, files);

  // Synergy Rule 1: High-volume features (>700 lines) = major change
  // Boost from 60 → 80 (ensures HIGH territory)
  if (baseTypeScore === 60 && volumeScore > 70) {
    return 80;
  }

  // Synergy Rule 2: High-volume refactors (>850 lines) = architectural change
  // Boost from 70 → 80
  if (baseTypeScore === 70 && volumeScore > 85) {
    return 80;
  }

  // Synergy Rule 3: High-volume enhancements = feature-level
  // Boost from 50 → 60
  if (baseTypeScore === 50 && volumeScore > 75) {
    return 60;
  }

  return baseTypeScore;
}

function calculateConfidence(scores) {
  let confidence = 0.7;
  const scoreValues = Object.values(scores);
  const avg = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  const variance = scoreValues.reduce((sum, score) => {
    return sum + Math.pow(score - avg, 2);
  }, 0) / scoreValues.length;

  if (variance > 1000) confidence -= 0.2;
  else if (variance > 500) confidence -= 0.1;

  return Math.max(0.5, Math.min(1.0, confidence));
}

function getImpactLevelFromScore(score) {
  // Updated thresholds based on testing
  // LOW: < 30 (small changes, docs, tests)
  // MEDIUM: 30-59 (normal features, bug fixes)
  // HIGH: >= 60 (major changes, breaking, security)
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function categorizeFile(filename) {
  const lower = filename.toLowerCase();

  if (/auth|security|permission|login|session|token|password|secret|key/.test(lower)) {
    return { category: 'security', multiplier: 2.0, description: 'Security-sensitive' };
  }
  if (/config|\.env|settings|constants/.test(lower) || /\.(config|env|yaml|yml|toml)$/.test(lower)) {
    return { category: 'config', multiplier: 1.8, description: 'Configuration' };
  }
  if (/model|migration|schema|database|repository/.test(lower) || /\/models\/|\/migrations\//.test(lower)) {
    return { category: 'database', multiplier: 1.6, description: 'Database' };
  }
  // Refined: only core src paths (not devtools/test src), or explicit service patterns
  if (/service|controller|manager|handler|processor/.test(lower) ||
      (/\/src\//.test(lower) && !/devtools|test|spec|__tests__|demo|example/.test(lower)) ||
      /\/lib\/|\/core\//.test(lower)) {
    return { category: 'core', multiplier: 1.5, description: 'Core logic' };
  }
  if (/api|route|endpoint|router|controller/.test(lower) || /\/api\/|\/routes\//.test(lower)) {
    return { category: 'api', multiplier: 1.4, description: 'API/Interface' };
  }
  if (/component|view|page|ui/.test(lower) || /\.(jsx|tsx|vue)$/.test(lower)) {
    return { category: 'frontend', multiplier: 1.0, description: 'Frontend' };
  }
  if (/test|spec|__tests__|\.test\.|\.spec\./.test(lower)) {
    return { category: 'test', multiplier: 0.5, description: 'Tests' };
  }
  if (/\.md$|\/docs\/|readme|changelog/.test(lower)) {
    return { category: 'docs', multiplier: 0.3, description: 'Documentation' };
  }
  // Dependencies (high risk - research: small changes can break everything)
  if (/package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.json|requirements\.txt|Gemfile|Cargo\.toml/.test(lower)) {
    return { category: 'dependencies', multiplier: 1.7, description: 'Dependencies' };
  }
  // Visual/Styling (very low priority - cosmetic changes)
  // Check BEFORE DevTools to catch emoji/icon changes in DevTools
  if (/\.css$|\.scss$|\.sass$|\.less$|style|theme|icon|emoji|visual|symbol/.test(lower)) {
    return { category: 'visual', multiplier: 0.4, description: 'Visual/Styling' };
  }
  // DevTools Core Logic (renderer, store, backend, hooks)
  if ((/devtools|dev-tools/.test(lower)) && /renderer|store|backend|hook|fiber|reconcil/.test(lower)) {
    return { category: 'devtools-core', multiplier: 1.5, description: 'DevTools Core' };
  }
  // DevTools UI/Frontend (lower priority)
  if (/devtools|dev-tools|debugger|profiler|inspector/.test(lower)) {
    return { category: 'devtools', multiplier: 0.7, description: 'DevTools UI' };
  }
  if (/webpack|babel|rollup|vite|eslint|prettier|tsconfig/.test(lower)) {
    return { category: 'tooling', multiplier: 0.6, description: 'Build/Tooling' };
  }

  return { category: 'other', multiplier: 1.0, description: 'Other' };
}

function generateExplanation(scores, finalScore) {
  const explanations = [];
  if (scores.volume > 70) explanations.push(`Large volume of changes`);
  if (scores.criticality > 60) explanations.push('Critical files modified');
  if (scores.complexity > 60) explanations.push('High complexity');
  if (scores.blastRadius > 60) explanations.push('Wide-reaching changes');
  if (scores.changeType > 70) explanations.push('High-risk change type');

  if (explanations.length === 0) {
    explanations.push('Limited scope changes');
  }

  return explanations.join('. ');
}

function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

// Pattern Detection
function detectPatterns(files) {
  const patterns = {
    security: [],
    quality: [],
    complexity: []
  };

  files.forEach(file => {
    patterns.security.push(...detectSecurityPatterns(file));
    patterns.quality.push(...detectQualityPatterns(file));
  });

  return patterns;
}

function detectSecurityPatterns(file) {
  const patterns = [];
  const filename = file.filename.toLowerCase();
  const patch = (file.patch || '').toLowerCase();

  if (/auth|login|session|signin|signout/.test(filename) || /authenticate|authorization|auth\(|login\(/.test(patch)) {
    patterns.push({ type: 'auth', file: file.filename, severity: 'high', description: 'Authentication logic modified' });
  }
  if (/api[_-]?key|secret[_-]?key|password|token|credential/.test(patch)) {
    patterns.push({ type: 'credentials', file: file.filename, severity: 'critical', description: 'Potential credential reference' });
  }
  if (/select\s+.*from|insert\s+into|update\s+.*set|delete\s+from/.test(patch)) {
    patterns.push({ type: 'sql', file: file.filename, severity: 'high', description: 'SQL query - check injection risks' });
  }
  if (/encrypt|decrypt|hash|crypto|cipher|md5|sha[12]|bcrypt/.test(patch)) {
    patterns.push({ type: 'crypto', file: file.filename, severity: 'medium', description: 'Cryptographic operations' });
  }

  return patterns;
}

function detectQualityPatterns(file) {
  const patterns = [];
  const filename = file.filename.toLowerCase();
  const patch = (file.patch || '').toLowerCase();

  if (/try\s*{|catch\s*\(|\.catch\(/.test(patch)) {
    patterns.push({ type: 'error_handling', file: file.filename, severity: 'low', description: 'Error handling present' });
  }
  if (/test|spec|describe\(|it\(|expect\(/.test(filename) || /describe\(|it\(|test\(/.test(patch)) {
    patterns.push({ type: 'testing', file: file.filename, severity: 'low', description: 'Test coverage modified' });
  }
  if (/config|\.env|settings/.test(filename)) {
    patterns.push({ type: 'configuration', file: file.filename, severity: 'medium', description: 'Configuration modified' });
  }

  return patterns;
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
    // Initialize default settings
    chrome.storage.local.set({
      settings: {
        autoAnalyze: false,
        showImpactScores: true
      },
      subscriptionTier: 'free',
      usageLimit: 10,
      usageCount: 0,
      stats: {
        prsAnalyzed: 0,
        timeSaved: 0
      }
    });

    // Open welcome page
    chrome.tabs.create({ url: 'https://github-pr-assistant.com/welcome' });
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.action, 'from:', sender.tab?.id || 'popup');

  switch (request.action) {
    case 'authenticate':
      console.log('🔐 Starting authentication...');
      handleAuthentication().then(result => {
        console.log('🔐 Authentication result:', result);
        sendResponse(result);
      });
      return true; // Will respond asynchronously

    case 'analyzePR':
      console.log('🔍 Starting PR analysis for:', request.data);
      analyzePR(request.data).then(result => {
        console.log('🔍 PR analysis result:', result);
        sendResponse(result);
      }).catch(error => {
        console.error('❌ PR analysis error:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Will respond asynchronously

    case 'openSettings':
      console.log('⚙️ Opening settings...');
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      break;

    case 'openPricingPage':
      console.log('💳 Opening pricing page...');
      chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/pricing.html') });
      sendResponse({ success: true });
      break;

    case 'checkoutSuccess':
      console.log('✅ Checkout successful, updating subscription...');
      // In production, this would verify the session with backend
      // For now, simulate subscription upgrade
      globalThis.subscriptionManager.updateSubscription({
        tier: request.tier || 'pro',
        status: 'active',
        subscriptionId: request.sessionId
      }).then(() => {
        sendResponse({ success: true });
      });
      return true; // Will respond asynchronously
      break;

    default:
      console.warn('⚠️ Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Handle GitHub OAuth authentication
async function handleAuthentication() {
  try {
    console.log('Starting GitHub OAuth flow...');

    // Check if real OAuth is configured
    if (!CONFIG.features.realGitHubAuth || CONFIG.github.clientId === 'YOUR_GITHUB_CLIENT_ID') {
      console.log('⚠️ Real OAuth not configured. Using mock authentication.');
      return await mockAuthentication();
    }

    // Real GitHub OAuth flow using Chrome Identity API
    const redirectURL = chrome.identity.getRedirectURL();
    const clientId = CONFIG.github.clientId;
    const scopes = CONFIG.github.scopes.join(' ');

    // Build GitHub OAuth URL
    const authURL = new URL(CONFIG.github.authUrl);
    authURL.searchParams.set('client_id', clientId);
    authURL.searchParams.set('redirect_uri', redirectURL);
    authURL.searchParams.set('scope', scopes);
    authURL.searchParams.set('state', generateRandomString(32));

    console.log('Launching OAuth flow...');
    console.log('Redirect URL:', redirectURL);

    // Launch OAuth flow in browser
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authURL.toString(),
      interactive: true
    });

    // Extract authorization code from callback URL
    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');

    if (!code) {
      throw new Error('No authorization code received');
    }

    console.log('Authorization code received, exchanging for token...');

    // Exchange code for access token
    const tokenResponse = await fetch(CONFIG.github.tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: CONFIG.github.clientSecret,
        code: code,
        redirect_uri: redirectURL
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token in response');
    }

    console.log('Access token received, fetching user info...');

    // Fetch user information
    const userResponse = await fetch(`${CONFIG.github.apiBase}/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information');
    }

    const userData = await userResponse.json();

    // Store authentication data
    await chrome.storage.local.set({
      githubToken: accessToken,
      githubUser: userData.login,
      githubUserData: {
        id: userData.id,
        name: userData.name,
        avatar: userData.avatar_url,
        email: userData.email
      }
    });

    console.log('✅ Authentication successful:', userData.login);
    return { success: true, user: userData.login };

  } catch (error) {
    console.error('❌ Authentication failed:', error);
    return { success: false, error: error.message };
  }
}

// Mock authentication for development
async function mockAuthentication() {
  const fakeToken = 'ghp_' + generateRandomString(36);
  const fakeUser = 'developer';

  await chrome.storage.local.set({
    githubToken: fakeToken,
    githubUser: fakeUser,
    githubUserData: {
      id: 1,
      name: 'Developer',
      avatar: 'https://github.com/identicons/developer.png',
      email: 'developer@example.com'
    }
  });

  console.log('✅ Mock authentication successful');
  return { success: true, user: fakeUser, mock: true };
}

// Configuration is now loaded synchronously at the top
// No need for waitForConfig function

// Analyze a pull request
async function analyzePR(prData) {
  try {
    console.log('🔍 Analyzing PR:', prData);

    // Check subscription tier and usage limits
    console.log('📊 Checking subscription limits...');
    const subscription = await checkSubscriptionLimits();
    console.log('📊 Subscription status:', subscription);

    if (!subscription.allowed) {
      let errorMessage = 'Usage limit reached';

      if (subscription.reason === 'weekly_limit') {
        errorMessage = `You've used ${subscription.used} of ${subscription.limit} free analyses this week. Upgrade to Pro for unlimited analysis!`;
      } else if (subscription.reason === 'tier_limit') {
        errorMessage = `This feature requires ${subscription.requiredTier.toUpperCase()} tier. Please upgrade to continue.`;
      }

      return {
        success: false,
        error: errorMessage,
        limitReached: true,
        upgradeUrl: chrome.runtime.getURL('src/pages/pricing.html')
      };
    }

    // Get GitHub token
    console.log('🔑 Getting GitHub token...');
    const storage = await chrome.storage.local.get(['githubToken']);
    if (!storage.githubToken) {
      console.error('❌ No GitHub token found');
      return { success: false, error: 'Not authenticated' };
    }
    console.log('✅ GitHub token found');

    // Fetch PR details from GitHub API
    console.log('📡 Fetching PR details from GitHub API...');
    const prDetails = await fetchPRDetails(prData, storage.githubToken);
    console.log('✅ PR details fetched:', prDetails.metadata);

    // Generate AI summary
    console.log('🤖 Generating AI summary...');
    const aiAnalysis = await generateAISummary(prDetails);
    console.log('✅ AI analysis complete');

    // Track analytics
    console.log('📊 Tracking analytics...');
    await trackAnalytics(prData, aiAnalysis);
    console.log('✅ Analytics tracked');

    // Return the analysis
    return {
      success: true,
      data: aiAnalysis
    };
  } catch (error) {
    console.error('❌ Error analyzing PR:', error);
    return { success: false, error: error.message };
  }
}

// Check subscription limits using subscription manager
async function checkSubscriptionLimits() {
  try {
    // Check if user can analyze PRs
    const permission = await globalThis.subscriptionManager.canUseFeature('analyze');

    if (!permission.allowed) {
      console.warn('⛔ Analysis blocked:', permission.reason);
      return {
        allowed: false,
        reason: permission.reason,
        limit: permission.limit,
        used: permission.used
      };
    }

    // Increment usage counter
    await globalThis.subscriptionManager.incrementUsage('analyze');

    const tier = await globalThis.subscriptionManager.getCurrentTier();
    console.log(`✅ Analysis allowed for ${tier.name} tier`);

    return {
      allowed: true,
      tier: tier.id
    };
  } catch (error) {
    console.error('Subscription check failed:', error);
    // Fail open - allow analysis if subscription check fails
    return { allowed: true, tier: 'free' };
  }
}

// Fetch PR details from GitHub API
async function fetchPRDetails(prData, token) {
  const { owner, repo, prNumber } = prData;

  try {
    // Check if we're using a mock token
    const isMockToken = token.startsWith('ghp_') && token.length === 40;

    if (isMockToken) {
      console.log('⚠️ Using mock token, returning mock PR data');
      return generateMockPRDetails(prData);
    }

    // Fetch PR data
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!prResponse.ok) {
      console.error('❌ GitHub API error:', prResponse.status, prResponse.statusText);
      throw new Error(`Failed to fetch PR details: ${prResponse.status} ${prResponse.statusText}`);
    }

    const pr = await prResponse.json();

    // Fetch files changed
    const filesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!filesResponse.ok) {
      console.error('❌ GitHub API error (files):', filesResponse.status, filesResponse.statusText);
      throw new Error(`Failed to fetch PR files: ${filesResponse.status} ${filesResponse.statusText}`);
    }

    const files = await filesResponse.json();

    return {
      pr,
      files,
      metadata: {
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files
      }
    };
  } catch (error) {
    console.error('❌ Error fetching PR details:', error);
    throw error;
  }
}

// Generate mock PR details for testing
function generateMockPRDetails(prData) {
  const { title, description, filesChanged, additions, deletions, owner, repo, prNumber } = prData;

  console.log('🎭 Generating mock PR details using extracted data:', {
    title,
    filesChanged,
    additions,
    deletions,
    owner,
    repo,
    prNumber
  });

  // Use real data where available, with realistic fallbacks
  const numFiles = filesChanged || 5;
  const numAdditions = additions || numFiles * 30; // Use real or estimate ~30 lines per file
  const numDeletions = deletions || numFiles * 10; // Use real or estimate ~10 deletions per file

  return {
    pr: {
      title: title || 'Sample Pull Request',
      body: description || 'This is a sample PR for testing the extension',
      user: { login: owner || 'developer' },
      additions: numAdditions,
      deletions: numDeletions,
      changed_files: numFiles
    },
    files: generateMockFiles(title, numFiles, numAdditions, numDeletions),
    metadata: {
      additions: numAdditions,
      deletions: numDeletions,
      changedFiles: numFiles
    }
  };
}

// Generate mock files based on PR title and stats
function generateMockFiles(title, numFiles, additions, deletions) {
  // Determine file type based on PR title keywords
  const isDevTools = /devtools/i.test(title);
  const isBackend = /api|server|backend/i.test(title);
  const isFrontend = /ui|component|frontend/i.test(title);
  const isTest = /test|testing/i.test(title);

  // Generate realistic file paths based on PR type
  const files = [];
  const avgAdditions = Math.floor(additions / numFiles);
  const avgDeletions = Math.floor(deletions / numFiles);

  for (let i = 0; i < Math.min(numFiles, 5); i++) {
    let filename, status;

    if (isDevTools) {
      const devToolsFiles = [
        'packages/react-devtools-shared/src/backend/renderer.js',
        'packages/react-devtools-shared/src/devtools/views/Components/Tree.js',
        'packages/react-devtools-core/src/backend.js',
        'packages/react-devtools/src/utils.js',
        'packages/react-devtools-shared/src/types.js'
      ];
      filename = devToolsFiles[i] || `packages/react-devtools-shared/src/file${i}.js`;
      status = i === 0 ? 'modified' : 'modified';
    } else if (isBackend) {
      const backendFiles = [
        'src/server/api/routes.js',
        'src/server/middleware/auth.js',
        'src/server/controllers/user.js',
        'src/server/utils/database.js',
        'tests/server/api.test.js'
      ];
      filename = backendFiles[i] || `src/server/file${i}.js`;
      status = i < 2 ? 'modified' : (i === 2 ? 'added' : 'modified');
    } else {
      const genericFiles = [
        'src/index.js',
        'src/components/Main.js',
        'src/utils/helpers.js',
        'tests/unit.test.js',
        'README.md'
      ];
      filename = genericFiles[i] || `src/file${i}.js`;
      status = i === numFiles - 1 ? 'modified' : 'modified';
    }

    files.push({
      filename,
      status,
      additions: avgAdditions + (i === 0 ? additions % numFiles : 0),
      deletions: avgDeletions + (i === 0 ? deletions % numFiles : 0),
      changes: avgAdditions + avgDeletions,
      patch: `Mock patch data for ${filename}`
    });
  }

  return files;
}

// Generate AI summary using OpenAI GPT-4
async function generateAISummary(prDetails) {
  const { pr, files, metadata } = prDetails;

  // Check if real AI analysis is configured
  if (!CONFIG.features.realAIAnalysis) {
    console.log('⚠️ Real AI analysis disabled. Using mock analysis.');
    return generateMockAnalysis(pr, files, metadata);
  }

  try {
    console.log('🤖 Generating AI summary via backend...');
    const aiResponse = await callBackend(pr, files);

    // Calculate enhanced impact metrics (same as mock analysis)
    const enhancedImpact = calculateEnhancedImpact(pr, files, metadata);
    const criticalFiles = files.filter(f => isCriticalFile(f.filename)).map(f => f.filename);

    return {
      ...aiResponse,
      impactLevel: enhancedImpact.level,
      impactScore: enhancedImpact.score,
      impactConfidence: Math.round(enhancedImpact.confidence * 100),
      impactExplanation: enhancedImpact.explanation,
      impactBreakdown: enhancedImpact.breakdown,
      criticalFiles,
      metadata
    };
  } catch (error) {
    console.error('❌ Backend API error:', error);

    // Handle specific error types
    if (error.message.startsWith('NOT_AUTHENTICATED')) {
      // User not logged in - return error that will trigger login prompt
      throw new Error('Please login to analyze PRs. Click the extension icon to login or register.');
    }

    if (error.message.startsWith('USAGE_LIMIT')) {
      // Usage limit reached - return error with upgrade prompt
      throw new Error('Monthly usage limit reached. Please upgrade to Pro for unlimited analyses.');
    }

    // For other errors, fall back to mock analysis
    console.log('⚠️ Falling back to mock analysis');
    return generateMockAnalysis(pr, files, metadata);
  }
}

// Generate mock analysis (temporary for development)
function generateMockAnalysis(pr, files, metadata) {
  // Use enhanced impact scoring
  const enhancedImpact = calculateEnhancedImpact(pr, files, metadata);

  // Detect patterns
  const patterns = detectPatterns(files);

  // Categorize files
  const categorizedFiles = files.map(f => ({
    ...f,
    category: categorizeFile(f.filename)
  }));

  // Get critical files (security or config)
  const criticalFiles = categorizedFiles
    .filter(f => ['security', 'config'].includes(f.category.category))
    .map(f => f.filename);

  // Build key changes list
  const keyChanges = [
    `Modified ${metadata.changedFiles} ${metadata.changedFiles === 1 ? 'file' : 'files'}`,
    `Added ${metadata.additions} lines of code`,
    `Removed ${metadata.deletions} lines of code`
  ];

  // Add top changed files
  files.slice(0, 2).forEach(f => {
    const cat = categorizeFile(f.filename);
    keyChanges.push(`${cat.description}: ${f.filename}`);
  });

  const analysis = {
    summary: `This pull request "${pr.title}" modifies ${metadata.changedFiles} ${metadata.changedFiles === 1 ? 'file' : 'files'}. The changes include ${metadata.additions} additions and ${metadata.deletions} deletions across the codebase.`,

    keyChanges: keyChanges.filter(Boolean),

    // Enhanced impact
    impactLevel: enhancedImpact.level,
    impactScore: enhancedImpact.score,
    impactConfidence: Math.round(enhancedImpact.confidence * 100),
    impactExplanation: enhancedImpact.explanation,
    impactBreakdown: enhancedImpact.breakdown,

    impactDescription: getEnhancedImpactDescription(enhancedImpact, metadata),

    // Pattern detection results
    securityConcerns: patterns.security.map(p => `${p.description} (${p.file})`),
    qualityPatterns: patterns.quality.map(p => `${p.description} (${p.file})`),

    checklist: generateSmartChecklist(enhancedImpact, patterns, categorizedFiles),

    criticalFiles: criticalFiles,

    // File categorization
    fileCategories: categorizedFiles.reduce((acc, f) => {
      const cat = f.category.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(f.filename);
      return acc;
    }, {})
  };

  return analysis;
}

// Generate smart checklist based on analysis
function generateSmartChecklist(impact, patterns, files) {
  const checklist = ['Review all changed files for logic errors'];

  // Add security checks if relevant
  if (patterns.security.length > 0 || impact.breakdown.criticality > 60) {
    checklist.push('🛡️ Verify security implications and access controls');
  }

  // Add test checks
  const hasTests = files.some(f => f.category.category === 'test');
  if (!hasTests && files.length > 2) {
    checklist.push('⚠️ Consider adding test coverage for new code');
  } else if (hasTests) {
    checklist.push('✅ Review test coverage and assertions');
  }

  // Add documentation check
  const hasDocs = files.some(f => f.category.category === 'docs');
  if (!hasDocs && impact.score > 50) {
    checklist.push('📝 Update documentation for significant changes');
  }

  // Add performance check for large changes
  if (impact.breakdown.volume > 60) {
    checklist.push('⚡ Validate performance implications');
  }

  // Add database check
  if (files.some(f => f.category.category === 'database')) {
    checklist.push('🗄️ Review database schema and migration safety');
  }

  return checklist;
}

// Enhanced impact description
function getEnhancedImpactDescription(impact, metadata) {
  const level = impact.level.toUpperCase();
  const score = impact.score;
  const confidence = Math.round(impact.confidence * 100);

  return `${level} IMPACT (Score: ${score}/100, Confidence: ${confidence}%) - ${impact.explanation}`;
}

// Calculate impact level based on changes
function calculateImpactLevel(metadata) {
  const totalChanges = metadata.additions + metadata.deletions;
  const filesChanged = metadata.changedFiles;

  if (totalChanges > 500 || filesChanged > 15) {
    return 'high';
  } else if (totalChanges > 100 || filesChanged > 5) {
    return 'medium';
  } else {
    return 'low';
  }
}

// Get impact description
function getImpactDescription(level, metadata) {
  const descriptions = {
    high: `High-impact changes detected with ${metadata.changedFiles} files modified and ${metadata.additions + metadata.deletions} total lines changed. Requires thorough review.`,
    medium: `Medium-impact changes with ${metadata.changedFiles} files modified. Standard review process recommended.`,
    low: `Low-impact changes with ${metadata.changedFiles} files modified. Quick review should be sufficient.`
  };

  return descriptions[level];
}

// Check if file is critical (security, auth, config, etc.)
function isCriticalFile(filename) {
  const criticalPatterns = [
    /auth/i,
    /security/i,
    /config/i,
    /\.env/,
    /secret/i,
    /password/i,
    /token/i,
    /key/i,
    /payment/i,
    /billing/i
  ];

  return criticalPatterns.some(pattern => pattern.test(filename));
}

// Helper function to generate random string
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefshijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Enhanced Analytics Tracking
async function trackAnalytics(prData, analysisResult) {
  try {
    const result = await chrome.storage.local.get(['analytics']);
    const analytics = result.analytics || initializeAnalytics();

    // Ensure all required properties exist (for backwards compatibility)
    if (!analytics.totals) analytics.totals = { prsAnalyzed: 0, timeSaved: 0, activeReviewTime: 0, lastAnalyzedDate: null };
    // Ensure individual totals properties exist (handle legacy data)
    if (typeof analytics.totals.prsAnalyzed === 'undefined') analytics.totals.prsAnalyzed = 0;
    if (typeof analytics.totals.timeSaved === 'undefined') analytics.totals.timeSaved = 0;
    if (typeof analytics.totals.activeReviewTime === 'undefined') analytics.totals.activeReviewTime = 0;

    if (!analytics.repositories) analytics.repositories = {};
    if (!analytics.impactLevels) analytics.impactLevels = { low: 0, medium: 0, high: 0, critical: 0 };
    if (!analytics.patterns) analytics.patterns = { securityIssues: 0, qualityPatterns: 0 };
    if (!analytics.weekly) analytics.weekly = {};
    if (!analytics.history) analytics.history = [];

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const weekStart = getWeekStart(now).toISOString().split('T')[0];

    // Update totals
    analytics.totals.prsAnalyzed += 1;
    analytics.totals.timeSaved += 15; // 15 minutes per PR
    analytics.totals.lastAnalyzedDate = now.toISOString();

    // Update repositories
    const repoKey = `${prData.owner}/${prData.repo}`;
    if (!analytics.repositories[repoKey]) {
      analytics.repositories[repoKey] = {
        count: 0,
        lastDate: null,
        firstDate: now.toISOString()
      };
    }
    analytics.repositories[repoKey].count += 1;
    analytics.repositories[repoKey].lastDate = now.toISOString();

    // Update impact levels
    const impactLevel = analysisResult.impactLevel || 'low';
    analytics.impactLevels[impactLevel] = (analytics.impactLevels[impactLevel] || 0) + 1;

    // Update patterns detected
    const securityCount = (analysisResult.securityConcerns || []).length;
    const qualityCount = (analysisResult.qualityPatterns || []).length;
    analytics.patterns.securityIssues += securityCount;
    analytics.patterns.qualityPatterns += qualityCount;

    // Update weekly stats
    if (!analytics.weekly[weekStart]) {
      analytics.weekly[weekStart] = {
        analyzed: 0,
        highImpact: 0,
        securityIssues: 0
      };
    }
    analytics.weekly[weekStart].analyzed += 1;
    if (impactLevel === 'high' || impactLevel === 'critical') {
      analytics.weekly[weekStart].highImpact += 1;
    }
    analytics.weekly[weekStart].securityIssues += securityCount;

    // Add to history (keep last 100 entries)
    analytics.history.push({
      date: now.toISOString(),
      repo: repoKey,
      prNumber: prData.prNumber,
      impactScore: analysisResult.impactScore || 0,
      impactLevel: impactLevel,
      securityPatterns: securityCount,
      qualityPatterns: qualityCount,
      filesChanged: prData.filesChanged || 0
    });

    // Keep only last 100 entries
    if (analytics.history.length > 100) {
      analytics.history = analytics.history.slice(-100);
    }

    // Clean old weekly stats (keep last 8 weeks)
    const weekKeys = Object.keys(analytics.weekly).sort();
    if (weekKeys.length > 8) {
      weekKeys.slice(0, -8).forEach(key => delete analytics.weekly[key]);
    }

    await chrome.storage.local.set({ analytics });
    console.log('📊 Analytics updated:', analytics);
  } catch (error) {
    console.error('Failed to track analytics:', error);
  }
}

function initializeAnalytics() {
  return {
    totals: {
      prsAnalyzed: 0,
      timeSaved: 0, // in minutes
      lastAnalyzedDate: null
    },
    repositories: {},
    impactLevels: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    patterns: {
      securityIssues: 0,
      qualityPatterns: 0
    },
    weekly: {},
    history: []
  };
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
}

// Call Backend API for PR analysis
async function callBackend(pr, files) {
  console.log('🔄 Calling backend API for PR analysis...');

  // Check if user is logged in
  if (!CONFIG.backend.apiToken) {
    throw new Error('NOT_AUTHENTICATED: Please login to analyze PRs');
  }

  // Prepare file summaries (limit to avoid token overflow)
  const fileSummaries = files.slice(0, 20).map(file => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch || 'No patch available'
  }));

  try {
    const response = await fetch(`${CONFIG.backend.apiUrl}/api/pr/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.backend.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pr: {
          title: pr.title,
          description: pr.body || 'No description provided',
          url: pr.html_url,
          repo: pr.base.repo.full_name,
          number: pr.number
        },
        files: fileSummaries
      })
    });

    const data = await response.json();

    // Handle errors
    if (!response.ok) {
      // Usage limit reached
      if (response.status === 429) {
        throw new Error(`USAGE_LIMIT: ${data.message || 'Monthly usage limit reached. Please upgrade to Pro.'}`);
      }
      // Authentication failed
      if (response.status === 401) {
        throw new Error(`NOT_AUTHENTICATED: ${data.message || 'Invalid or expired token. Please login again.'}`);
      }
      // Other errors
      throw new Error(`BACKEND_ERROR: ${data.message || data.error || 'Backend API error'}`);
    }

    console.log('✅ Backend analysis complete');
    console.log(`📊 Usage: ${data.usage.monthly}/${data.usage.limit === -1 ? 'unlimited' : data.usage.limit}`);

    // Parse the analysis text into the expected JSON format
    // The backend returns raw text analysis, we need to convert it to JSON format
    const analysisText = data.analysis;

    // Try to extract structured data or return formatted text
    const analysis = {
      summary: extractSection(analysisText, 'Summary') || analysisText.substring(0, 200),
      keyChanges: extractListItems(analysisText, 'Key Changes') || [],
      impactDescription: extractSection(analysisText, 'Impact') || 'See analysis for details',
      checklist: extractListItems(analysisText, 'Testing') || extractListItems(analysisText, 'Review') || [],
      potentialIssues: extractListItems(analysisText, 'Issues') || extractListItems(analysisText, 'Concerns') || [],
      securityConcerns: extractListItems(analysisText, 'Security') || [],
      rawAnalysis: analysisText,
      usage: data.usage
    };

    return analysis;

  } catch (error) {
    console.error('❌ Backend API call failed:', error);
    throw error;
  }
}

// Helper function to extract sections from analysis text
function extractSection(text, sectionName) {
  const regex = new RegExp(`\\*\\*${sectionName}\\*\\*:?\\s*([^\\n*]+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// Helper function to extract list items from analysis text
function extractListItems(text, sectionName) {
  const sectionRegex = new RegExp(`\\*\\*${sectionName}[^:]*\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i');
  const sectionMatch = text.match(sectionRegex);

  if (!sectionMatch) return null;

  const sectionText = sectionMatch[1];
  const items = sectionText.match(/[-•]\s*([^\n]+)/g);

  return items ? items.map(item => item.replace(/^[-•]\s*/, '').trim()) : null;
}
