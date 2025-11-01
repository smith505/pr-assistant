// PR Assistant Options/Settings Page

console.log('⚙️ Options page loaded');

// Load settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadUserInfo();
  setupEventListeners();
});

// Load current settings from storage
async function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {
      autoAnalyze: false,
      showImpactScores: true,
      enableHighlighting: true,
      customKeywords: []
    };

    // Apply settings to UI
    document.getElementById('auto-analyze').checked = settings.autoAnalyze;
    document.getElementById('show-impact').checked = settings.showImpactScores;
    document.getElementById('enable-highlighting').checked = settings.enableHighlighting;

    if (settings.customKeywords && settings.customKeywords.length > 0) {
      document.getElementById('custom-keywords').value = settings.customKeywords.join('\n');
    }
  });
}

// Load user info
async function loadUserInfo() {
  chrome.storage.local.get(['githubUser', 'githubUserData'], (result) => {
    const userEl = document.getElementById('github-user');

    if (result.githubUser) {
      userEl.textContent = `Signed in as ${result.githubUser}`;
    } else {
      userEl.textContent = 'Not signed in';
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('save-btn').addEventListener('click', saveSettings);

  // Sign out button
  document.getElementById('signout-btn').addEventListener('click', signOut);

  // Upgrade button (placeholder)
  document.getElementById('upgrade-btn').addEventListener('click', () => {
    alert('Stripe integration coming in Day 2! For now, enjoy the free tier.');
  });

  // Auto-save on toggle change
  const toggles = document.querySelectorAll('.toggle input');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      saveSettings(true); // Auto-save = true
    });
  });
}

// Save settings
async function saveSettings(autoSave = false) {
  const settings = {
    autoAnalyze: document.getElementById('auto-analyze').checked,
    showImpactScores: document.getElementById('show-impact').checked,
    enableHighlighting: document.getElementById('enable-highlighting').checked,
    customKeywords: document.getElementById('custom-keywords').value
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)
  };

  chrome.storage.local.set({ settings }, () => {
    console.log('✅ Settings saved:', settings);

    if (!autoSave) {
      showSaveStatus('Settings saved successfully!');
    }
  });
}

// Show save status message
function showSaveStatus(message, isError = false) {
  const statusEl = document.getElementById('save-status');
  statusEl.textContent = message;
  statusEl.className = isError ? 'save-status error' : 'save-status';

  // Clear after 3 seconds
  setTimeout(() => {
    statusEl.textContent = '';
  }, 3000);
}

// Sign out
function signOut() {
  if (confirm('Are you sure you want to sign out? You\'ll need to re-authenticate to use the extension.')) {
    chrome.storage.local.clear(() => {
      console.log('🔓 User signed out');
      showSaveStatus('Signed out successfully. Please close this page and refresh GitHub.', false);

      // Update UI
      document.getElementById('github-user').textContent = 'Not signed in';

      // Disable toggles
      const toggles = document.querySelectorAll('.toggle input');
      toggles.forEach(toggle => toggle.checked = false);
    });
  }
}
