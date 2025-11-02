// Code Pattern Detection System
// Identifies security risks, quality issues, and complexity patterns

/**
 * Detect patterns in changed files
 * @param {Array} files - Changed files with patches
 * @returns {Object} Detected patterns by category
 */
export function detectPatterns(files) {
  const patterns = {
    security: [],
    quality: [],
    complexity: []
  };

  files.forEach(file => {
    // Security patterns
    patterns.security.push(...detectSecurityPatterns(file));

    // Quality patterns
    patterns.quality.push(...detectQualityPatterns(file));

    // Complexity patterns
    patterns.complexity.push(...detectComplexityPatterns(file));
  });

  return {
    security: patterns.security,
    quality: patterns.quality,
    complexity: patterns.complexity,
    summary: generatePatternSummary(patterns)
  };
}

/**
 * Detect security-related patterns
 */
function detectSecurityPatterns(file) {
  const patterns = [];
  const filename = file.filename.toLowerCase();
  const patch = (file.patch || '').toLowerCase();

  // Authentication changes
  if (/auth|login|session|signin|signout/.test(filename) ||
      /authenticate|authorization|auth\(|login\(/.test(patch)) {
    patterns.push({
      type: 'auth',
      file: file.filename,
      severity: 'high',
      description: 'Authentication logic modified'
    });
  }

  // API keys / secrets
  if (/api[_-]?key|secret[_-]?key|password|token|credential/.test(patch)) {
    patterns.push({
      type: 'credentials',
      file: file.filename,
      severity: 'critical',
      description: 'Potential credential or API key reference'
    });
  }

  // SQL queries (injection risk)
  if (/select\s+.*from|insert\s+into|update\s+.*set|delete\s+from|exec\(|query\(/.test(patch)) {
    patterns.push({
      type: 'sql',
      file: file.filename,
      severity: 'high',
      description: 'SQL query detected - check for injection risks'
    });
  }

  // Cryptography
  if (/encrypt|decrypt|hash|crypto|cipher|md5|sha[12]|bcrypt/.test(patch)) {
    patterns.push({
      type: 'crypto',
      file: file.filename,
      severity: 'medium',
      description: 'Cryptographic operations modified'
    });
  }

  // Input validation
  if (/sanitize|validate|escape|xss|htmlspecialchars|dangerouslysetinnerhtml/.test(patch)) {
    patterns.push({
      type: 'input_validation',
      file: file.filename,
      severity: 'high',
      description: 'Input validation or XSS prevention code'
    });
  }

  // CORS / Security headers
  if (/cors|access-control|x-frame-options|content-security-policy|x-xss-protection/.test(patch)) {
    patterns.push({
      type: 'security_headers',
      file: file.filename,
      severity: 'medium',
      description: 'Security headers or CORS configuration'
    });
  }

  // File upload
  if (/upload|multipart|file\.save|fs\.write|createwritestream/.test(patch)) {
    patterns.push({
      type: 'file_upload',
      file: file.filename,
      severity: 'medium',
      description: 'File upload functionality - validate file types'
    });
  }

  // Environment variables
  if (/process\.env|dotenv|env\./.test(patch)) {
    patterns.push({
      type: 'env_vars',
      file: file.filename,
      severity: 'low',
      description: 'Environment variable usage'
    });
  }

  return patterns;
}

/**
 * Detect code quality patterns
 */
function detectQualityPatterns(file) {
  const patterns = [];
  const filename = file.filename.toLowerCase();
  const patch = (file.patch || '').toLowerCase();

  // Error handling
  if (/try\s*{|catch\s*\(|\.catch\(|error|exception/.test(patch)) {
    patterns.push({
      type: 'error_handling',
      file: file.filename,
      severity: 'low',
      description: 'Error handling code present'
    });
  }

  // Null/undefined checks
  if (/===\s*null|!==\s*null|===\s*undefined|typeof.*undefined|optional chaining|\?\.|nullish/.test(patch)) {
    patterns.push({
      type: 'null_checks',
      file: file.filename,
      severity: 'low',
      description: 'Null/undefined safety checks'
    });
  }

  // Testing
  if (/test|spec|describe\(|it\(|expect\(|assert/.test(filename) || /describe\(|it\(|test\(/.test(patch)) {
    patterns.push({
      type: 'testing',
      file: file.filename,
      severity: 'low',
      description: 'Test coverage added or modified'
    });
  }

  // Documentation
  if (/\/\*\*|@param|@returns|@description|readme/.test(patch) || /\.md$/.test(filename)) {
    patterns.push({
      type: 'documentation',
      file: file.filename,
      severity: 'low',
      description: 'Documentation updated'
    });
  }

  // Configuration changes
  if (/config|\.env|settings/.test(filename)) {
    patterns.push({
      type: 'configuration',
      file: file.filename,
      severity: 'medium',
      description: 'Configuration file modified'
    });
  }

  // TODO/FIXME comments
  if (/\/\/\s*todo|\/\/\s*fixme|\/\*\s*todo|\/\*\s*fixme/.test(patch)) {
    patterns.push({
      type: 'todos',
      file: file.filename,
      severity: 'low',
      description: 'TODO or FIXME comments added'
    });
  }

  // Deprecated API usage
  if (/deprecated|@deprecated/.test(patch)) {
    patterns.push({
      type: 'deprecated',
      file: file.filename,
      severity: 'medium',
      description: 'Deprecated API usage or warnings'
    });
  }

  return patterns;
}

/**
 * Detect complexity patterns
 */
function detectComplexityPatterns(file) {
  const patterns = [];
  const patch = file.patch || '';

  // Count nesting depth (approximate from indentation)
  const lines = patch.split('\n');
  let maxNesting = 0;
  let currentNesting = 0;

  lines.forEach(line => {
    if (/^\+/.test(line)) { // Only check added lines
      const indent = (line.match(/^\+(\s+)/) || ['', ''])[1].length;
      const nestingMarkers = (line.match(/[{(]/g) || []).length;
      currentNesting += nestingMarkers;
      maxNesting = Math.max(maxNesting, currentNesting);
      currentNesting -= (line.match(/[})]/g) || []).length;
    }
  });

  if (maxNesting > 4) {
    patterns.push({
      type: 'deep_nesting',
      file: file.filename,
      severity: 'medium',
      description: `Deep nesting detected (${maxNesting} levels)`
    });
  }

  // Long functions (>50 lines added)
  const addedLines = lines.filter(l => /^\+[^+]/.test(l)).length;
  if (addedLines > 50) {
    patterns.push({
      type: 'long_function',
      file: file.filename,
      severity: 'low',
      description: `Large code block (${addedLines} lines added)`
    });
  }

  // Multiple loops
  const loopCount = (patch.match(/\b(for|while|foreach|map|filter|reduce)\b/gi) || []).length;
  if (loopCount > 3) {
    patterns.push({
      type: 'multiple_loops',
      file: file.filename,
      severity: 'low',
      description: `Multiple iteration patterns (${loopCount} detected)`
    });
  }

  // Complex conditionals
  const conditionalCount = (patch.match(/\b(if|else|switch|case|\?|&&|\|\|)\b/gi) || []).length;
  if (conditionalCount > 5) {
    patterns.push({
      type: 'complex_logic',
      file: file.filename,
      severity: 'low',
      description: `Complex conditional logic (${conditionalCount} branches)`
    });
  }

  return patterns;
}

/**
 * Generate summary of detected patterns
 */
function generatePatternSummary(patterns) {
  const summary = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    categories: {
      security: patterns.security.length,
      quality: patterns.quality.length,
      complexity: patterns.complexity.length
    }
  };

  // Count by severity
  [...patterns.security, ...patterns.quality, ...patterns.complexity].forEach(pattern => {
    summary.total++;
    summary[pattern.severity]++;
  });

  return summary;
}

/**
 * Get icon for pattern type
 */
export function getPatternIcon(type) {
  const icons = {
    auth: '🔐',
    credentials: '🔑',
    sql: '🗄️',
    crypto: '🔒',
    input_validation: '🛡️',
    security_headers: '🌐',
    file_upload: '📁',
    env_vars: '⚙️',
    error_handling: '⚠️',
    null_checks: '✓',
    testing: '🧪',
    documentation: '📝',
    configuration: '⚙️',
    todos: '📌',
    deprecated: '⚠️',
    deep_nesting: '🔀',
    long_function: '📏',
    multiple_loops: '🔄',
    complex_logic: '🧩'
  };

  return icons[type] || '📊';
}

/**
 * Get severity badge class
 */
export function getSeverityClass(severity) {
  const classes = {
    critical: 'severity-critical',
    high: 'severity-high',
    medium: 'severity-medium',
    low: 'severity-low'
  };

  return classes[severity] || 'severity-low';
}

/**
 * Format patterns for display
 */
export function formatPatternsForDisplay(patterns) {
  const allPatterns = [
    ...patterns.security.map(p => ({ ...p, category: 'security' })),
    ...patterns.quality.map(p => ({ ...p, category: 'quality' })),
    ...patterns.complexity.map(p => ({ ...p, category: 'complexity' }))
  ];

  // Sort by severity: critical > high > medium > low
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allPatterns.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return allPatterns;
}
