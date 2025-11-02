// GitHub PR Review Assistant - Content Script
// Injected on GitHub PR pages to enhance the UI

console.log('🤖 PR Assistant: Content script loaded');

// Import highlighter module (loaded separately via manifest)
// highlighter.js provides: highlightDiff, clearHighlights, initHighlighter, storeHighlightData

// Helper: Safe chrome API calls (handles extension context invalidation)
function safeRuntimeMessage(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          console.log('⚠️ Extension was reloaded, message not sent');
          return;
        }
        console.error('Chrome runtime error:', chrome.runtime.lastError);
      }
      if (callback) callback(response);
    });
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log('⚠️ Extension context invalidated, skipping message');
    } else {
      console.error('Error sending message:', error);
    }
  }
}

// Check if we're on a PR page
function isPRPage() {
  return window.location.pathname.match(/\/pull\/\d+/);
}

// Time tracking variables
let sessionStartTime = null;
let isPageActive = true;
let totalActiveTime = 0;

// Main initialization
async function init() {
  if (!isPRPage()) {
    console.log('Not a PR page, skipping initialization');
    return;
  }

  console.log('PR page detected, initializing assistant...');

  // Check authentication
  const auth = await checkAuth();
  if (!auth) {
    console.log('Not authenticated, showing login prompt');
    injectLoginPrompt();
    return;
  }

  // Check settings
  const settings = await getSettings();

  // Inject UI panel
  await injectAssistantPanel();

  // Initialize highlighter system
  initializeHighlighter();

  // Start time tracking
  startTimeTracking();

  // Auto-analyze if enabled
  if (settings.autoAnalyze) {
    await analyzePR();
  }

  // Setup observers for SPA navigation
  setupNavigationObserver();
}

// Initialize the code highlighter
function initializeHighlighter() {
  // Check if highlighter module is loaded
  if (typeof window.prAssistantHighlighter !== 'undefined') {
    console.log('✅ Initializing highlighter system');
    window.prAssistantHighlighter.initHighlighter();
  } else {
    console.log('⚠️ Highlighter module not loaded yet');
  }
}

// Check if user is authenticated
async function checkAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['githubToken'], (result) => {
      resolve(!!result.githubToken);
    });
  });
}

// Get user settings
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve(result.settings || { autoAnalyze: false, showImpactScores: true });
    });
  });
}

// Inject login prompt for unauthenticated users
function injectLoginPrompt() {
  const existingPrompt = document.getElementById('pr-assistant-login');
  if (existingPrompt) return;

  const prompt = document.createElement('div');
  prompt.id = 'pr-assistant-login';
  prompt.className = 'pr-assistant-prompt';
  prompt.innerHTML = `
    <div class="pr-assistant-login-card">
      <h3>🤖 PR Assistant</h3>
      <p>Connect GitHub to get AI-powered PR summaries</p>
      <button id="pr-assistant-connect">Connect GitHub</button>
    </div>
  `;

  // Find the PR title area to inject
  const prHeader = document.querySelector('.gh-header-title');
  if (prHeader) {
    prHeader.parentElement.insertBefore(prompt, prHeader.nextSibling);
  }

  // Setup click handler
  document.getElementById('pr-assistant-connect').addEventListener('click', async () => {
    console.log('🔐 Connect button clicked, starting authentication...');

    // Show loading state on button
    const btn = document.getElementById('pr-assistant-connect');
    btn.disabled = true;
    btn.textContent = 'Connecting...';

    // Send authentication request
    chrome.runtime.sendMessage({ action: 'authenticate' }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Auth error:', chrome.runtime.lastError);
        btn.disabled = false;
        btn.textContent = 'Connect GitHub';
        return;
      }

      if (response && response.success) {
        console.log('✅ Authentication successful, re-initializing UI...');
        // Remove login prompt
        const loginPrompt = document.getElementById('pr-assistant-login');
        if (loginPrompt) {
          loginPrompt.remove();
        }
        // Inject the full assistant panel
        await injectAssistantPanel();
      } else {
        console.error('❌ Authentication failed:', response?.error);
        btn.disabled = false;
        btn.textContent = 'Connect GitHub';
        alert('Failed to authenticate with GitHub. Please try again.');
      }
    });
  });
}

