// Enhanced Impact Scoring System
// Multi-factor algorithm for PR risk assessment

/**
 * Calculate enhanced impact score with multiple factors
 * @param {Object} pr - Pull request data
 * @param {Array} files - Changed files
 * @param {Object} metadata - Change metadata (additions, deletions, changedFiles)
 * @returns {Object} Impact assessment with score, level, confidence, and breakdown
 */
export function calculateEnhancedImpact(pr, files, metadata) {
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
    level: getImpactLevel(finalScore), // Use rounded score for threshold comparison
    confidence: calculateConfidence(scores),
    breakdown: scores,
    explanation: generateExplanation(scores, finalScore)
  };
}

/**
 * Calculate volume score based on lines changed
 * Score: 0-100 (more changes = higher score)
 */
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

/**
 * Calculate criticality score based on file types and paths
 * Score: 0-100 (more critical files = higher score)
 * Adjusted to reduce over-scoring of routine changes
 */
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

/**
 * Calculate complexity score based on change patterns
 * Score: 0-100 (more complex = higher score)
 */
function calculateComplexityScore(files, metadata) {
  let complexityPoints = 0;

  // More files = more complexity
  if (metadata.changedFiles > 10) complexityPoints += 30;
  else if (metadata.changedFiles > 5) complexityPoints += 20;
  else if (metadata.changedFiles > 2) complexityPoints += 10;

  // Balance of additions vs deletions (refactors are complex)
  const changeRatio = metadata.additions / (metadata.deletions + 1);
  if (changeRatio > 3 || changeRatio < 0.33) {
    complexityPoints += 20; // Heavily skewed = likely major changes
  }

  // File type diversity
  const fileTypes = new Set(files.map(f => getFileExtension(f.filename)));
  if (fileTypes.size > 5) complexityPoints += 20;
  else if (fileTypes.size > 3) complexityPoints += 10;

  return Math.min(100, complexityPoints);
}

/**
 * Calculate blast radius (how many parts of codebase affected)
 * Score: 0-100 (more files = higher score)
 */
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

/**
 * Calculate context-aware blast radius with dampening for low-risk changes
 * Research finding: Documentation touching many files ≠ Code touching many files
 * Score: 0-100 (context-adjusted for actual risk)
 */
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

/**
 * Detect change type and assign base score
 * Score: 0-100 (riskier change types = higher score)
 */
function detectChangeType(pr, files) {
  const title = (pr.title || '').toLowerCase();
  const body = (pr.body || '').toLowerCase();
  const fullText = title + ' ' + body;

  // Breaking change (critical - 95)
  if (/\b(breaking|major|migration)\b/i.test(fullText)) {
    return 95;
  }

  // Security fix (critical - 90)
  if (/\b(security|vulnerability|cve)\b/i.test(fullText)) {
    return 90;
  }

  // Refactor (high risk - 70)
  if (/\b(refactor|restructure|rewrite|cleanup)\b/i.test(fullText)) {
    return 70;
  }

  // Feature (medium-high risk - 60, can be boosted by synergy)
  if (/\b(feature|feat|add|new|implement)\b/i.test(fullText)) {
    return 60;
  }

  // Enhancement (medium risk - 50)
  if (/\b(enhance|improve|update|upgrade)\b/i.test(fullText)) {
    return 50;
  }

  // Bug fix (medium-low risk - 35)
  if (/\b(fix|bug|issue|patch|resolve)\b/i.test(fullText)) {
    return 35;
  }

  // Documentation (low risk - 10)
  if (/\b(docs|documentation|readme)\b/i.test(fullText)) {
    return 10;
  }

  // Tests only (low risk - 20)
  if (files.every(f => /test|spec/.test(f.filename))) {
    return 20;
  }

  // Default (medium risk)
  return 40;
}

/**
 * Calculate synergistic change type score
 * Research finding: High-volume features are inherently higher risk
 * Boosts scores when volume and type combine for increased risk
 */
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

/**
 * Calculate confidence in the assessment
 * Returns: 0.0-1.0 (higher = more confident)
 */
