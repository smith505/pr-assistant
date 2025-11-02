// GitHub Diff Highlighter Module
// Injects color-coded highlights into GitHub's file diff view

console.log('🎨 Highlighter module loaded');

// Create global namespace for highlighter
window.prAssistantHighlighter = window.prAssistantHighlighter || {};

/**
 * Highlight critical code sections in GitHub's diff view
 * @param {Object} highlightData - Data about what to highlight
 * @param {Array} highlightData.criticalFiles - Files with critical changes
 * @param {Array} highlightData.securityPatterns - Security-related patterns found
 */
function highlightDiff(highlightData) {
  console.log('🎨 Starting diff highlighting with data:', highlightData);

  if (!highlightData || !highlightData.criticalFiles) {
    console.log('No highlight data provided');
    return;
  }

  // Wait for GitHub's diff view to load
  waitForDiffView().then(() => {
    applyHighlights(highlightData);
  });
}

/**
 * Wait for GitHub's diff view to be present in DOM
 */
function waitForDiffView() {
  return new Promise((resolve) => {
    // Check if diff view already exists
    const diffView = document.querySelector('#files');
    if (diffView) {
      console.log('✅ Diff view found');
      resolve();
      return;
    }

    // Otherwise, wait for it with MutationObserver
    console.log('⏳ Waiting for diff view to load...');
    const observer = new MutationObserver((mutations, obs) => {
      const diffView = document.querySelector('#files');
      if (diffView) {
        console.log('✅ Diff view loaded');
        obs.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      observer.disconnect();
      console.warn('⚠️ Diff view not found after 10 seconds');
      resolve();
    }, 10000);
  });
}

/**
 * Apply highlights to the diff view
 */
function applyHighlights(highlightData) {
  console.log('🎨 Applying highlights...');

  const { criticalFiles = [], securityPatterns = [] } = highlightData;

  // Get all file diffs
  const fileDiffs = document.querySelectorAll('.file');

  fileDiffs.forEach((fileDiff) => {
    const fileHeader = fileDiff.querySelector('.file-header');
    if (!fileHeader) return;

    // Get filename from header
    const fileNameEl = fileHeader.querySelector('[title]');
    const fileName = fileNameEl ? fileNameEl.getAttribute('title') : '';

    if (!fileName) return;

    console.log('📄 Processing file:', fileName);

    // Check if this file is critical
    const isCritical = criticalFiles.some(f => fileName.includes(f));

    if (isCritical) {
      highlightFileHeader(fileHeader, 'critical');
    }

    // Check for security patterns in this file
    const hasSecurityPattern = securityPatterns.some(pattern =>
      fileName.toLowerCase().includes(pattern.toLowerCase())
    );

    if (hasSecurityPattern) {
      highlightFileHeader(fileHeader, 'security');
      highlightSecurityLines(fileDiff);
    }

    // Highlight specific patterns in code
    highlightCodePatterns(fileDiff, fileName);
  });

  console.log('✅ Highlights applied');
}

/**
 * Highlight a file header based on severity
 */
function highlightFileHeader(header, severity) {
  const badge = document.createElement('span');
  badge.className = 'pr-assistant-badge';
  badge.style.cssText = `
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  `;

  if (severity === 'critical') {
    badge.textContent = '🔥 Critical';
    badge.style.backgroundColor = '#ff6b6b';
    badge.style.color = 'white';
  } else if (severity === 'security') {
    badge.textContent = '🛡️ Security';
    badge.style.backgroundColor = '#ff9800';
    badge.style.color = 'white';
  }

  // Insert badge after filename
  const fileInfo = header.querySelector('.file-info');
  if (fileInfo && !fileInfo.querySelector('.pr-assistant-badge')) {
    fileInfo.appendChild(badge);
  }
}

/**
 * Highlight lines with security-sensitive patterns
 */
function highlightSecurityLines(fileDiff) {
  const securityKeywords = [
    'password', 'secret', 'api_key', 'apikey', 'token',
    'auth', 'authentication', 'authorize', 'session',
    'login', 'signin', 'signout', 'logout',
    'encrypt', 'decrypt', 'hash', 'crypto',
    'private', 'public_key', 'private_key'
  ];

  const lines = fileDiff.querySelectorAll('.blob-code');

  lines.forEach((line) => {
    const codeText = line.textContent.toLowerCase();

    // Check if line contains security keywords
    const hasSecurityKeyword = securityKeywords.some(keyword =>
      codeText.includes(keyword)
    );

    if (hasSecurityKeyword) {
      // Only highlight added or modified lines (not removed)
      const isAddition = line.classList.contains('blob-code-addition');
      const isContext = line.classList.contains('blob-code-context');

      if (isAddition || isContext) {
        line.style.borderLeft = '3px solid #ff9800';
        line.style.backgroundColor = 'rgba(255, 152, 0, 0.1)';
        line.style.position = 'relative';

        // Add tooltip
        line.setAttribute('title', '⚠️ Security-sensitive code detected');
      }
    }
  });
}

/**
 * Highlight specific code patterns (auth, config, database, etc.)
 */
function highlightCodePatterns(fileDiff, fileName) {
  const patterns = [
    {
      keywords: ['config', 'configuration', 'settings', 'environment'],
      color: '#9c27b0',
      label: 'Config',
      severity: 'high'
    },
    {
      keywords: ['database', 'query', 'sql', 'mongodb', 'postgres'],
      color: '#2196f3',
      label: 'Database',
      severity: 'medium'
    },
    {
      keywords: ['api', 'endpoint', 'route', 'controller'],
      color: '#4caf50',
      label: 'API',
      severity: 'medium'
    },
    {
      keywords: ['TODO', 'FIXME', 'HACK', 'XXX'],
      color: '#f44336',
      label: 'TODO',
      severity: 'low'
    }
  ];

  const lines = fileDiff.querySelectorAll('.blob-code-addition');

  lines.forEach((line) => {
    const codeText = line.textContent.toLowerCase();

    patterns.forEach((pattern) => {
      const hasPattern = pattern.keywords.some(keyword =>
        codeText.includes(keyword.toLowerCase())
      );

      if (hasPattern) {
        // Don't override security highlighting
        if (!line.style.borderLeft) {
          const borderWidth = pattern.severity === 'high' ? '3px' : '2px';
          line.style.borderLeft = `${borderWidth} solid ${pattern.color}`;
          line.style.backgroundColor = `${pattern.color}15`; // 15 = ~8% opacity
          line.setAttribute('title', `💡 ${pattern.label} code detected`);
        }
      }
    });
  });
}

/**
 * Clear all highlights (useful for re-highlighting)
 */
function clearHighlights() {
  console.log('🧹 Clearing highlights...');

  // Remove badges
  document.querySelectorAll('.pr-assistant-badge').forEach(badge => badge.remove());

  // Reset line styles
  document.querySelectorAll('.blob-code').forEach(line => {
    line.style.borderLeft = '';
    line.style.backgroundColor = '';
    line.removeAttribute('title');
  });

  console.log('✅ Highlights cleared');
}

/**
 * Initialize highlighting system
 * Sets up observers for GitHub's async loading
 */
function initHighlighter() {
  console.log('🎨 Initializing highlighter...');

  // Observe for GitHub's async file loading
  const filesContainer = document.querySelector('#files');
  if (!filesContainer) {
    console.log('⏳ Files container not ready yet');
    return;
  }

  const observer = new MutationObserver((mutations) => {
    // GitHub loads files dynamically, re-highlight when new content appears
    const hasNewFiles = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node =>
        node.nodeType === 1 && node.classList && node.classList.contains('file')
      )
    );

    if (hasNewFiles) {
      console.log('📄 New files loaded, re-highlighting...');
      // Re-apply highlights with stored data
      const storedData = sessionStorage.getItem('pr-assistant-highlights');
      if (storedData) {
        applyHighlights(JSON.parse(storedData));
      }
    }
  });

  observer.observe(filesContainer, {
    childList: true,
    subtree: true
  });

  console.log('✅ Highlighter initialized with observer');
}

/**
 * Store highlight data for re-use (when GitHub dynamically loads files)
 */
function storeHighlightData(highlightData) {
  sessionStorage.setItem('pr-assistant-highlights', JSON.stringify(highlightData));
}

// Expose functions globally
window.prAssistantHighlighter.highlightDiff = highlightDiff;
window.prAssistantHighlighter.clearHighlights = clearHighlights;
window.prAssistantHighlighter.initHighlighter = initHighlighter;
window.prAssistantHighlighter.storeHighlightData = storeHighlightData;

console.log('✅ Highlighter functions exposed globally');