// Inject the main assistant panel
async function injectAssistantPanel() {
  const existingPanel = document.getElementById('pr-assistant-panel');
  if (existingPanel) {
    console.log('Panel already exists, skipping injection');
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'pr-assistant-panel';
  panel.className = 'pr-assistant-panel';
  panel.innerHTML = `
    <div class="pr-assistant-header">
      <h3>🤖 AI Review Assistant</h3>
      <button id="pr-assistant-close" class="pr-assistant-btn-icon">×</button>
    </div>
    <div class="pr-assistant-body">
      <div id="pr-assistant-loading" class="pr-assistant-loading hidden">
        <div class="pr-assistant-spinner"></div>
        <p>Analyzing pull request...</p>
      </div>
      <div id="pr-assistant-summary" class="pr-assistant-summary hidden">
        <!-- Summary content will be inserted here -->
      </div>
      <div id="pr-assistant-error" class="pr-assistant-error hidden">
        <p>Failed to analyze PR. Please try again.</p>
        <button id="pr-assistant-retry" class="pr-assistant-btn">Retry</button>
      </div>
      <div id="pr-assistant-ready" class="pr-assistant-ready">
        <p>👆 Click "Analyze PR" to get AI-powered insights</p>
      </div>
    </div>
    <div class="pr-assistant-footer">
      <button id="pr-assistant-analyze" class="pr-assistant-btn-primary">Analyze PR</button>
      <button id="pr-assistant-settings" class="pr-assistant-btn-secondary">Settings</button>
    </div>
  `;

  // Inject into the PR conversation area - try multiple selectors
  let prConversation = document.querySelector('.discussion-timeline');

  // Fallback selectors if GitHub's structure changed
  if (!prConversation) {
    prConversation = document.querySelector('[data-target="conversation-timeline"]');
  }
  if (!prConversation) {
    prConversation = document.querySelector('#discussion_bucket');
  }
  if (!prConversation) {
    prConversation = document.querySelector('main');
  }

  if (!prConversation) {
    console.error('❌ Could not find suitable element to inject panel');
    return;
  }

  console.log('✅ Injecting panel into:', prConversation.className || prConversation.tagName);
  prConversation.insertBefore(panel, prConversation.firstChild);

  // Setup event listeners (only after panel is in DOM)
  document.getElementById('pr-assistant-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  document.getElementById('pr-assistant-analyze').addEventListener('click', () => {
    analyzePR();
  });

  document.getElementById('pr-assistant-settings').addEventListener('click', () => {
    safeRuntimeMessage({ action: 'openSettings' });
  });

  document.getElementById('pr-assistant-retry')?.addEventListener('click', () => {
    analyzePR();
  });
}

// Analyze the current PR
async function analyzePR() {
  console.log('🚀 Starting PR analysis...');

  // Show loading state
  showLoading();

  try {
    // Extract PR information
    const prData = extractPRData();
    console.log('📋 Extracted PR data:', prData);

    // Send to background script for analysis
    console.log('📤 Sending message to background worker...');
    chrome.runtime.sendMessage(
      {
        action: 'analyzePR',
        data: prData
      },
      (response) => {
        console.log('📥 Received response from background worker:', response);

        if (chrome.runtime.lastError) {
          console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
          showError(chrome.runtime.lastError.message);
          return;
        }

        if (response && response.success) {
          console.log('✅ Analysis successful, displaying summary...');
          displaySummary(response.data);

          // Apply code highlighting if data available
          applyCodeHighlighting(response.data);

          // Analytics now tracked in background.js
        } else {
          console.error('❌ Analysis failed:', response?.error);

          // Show upgrade prompt if limit reached
          if (response && response.limitReached) {
            showUpgradePrompt(response.error, response.upgradeUrl);
          } else {
            showError(response?.error || 'Unknown error occurred');
          }
        }
      }
    );
  } catch (error) {
    console.error('❌ Error analyzing PR:', error);
    showError(error.message);
  }
}