function calculateConfidence(scores) {
  // More data points = higher confidence
  let confidence = 0.7; // Base confidence

  // Penalize if scores are inconsistent
  const scoreValues = Object.values(scores);
  const avg = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  const variance = scoreValues.reduce((sum, score) => {
    return sum + Math.pow(score - avg, 2);
  }, 0) / scoreValues.length;

  // High variance = lower confidence
  if (variance > 1000) confidence -= 0.2;
  else if (variance > 500) confidence -= 0.1;

  return Math.max(0.5, Math.min(1.0, confidence));
}

/**
 * Convert numeric score to impact level
 * Fixed thresholds based on testing:
 * - LOW: < 30 (small changes, docs, tests)
 * - MEDIUM: 30-59 (normal features, bug fixes)
 * - HIGH: >= 60 (major changes, breaking, security)
 */
function getImpactLevel(score) {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * Categorize file by path and name
 * Returns: { category, multiplier, description }
 */
export function categorizeFile(filename) {
  const lower = filename.toLowerCase();

  // Security & Auth (highest priority)
  if (/auth|security|permission|login|session|token|password|secret|key/.test(lower)) {
    return { category: 'security', multiplier: 2.0, description: 'Security-sensitive' };
  }

  // Configuration (very high priority)
  if (/config|\.env|settings|constants/.test(lower) || /\.(config|env|yaml|yml|toml)$/.test(lower)) {
    return { category: 'config', multiplier: 1.8, description: 'Configuration' };
  }

  // Database (high priority)
  if (/model|migration|schema|database|repository/.test(lower) || /\/models\/|\/migrations\//.test(lower)) {
    return { category: 'database', multiplier: 1.6, description: 'Database' };
  }

  // Core Business Logic (high priority)
  // Refined: only core src paths (not devtools/test src), or explicit service patterns
  if (/service|controller|manager|handler|processor/.test(lower) ||
      (/\/src\//.test(lower) && !/devtools|test|spec|__tests__|demo|example/.test(lower)) ||
      /\/lib\/|\/core\//.test(lower)) {
    return { category: 'core', multiplier: 1.5, description: 'Core logic' };
  }

  // API & Interfaces (medium-high priority)
  if (/api|route|endpoint|router|controller/.test(lower) || /\/api\/|\/routes\//.test(lower)) {
    return { category: 'api', multiplier: 1.4, description: 'API/Interface' };
  }

  // UI/Frontend (medium priority)
  if (/component|view|page|ui/.test(lower) || /\.(jsx|tsx|vue)$/.test(lower)) {
    return { category: 'frontend', multiplier: 1.0, description: 'Frontend' };
  }

  // Tests (lower priority)
  if (/test|spec|__tests__|\.test\.|\.spec\./.test(lower)) {
    return { category: 'test', multiplier: 0.5, description: 'Tests' };
  }

  // Documentation (lowest priority)
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

  // Build/tooling (low priority)
  if (/webpack|babel|rollup|vite|eslint|prettier|tsconfig/.test(lower)) {
    return { category: 'tooling', multiplier: 0.6, description: 'Build/Tooling' };
  }

  // Default
  return { category: 'other', multiplier: 1.0, description: 'Other' };
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(scores, finalScore) {
  const explanations = [];

  if (scores.volume > 70) {
    explanations.push(`Large volume of changes (${scores.volume} points)`);
  }
  if (scores.criticality > 60) {
    explanations.push('Modifies critical/security-sensitive files');
  }
  if (scores.complexity > 60) {
    explanations.push('High complexity or file diversity');
  }
  if (scores.blastRadius > 60) {
    explanations.push('Affects multiple parts of codebase');
  }
  if (scores.changeType > 70) {
    explanations.push('High-risk change type (refactor/breaking)');
  }

  if (explanations.length === 0) {
    explanations.push('Straightforward changes with limited scope');
  }

  return explanations.join('. ');
}

/**
 * Get file extension
 */
function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}
