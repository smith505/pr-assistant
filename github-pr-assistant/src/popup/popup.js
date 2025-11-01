// GitHub PR Review Assistant - Popup Script (Analytics Dashboard)
// Loads and displays comprehensive usage analytics

document.addEventListener('DOMContentLoaded', async () => {
  await loadAnalytics();
  await loadSettings();
  setupEventListeners();

  // Listen for storage changes and reload analytics
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.analytics) {
      console.log('📊 Analytics updated, reloading...');
      loadAnalytics();
    }
  });
});

// Load and display analytics
async function loadAnalytics() {
  const result = await chrome.storage.local.get(['analytics']);
  const analytics = result.analytics || initializeEmptyAnalytics();

  console.log('📊 Loaded analytics:', analytics);

  // Fix undefined totals by calculating from history (backwards compatibility)
  if (typeof analytics.totals.prsAnalyzed === 'undefined' && analytics.history) {
    analytics.totals.prsAnalyzed = analytics.history.length;
  }
  if (typeof analytics.totals.timeSaved === 'undefined' && analytics.totals.prsAnalyzed) {
    analytics.totals.timeSaved = analytics.totals.prsAnalyzed * 15;
  }

  // Overall Statistics
  document.getElementById('total-analyzed').textContent = analytics.totals.prsAnalyzed || 0;

  const timeSaved = analytics.totals.timeSaved || 0;
  const hours = Math.floor(timeSaved / 60);
  const minutes = timeSaved % 60;
  document.getElementById('time-saved').textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Calculate average impact
  const avgImpact = calculateAverageImpact(analytics);
  document.getElementById('avg-impact').textContent = avgImpact;

  // High/Critical count
  const impactLevelsForCount = analytics.impactLevels || { high: 0, critical: 0 };
  const highImpactCount = (impactLevelsForCount.high || 0) + (impactLevelsForCount.critical || 0);
  document.getElementById('critical-count').textContent = highImpactCount;

  // This Week Stats
  const currentWeek = getCurrentWeekKey();
  const weekStats = (analytics.weekly && analytics.weekly[currentWeek]) || { analyzed: 0, highImpact: 0, securityIssues: 0 };
  document.getElementById('week-analyzed').textContent = weekStats.analyzed;
  document.getElementById('week-high-impact').textContent = weekStats.highImpact;
  document.getElementById('week-security').textContent = weekStats.securityIssues;

  // Impact Distribution
  const total = analytics.totals.prsAnalyzed || 1; // Avoid division by zero
  const impactLevels = analytics.impactLevels || { critical: 0, high: 0, medium: 0, low: 0 };

  updateImpactBar('critical', impactLevels.critical || 0, total);
  updateImpactBar('high', impactLevels.high || 0, total);
  updateImpactBar('medium', impactLevels.medium || 0, total);
  updateImpactBar('low', impactLevels.low || 0, total);

  // Top Repository
  const topRepo = getTopRepository(analytics.repositories || {});
  if (topRepo) {
    document.getElementById('top-repo').innerHTML = `
      <div class="repo-name">${topRepo.name}</div>
      <div class="repo-count">${topRepo.count} ${topRepo.count === 1 ? 'PR' : 'PRs'} analyzed</div>
    `;
  }

  // Pattern Insights
  const patterns = analytics.patterns || { securityIssues: 0, qualityPatterns: 0 };
  document.getElementById('security-total').textContent = patterns.securityIssues || 0;
  document.getElementById('quality-total').textContent = patterns.qualityPatterns || 0;
}

// Calculate average impact level
function calculateAverageImpact(analytics) {
  const levels = analytics.impactLevels || { critical: 0, high: 0, medium: 0, low: 0 };
  const total = analytics.totals.prsAnalyzed;

  if (total === 0) return '-';

  // Weight: critical=4, high=3, medium=2, low=1
  const weightedSum =
    (levels.critical || 0) * 4 +
    (levels.high || 0) * 3 +
    (levels.medium || 0) * 2 +
    (levels.low || 0) * 1;

  const avgWeight = weightedSum / total;

  if (avgWeight >= 3.5) return 'Critical';
  if (avgWeight >= 2.5) return 'High';
  if (avgWeight >= 1.5) return 'Medium';
  return 'Low';
}

// Update impact distribution bar
function updateImpactBar(level, count, total) {
  const percentage = Math.round((count / total) * 100);
  document.getElementById(`bar-${level}`).style.width = `${percentage}%`;
  document.getElementById(`count-${level}`).textContent = count;
}

// Get top repository by PR count
function getTopRepository(repositories) {
  const repos = Object.entries(repositories);
  if (repos.length === 0) return null;

  repos.sort((a, b) => b[1].count - a[1].count);
  return {
    name: repos[0][0],
    count: repos[0][1].count
  };
}