// Extract PR data from the current page
function extractPRData() {
  // Get PR number from URL
  const prMatch = window.location.pathname.match(/\/pull\/(\d+)/);
  const prNumber = prMatch ? prMatch[1] : null;

  // Get repository info
  const repoMatch = window.location.pathname.match(/\/([^\/]+)\/([^\/]+)/);
  const owner = repoMatch ? repoMatch[1] : null;
  const repo = repoMatch ? repoMatch[2] : null;

  // Get PR title
  const titleElement = document.querySelector('.js-issue-title');
  const title = titleElement ? titleElement.textContent.trim() : '';

  // Get PR description
  const descElement = document.querySelector('.comment-body');
  const description = descElement ? descElement.textContent.trim() : '';

  // Get file count
  const filesChangedElement = document.querySelector('#files_tab_counter');
  const filesChanged = filesChangedElement ? parseInt(filesChangedElement.textContent.trim()) : 0;

  // Try to get additions/deletions from the diffstat
  let additions = 0;
  let deletions = 0;

  // Look for the diff stats (usually in format "+123 −45")
  const diffStatElement = document.querySelector('.diffstat');
  if (diffStatElement) {
    const diffText = diffStatElement.textContent;
    const addMatch = diffText.match(/\+(\d+)/);
    const delMatch = diffText.match(/−(\d+)/);
    if (addMatch) additions = parseInt(addMatch[1]);
    if (delMatch) deletions = parseInt(delMatch[1]);
  }

  // Alternative: look for specific addition/deletion elements
  if (additions === 0 && deletions === 0) {
    const addElement = document.querySelector('.text-green');
    const delElement = document.querySelector('.text-red');
    if (addElement) {
      const addMatch = addElement.textContent.match(/\+(\d+)/);
      if (addMatch) additions = parseInt(addMatch[1]);
    }
    if (delElement) {
      const delMatch = delElement.textContent.match(/−(\d+)/);
      if (delMatch) deletions = parseInt(delMatch[1]);
    }
  }

  console.log('📊 Extracted stats:', { filesChanged, additions, deletions });

  return {
    owner,
    repo,
    prNumber,
    title,
    description,
    filesChanged,
    additions,
    deletions,
    url: window.location.href
  };
}

// Show loading state
function showLoading() {
  console.log('📊 Showing loading state...');
  document.getElementById('pr-assistant-loading').classList.remove('hidden');
  document.getElementById('pr-assistant-summary').classList.add('hidden');
  document.getElementById('pr-assistant-error').classList.add('hidden');
  document.getElementById('pr-assistant-ready')?.classList.add('hidden');
}