// Get current week key (Monday as start of week)
function getCurrentWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Initialize empty analytics structure
function initializeEmptyAnalytics() {
  return {
    totals: {
      prsAnalyzed: 0,
      timeSaved: 0,
      activeReviewTime: 0,
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

// Load user settings
async function loadSettings() {
  const result = await chrome.storage.local.get(['settings']);
  const settings = result.settings || { autoAnalyze: true };
  document.getElementById('auto-analyze').checked = settings.autoAnalyze;
}

// Setup event listeners
function setupEventListeners() {
  // Auto-analyze setting
  document.getElementById('auto-analyze').addEventListener('change', async (e) => {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    settings.autoAnalyze = e.target.checked;
    await chrome.storage.local.set({ settings });
    console.log('⚙️ Auto-analyze setting updated:', e.target.checked);
  });

  // Export CSV
  document.getElementById('export-csv').addEventListener('click', async () => {
    await exportData('csv');
  });

  // Export JSON
  document.getElementById('export-json').addEventListener('click', async () => {
    await exportData('json');
  });

  // Reset statistics
  document.getElementById('reset-stats').addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to reset all statistics? This cannot be undone.');
    if (confirmed) {
      await chrome.storage.local.remove(['analytics', 'prSessions']);
      await loadAnalytics();
      console.log('🔄 Statistics reset');
    }
  });
}

// Export analytics data
async function exportData(format) {
  try {
    const result = await chrome.storage.local.get(['analytics', 'prSessions']);
    const analytics = result.analytics || initializeEmptyAnalytics();
    const prSessions = result.prSessions || {};

    let content, filename, mimeType;

    if (format === 'csv') {
      content = generateCSV(analytics, prSessions);
      filename = `pr-assistant-analytics-${getDateString()}.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify({ analytics, prSessions }, null, 2);
      filename = `pr-assistant-analytics-${getDateString()}.json`;
      mimeType = 'application/json';
    }

    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`📥 Exported data as ${format.toUpperCase()}`);
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    alert('Failed to export data. See console for details.');
  }
}

// Generate CSV format
function generateCSV(analytics, prSessions) {
  const lines = [];

  // Header
  lines.push('GitHub PR Review Assistant - Analytics Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Overall Statistics
  lines.push('OVERALL STATISTICS');
  lines.push('Metric,Value');

  // Calculate from history if totals are missing
  const prsAnalyzed = analytics.totals.prsAnalyzed || (analytics.history ? analytics.history.length : 0);
  const timeSaved = analytics.totals.timeSaved || (prsAnalyzed * 15);

  lines.push(`Total PRs Analyzed,${prsAnalyzed}`);
  lines.push(`Time Saved (minutes),${timeSaved}`);

  const activeHours = analytics.totals.activeReviewTime ? Math.floor(analytics.totals.activeReviewTime / 3600) : 0;
  const activeMinutes = analytics.totals.activeReviewTime ? Math.floor((analytics.totals.activeReviewTime % 3600) / 60) : 0;
  lines.push(`Active Review Time,${activeHours}h ${activeMinutes}m`);
  lines.push(`Last Analysis,${analytics.totals.lastAnalyzedDate || 'Never'}`);
  lines.push('');

  // Impact Distribution
  lines.push('IMPACT DISTRIBUTION');
  lines.push('Level,Count');
  const impactLevels = analytics.impactLevels || { critical: 0, high: 0, medium: 0, low: 0 };
  lines.push(`Critical,${impactLevels.critical || 0}`);
  lines.push(`High,${impactLevels.high || 0}`);
  lines.push(`Medium,${impactLevels.medium || 0}`);
  lines.push(`Low,${impactLevels.low || 0}`);
  lines.push('');

  // Repository Statistics
  lines.push('REPOSITORY STATISTICS');
  lines.push('Repository,PR Count,First Analyzed,Last Analyzed');
  const repositories = analytics.repositories || {};
  Object.entries(repositories).forEach(([repo, data]) => {
    lines.push(`${repo},${data.count},${data.firstDate || 'N/A'},${data.lastDate || 'N/A'}`);
  });
  lines.push('');

  // Pattern Detection
  lines.push('PATTERN DETECTION');
  lines.push('Pattern Type,Count');
  const patterns = analytics.patterns || { securityIssues: 0, qualityPatterns: 0 };
  lines.push(`Security Issues,${patterns.securityIssues || 0}`);
  lines.push(`Quality Patterns,${patterns.qualityPatterns || 0}`);
  lines.push('');

  // Analysis History
  if (analytics.history && analytics.history.length > 0) {
    lines.push('ANALYSIS HISTORY');
    lines.push('Date,Repository,PR Number,Impact Level,Impact Score,Files Changed,Security Patterns,Quality Patterns');
    analytics.history.forEach(entry => {
      lines.push([
        entry.date,
        entry.repo,
        entry.prNumber,
        entry.impactLevel,
        entry.impactScore,
        entry.filesChanged,
        entry.securityPatterns,
        entry.qualityPatterns
      ].join(','));
    });
    lines.push('');
  }

  // PR Session Time Tracking
  if (Object.keys(prSessions).length > 0) {
    lines.push('PR SESSION TIME TRACKING');
    lines.push('PR,Repository,Title,Total Time (minutes),Sessions Count,First Visit,Last Visit');
    Object.entries(prSessions).forEach(([prKey, session]) => {
      const totalMinutes = Math.floor(session.totalTime / 60);
      lines.push([
        prKey,
        session.repo,
        `"${session.title.replace(/"/g, '""')}"`, // Escape quotes in CSV
        totalMinutes,
        session.sessions.length,
        session.firstVisit,
        session.lastVisit
      ].join(','));
    });
  }

  return lines.join('\n');
}

// Get date string for filename
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