// Display AI summary
function displaySummary(data) {
  console.log('🎨 Displaying summary with data:', data);
  const summaryDiv = document.getElementById('pr-assistant-summary');

  // Build HTML sections
  let html = `
    <div class="pr-assistant-summary-section">
      <h4>📝 Summary</h4>
      <p>${data.summary}</p>
    </div>

    <div class="pr-assistant-summary-section">
      <h4>🎯 Key Changes</h4>
      <ul>
        ${data.keyChanges.map(change => `<li>${change}</li>`).join('')}
      </ul>
    </div>

    <div class="pr-assistant-summary-section">
      <h4>⚠️ Impact Assessment</h4>
      <div class="pr-assistant-impact-header">
        <div class="pr-assistant-impact-badge impact-${data.impactLevel}">
          ${data.impactLevel.toUpperCase()} IMPACT
        </div>
        <div class="pr-assistant-impact-score">
          <span class="score-label">Score:</span>
          <span class="score-value">${data.impactScore}/100</span>
          <span class="confidence-badge">${data.impactConfidence}% confidence</span>
        </div>
      </div>
      <p>${data.impactDescription}</p>
      ${data.impactExplanation ? `<p class="impact-explanation"><em>${data.impactExplanation}</em></p>` : ''}
    </div>
  `;

  // Add impact breakdown if available
  if (data.impactBreakdown) {
    html += `
    <div class="pr-assistant-summary-section pr-assistant-breakdown-section">
      <h4>📊 Impact Breakdown</h4>
      <div class="impact-breakdown">
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span class="breakdown-icon">📈</span>
            <span>Volume</span>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${data.impactBreakdown.volume}%"></div>
          </div>
          <div class="breakdown-value">${data.impactBreakdown.volume}</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span class="breakdown-icon">🔥</span>
            <span>Criticality</span>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${data.impactBreakdown.criticality}%"></div>
          </div>
          <div class="breakdown-value">${data.impactBreakdown.criticality}</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span class="breakdown-icon">🧩</span>
            <span>Complexity</span>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${data.impactBreakdown.complexity}%"></div>
          </div>
          <div class="breakdown-value">${data.impactBreakdown.complexity}</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span class="breakdown-icon">💥</span>
            <span>Blast Radius</span>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${data.impactBreakdown.blastRadius}%"></div>
          </div>
          <div class="breakdown-value">${data.impactBreakdown.blastRadius}</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span class="breakdown-icon">🔄</span>
            <span>Change Type</span>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${data.impactBreakdown.changeType}%"></div>
          </div>
          <div class="breakdown-value">${data.impactBreakdown.changeType}</div>
        </div>
      </div>
    </div>
    `;
  }

  // Add security patterns if present
  if (data.securityConcerns && data.securityConcerns.length > 0) {
    html += `
    <div class="pr-assistant-summary-section pr-assistant-security-section">
      <h4>🛡️ Security Patterns Detected</h4>
      <ul class="pr-assistant-alert-list">
        ${data.securityConcerns.map(concern => `<li>${concern}</li>`).join('')}
      </ul>
    </div>
    `;
  }

  // Add quality patterns if present
  if (data.qualityPatterns && data.qualityPatterns.length > 0) {
    html += `
    <div class="pr-assistant-summary-section pr-assistant-quality-section">
      <h4>✨ Quality Patterns Detected</h4>
      <ul class="pr-assistant-quality-list">
        ${data.qualityPatterns.map(pattern => `<li>${pattern}</li>`).join('')}
      </ul>
    </div>
    `;
  }

  // Add file categorization if present
  if (data.fileCategories && Object.keys(data.fileCategories).length > 0) {
    const categoryIcons = {
      security: '🛡️',
      config: '⚙️',
      database: '🗄️',
      core: '⚡',
      api: '🌐',
      frontend: '🎨',
      test: '🧪',
      docs: '📝',
      tooling: '🔧',
      other: '📄'
    };

    const categoryNames = {
      security: 'Security-sensitive',
      config: 'Configuration',
      database: 'Database',
      core: 'Core Logic',
      api: 'API/Interface',
      frontend: 'Frontend',
      test: 'Tests',
      docs: 'Documentation',
      tooling: 'Build/Tooling',
      other: 'Other'
    };

    html += `
    <div class="pr-assistant-summary-section">
      <h4>📂 File Categories</h4>
      <div class="file-categories">
        ${Object.entries(data.fileCategories).map(([category, files]) => `
          <div class="category-group">
            <div class="category-header">
              <span class="category-icon">${categoryIcons[category] || '📄'}</span>
              <span class="category-name">${categoryNames[category] || category}</span>
              <span class="category-count">${files.length}</span>
            </div>
            <div class="category-files">
              ${files.slice(0, 3).map(file => `<code>${file}</code>`).join('')}
              ${files.length > 3 ? `<span class="more-files">+${files.length - 3} more</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    `;
  }

  // Add potential issues if present
  if (data.potentialIssues && data.potentialIssues.length > 0) {
    html += `
    <div class="pr-assistant-summary-section">
      <h4>⚡ Potential Issues</h4>
      <ul class="pr-assistant-warning-list">
        ${data.potentialIssues.map(issue => `<li>${issue}</li>`).join('')}
      </ul>
    </div>
    `;
  }

  // Add critical files if present
  if (data.criticalFiles && data.criticalFiles.length > 0) {
    html += `
    <div class="pr-assistant-summary-section">
      <h4>🔥 Critical Files</h4>
      <ul class="pr-assistant-critical-files">
        ${data.criticalFiles.map(file => `<li><code>${file}</code></li>`).join('')}
      </ul>
    </div>
    `;
  }

  // Add review checklist
  html += `
    <div class="pr-assistant-summary-section">
      <h4>✅ Review Checklist</h4>
      <ul class="pr-assistant-checklist">
        ${data.checklist.map(item => `
          <li>
            <input type="checkbox" />
            <span>${item}</span>
          </li>
        `).join('')}
      </ul>
    </div>

    <div class="pr-assistant-attribution">
      <span class="attribution-text">Powered by ChatGPT</span>
    </div>
  `;

  summaryDiv.innerHTML = html;

  document.getElementById('pr-assistant-loading').classList.add('hidden');
  summaryDiv.classList.remove('hidden');
  document.getElementById('pr-assistant-error').classList.add('hidden');

  console.log('✅ Summary display complete');
}

// Show error state
function showError(message) {
  const errorDiv = document.getElementById('pr-assistant-error');
  errorDiv.querySelector('p').textContent = message || 'Failed to analyze PR. Please try again.';

  document.getElementById('pr-assistant-loading').classList.add('hidden');
  document.getElementById('pr-assistant-summary').classList.add('hidden');
  errorDiv.classList.remove('hidden');
}

// Show upgrade prompt when limit reached
function showUpgradePrompt(message, upgradeUrl) {
  const errorDiv = document.getElementById('pr-assistant-error');

  // Create upgrade prompt HTML
  const upgradeHTML = `
    <div class="upgrade-prompt">
      <div class="upgrade-icon">⚡</div>
      <div class="upgrade-content">
        <h3>Upgrade to Pro</h3>
        <p>${message}</p>
        <div class="upgrade-actions">
          <button id="upgrade-btn" class="btn-upgrade">View Plans & Upgrade</button>
          <button id="dismiss-upgrade" class="btn-secondary">Continue with Free</button>
        </div>
      </div>
    </div>
  `;

  errorDiv.innerHTML = upgradeHTML;

  // Add CSS for upgrade prompt
  if (!document.getElementById('upgrade-prompt-styles')) {
    const style = document.createElement('style');
    style.id = 'upgrade-prompt-styles';
    style.textContent = `
      .upgrade-prompt {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        color: white;
      }
      .upgrade-icon {
        font-size: 48px;
        line-height: 1;
      }
      .upgrade-content {
        flex: 1;
      }
      .upgrade-content h3 {
        font-size: 20px;
        margin: 0 0 8px 0;
        font-weight: 600;
      }
      .upgrade-content p {
        font-size: 14px;
        margin: 0 0 16px 0;
        opacity: 0.95;
      }
      .upgrade-actions {
        display: flex;
        gap: 12px;
      }
      .btn-upgrade {
        padding: 10px 20px;
        background: white;
        color: #667eea;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }
      .btn-upgrade:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
      }
      .btn-secondary {
        padding: 10px 20px;
        background: transparent;
        color: white;
        border: 2px solid white;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }
      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
  }

  // Show upgrade prompt
  document.getElementById('pr-assistant-loading').classList.add('hidden');
  document.getElementById('pr-assistant-summary').classList.add('hidden');
  errorDiv.classList.remove('hidden');

  // Setup event listeners
  document.getElementById('upgrade-btn')?.addEventListener('click', () => {
    safeRuntimeMessage({ action: 'openPricingPage' });
  });

  document.getElementById('dismiss-upgrade')?.addEventListener('click', () => {
    errorDiv.classList.add('hidden');
  });

  console.log('⚡ Upgrade prompt displayed');
}

// Apply code highlighting to GitHub's diff view
function applyCodeHighlighting(data) {
  console.log('🎨 Attempting to apply code highlighting...');

  // Check if highlighter is available
  if (typeof window.prAssistantHighlighter === 'undefined') {
    console.log('⚠️ Highlighter module not available');
    return;
  }

  // Prepare highlight data from analysis
  const highlightData = {
    criticalFiles: data.criticalFiles || [],
    securityPatterns: extractSecurityPatterns(data),
    fileCategories: data.fileCategories || {}
  };

  console.log('📊 Highlight data prepared:', highlightData);

  // Store for re-use when GitHub loads files dynamically
  window.prAssistantHighlighter.storeHighlightData(highlightData);

  // Apply highlights
  window.prAssistantHighlighter.highlightDiff(highlightData);
}

// Extract security patterns from AI analysis
function extractSecurityPatterns(data) {
  const patterns = [];

  // From security concerns
  if (data.securityConcerns && Array.isArray(data.securityConcerns)) {
    data.securityConcerns.forEach(concern => {
      // Extract keywords from concern text
      const keywords = ['auth', 'password', 'secret', 'token', 'key', 'security', 'encrypt'];
      keywords.forEach(keyword => {
        if (concern.toLowerCase().includes(keyword)) {
          patterns.push(keyword);
        }
      });
    });
  }

  // From file categories
  if (data.fileCategories && data.fileCategories.security) {
    patterns.push(...data.fileCategories.security);
  }

  // Remove duplicates
  return [...new Set(patterns)];
}

// Analytics tracking moved to background.js (trackAnalytics function)

// ============================================================================
// TIME TRACKING - Track active time spent on PR pages
// ============================================================================

function startTimeTracking() {
  sessionStartTime = Date.now();
  totalActiveTime = 0;
  isPageActive = true;

  console.log('⏱️ Started time tracking for PR session');

  // Track page visibility changes (tab switching, minimizing)
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Track window focus/blur (switching to other windows)
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);

  // Save time periodically (every 30 seconds)
  setInterval(saveActiveTime, 30000);

  // Save time before page unload
  window.addEventListener('beforeunload', saveActiveTime);
}

function handleVisibilityChange() {
  if (document.hidden) {
    isPageActive = false;
    saveActiveTime();
    console.log('⏸️ Page hidden - pausing time tracking');
  } else {
    isPageActive = true;
    sessionStartTime = Date.now();
    console.log('▶️ Page visible - resuming time tracking');
  }
}

function handleWindowBlur() {
  isPageActive = false;
  saveActiveTime();
  console.log('⏸️ Window blurred - pausing time tracking');
}

function handleWindowFocus() {
  isPageActive = true;
  sessionStartTime = Date.now();
  console.log('▶️ Window focused - resuming time tracking');
}

async function saveActiveTime() {
  if (!sessionStartTime) return;

  // Calculate elapsed time since last checkpoint
  const now = Date.now();
  const elapsed = Math.floor((now - sessionStartTime) / 1000); // seconds

  if (isPageActive && elapsed > 0) {
    totalActiveTime += elapsed;
  }

  sessionStartTime = now;

  // Save to analytics
  const prData = extractPRData();
  const repoKey = `${prData.owner}/${prData.repo}`;
  const prKey = `${repoKey}#${prData.prNumber}`;

  try {
    const result = await chrome.storage.local.get(['analytics', 'prSessions']);
    const analytics = result.analytics || { totals: { activeReviewTime: 0 } };
    const prSessions = result.prSessions || {};

    // Update total active review time
    if (!analytics.totals.activeReviewTime) {
      analytics.totals.activeReviewTime = 0;
    }
    analytics.totals.activeReviewTime += elapsed;

    // Track per-PR session time
    if (!prSessions[prKey]) {
      prSessions[prKey] = {
        totalTime: 0,
        sessions: [],
        repo: repoKey,
        prNumber: prData.prNumber,
        title: prData.title,
        firstVisit: new Date().toISOString(),
        lastVisit: new Date().toISOString()
      };
    }

    prSessions[prKey].totalTime += elapsed;
    prSessions[prKey].lastVisit = new Date().toISOString();

    // Add session entry if significant time (> 10 seconds)
    if (elapsed >= 10) {
      prSessions[prKey].sessions.push({
        date: new Date().toISOString(),
        duration: elapsed
      });

      // Keep only last 10 sessions per PR
      if (prSessions[prKey].sessions.length > 10) {
        prSessions[prKey].sessions = prSessions[prKey].sessions.slice(-10);
      }
    }

    // Clean old PR sessions (keep only last 50)
    const prKeys = Object.keys(prSessions);
    if (prKeys.length > 50) {
      // Sort by lastVisit and keep most recent 50
      const sorted = prKeys.sort((a, b) => {
        return new Date(prSessions[b].lastVisit) - new Date(prSessions[a].lastVisit);
      });
      sorted.slice(50).forEach(key => delete prSessions[key]);
    }

    await chrome.storage.local.set({ analytics, prSessions });
    console.log(`⏱️ Saved ${elapsed}s of active time (total: ${totalActiveTime}s this session)`);
  } catch (error) {
    // Gracefully handle extension context invalidated (happens on extension reload)
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.log('⚠️ Extension was reloaded, skipping time save');
      return;
    }
    console.error('❌ Error saving active time:', error);
  }
}

// Setup observer for GitHub SPA navigation
function setupNavigationObserver() {
  // GitHub uses a SPA architecture, so we need to detect page changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (isPRPage()) {
        console.log('Navigated to new PR page');
        init();
      }
    }
  }).observe(document.body, { subtree: true, childList: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
