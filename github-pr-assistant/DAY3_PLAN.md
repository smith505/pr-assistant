# Day 3 Plan - Core Features

**Goal**: Build advanced analysis features that provide deeper insights and track usage patterns.

---

## Feature 1: Enhanced Impact Scoring Algorithm

### Current State
- Simple scoring based only on file count and line changes
- Three levels: Low, Medium, High
- Basic thresholds (>500 lines or >15 files = high)

### Improvements
**Multi-factor scoring system**:
- **Change Volume**: Lines added/deleted (30%)
- **File Criticality**: Security, config, core vs tests (25%)
- **Change Complexity**: File types, patterns detected (20%)
- **Blast Radius**: Number of files affected (15%)
- **Change Type**: Refactor vs new feature vs bug fix (10%)

**Scoring Output**:
- Impact score: 0-100 scale
- Risk level: Critical (90+), High (70-89), Medium (40-69), Low (<40)
- Confidence: How certain we are about the assessment
- Breakdown: What contributed to the score

### Implementation
```javascript
function calculateEnhancedImpact(pr, files, metadata) {
  const scores = {
    volume: calculateVolumeScore(metadata),
    criticality: calculateCriticalityScore(files),
    complexity: calculateComplexityScore(files),
    blastRadius: calculateBlastRadiusScore(metadata),
    changeType: detectChangeType(pr, files)
  };

  const weightedScore =
    scores.volume * 0.30 +
    scores.criticality * 0.25 +
    scores.complexity * 0.20 +
    scores.blastRadius * 0.15 +
    scores.changeType * 0.10;

  return {
    score: Math.round(weightedScore),
    level: getImpactLevel(weightedScore),
    confidence: calculateConfidence(scores),
    breakdown: scores
  };
}
```

---

## Feature 2: Code Pattern Detection System

### Patterns to Detect

**Security Patterns** (High Priority):
- Authentication changes (login, auth, session)
- Authorization logic (permissions, roles, access)
- Cryptography (encrypt, decrypt, hash, salt)
- Input validation (sanitize, validate, escape)
- SQL queries (potential injection risks)
- API keys and secrets (hardcoded credentials)
- XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML)

**Quality Patterns** (Medium Priority):
- Error handling (try/catch, error boundaries)
- Null/undefined checks
- Testing patterns (test files, assertions)
- Documentation changes (README, comments)
- Configuration changes (.env, config files)

**Complexity Patterns** (Low Priority):
- Deep nesting (>3 levels)
- Long functions (>50 lines)
- Multiple responsibilities
- Cyclomatic complexity indicators

### Output Format
```javascript
{
  securityPatterns: [
    { type: 'auth', file: 'auth.js', line: 42, severity: 'high' },
    { type: 'sql', file: 'db.js', line: 108, severity: 'critical' }
  ],
  qualityPatterns: [
    { type: 'error_handling', file: 'api.js', line: 23, severity: 'medium' }
  ],
  complexityPatterns: [
    { type: 'deep_nesting', file: 'logic.js', line: 67, severity: 'low' }
  ]
}
```

---

## Feature 3: Smart File Categorization

### Categories

**Core Business Logic**:
- `/src/`, `/lib/`, `/core/`
- `*Service.js`, `*Controller.js`, `*Manager.js`
- Impact multiplier: 1.5x

**Security & Auth**:
- `auth*`, `security*`, `permission*`
- `login`, `session`, `token`
- Impact multiplier: 2.0x

**Configuration**:
- `config/`, `.env`, `*.config.js`
- `settings`, `constants`
- Impact multiplier: 1.8x

**API & Interfaces**:
- `/api/`, `/routes/`, `/controllers/`
- `*Router.js`, `*Endpoint.js`
- Impact multiplier: 1.4x

**Database**:
- `/models/`, `/migrations/`, `/schema/`
- `*Model.js`, `*Repository.js`
- Impact multiplier: 1.6x

**Tests**:
- `/test/`, `/tests/`, `/__tests__/`
- `*.test.js`, `*.spec.js`
- Impact multiplier: 0.5x (lower risk)

**Documentation**:
- `*.md`, `/docs/`
- Impact multiplier: 0.3x (lowest risk)

**UI/Frontend**:
- `/components/`, `/views/`, `/pages/`
- `*.jsx`, `*.vue`, `*.tsx`
- Impact multiplier: 1.0x (baseline)

---

## Feature 4: Review Analytics Dashboard

### Metrics to Track

**Usage Statistics**:
- Total PRs analyzed (all-time and last 30 days)
- Time saved (est. 15 min per PR)
- Average impact score
- Most analyzed repositories

**Pattern Insights**:
- Security issues found (count)
- Critical files modified (count)
- High-impact PRs (count and %)
- Common file types changed

**Performance Metrics**:
- Analysis speed (avg time)
- Success rate
- Cache hit rate (if caching implemented)

### Dashboard UI (in popup)
```
┌─────────────────────────────────┐
│    PR Review Assistant Stats    │
├─────────────────────────────────┤
│ 📊 PRs Analyzed:        47      │
│ ⏱️  Time Saved:       11h 45m    │
│ 🎯 Avg Impact:        Medium    │
│ 🔥 Critical PRs:      12 (26%)  │
├─────────────────────────────────┤
│    This Week                    │
│ ✅ Analyzed:           8        │
│ ⚠️  High Impact:       3        │
│ 🛡️  Security Issues:   2        │
├─────────────────────────────────┤
│ 🏆 Top Repository:              │
│    facebook/react (12 PRs)      │
└─────────────────────────────────┘
```

### Storage Schema
```javascript
{
  stats: {
    totalAnalyzed: 47,
    timeSaved: 705, // minutes
    lastAnalyzedDate: '2025-01-31',
    repositories: {
      'facebook/react': { count: 12, lastDate: '...' },
      'vercel/next.js': { count: 8, lastDate: '...' }
    }
  },
  history: [
    {
      date: '2025-01-31T10:30:00Z',
      repo: 'facebook/react',
      prNumber: 30875,
      impactScore: 35,
      impactLevel: 'low',
      patternsDetected: ['auth', 'config'],
      analysisTime: 1234 // ms
    }
  ]
}
```

---

## Implementation Order

1. **Enhanced Impact Scoring** (1-2 hours)
   - Build scoring algorithm
   - Add breakdown display in UI
   - Test with various PR sizes

2. **Pattern Detection** (2-3 hours)
   - Create pattern matching system
   - Add security pattern detection
   - Display patterns in analysis

3. **File Categorization** (1 hour)
   - Build categorization logic
   - Apply multipliers to impact score
   - Show categories in UI

4. **Analytics Dashboard** (2 hours)
   - Build tracking system
   - Create popup dashboard UI
   - Add data persistence

5. **Testing & Polish** (1 hour)
   - Test all features together
   - Fix bugs and edge cases
   - Update documentation

**Total Time Estimate**: 7-9 hours

---

## Success Criteria

✅ Impact scoring considers multiple factors, not just line count
✅ Security patterns are detected and highlighted
✅ Files are automatically categorized by risk level
✅ Analytics dashboard shows usage trends
✅ All data persists across sessions
✅ UI updates are clear and actionable
✅ Performance remains fast (<2 seconds for analysis)

---

## Notes

- All features work with mock data initially
- Pattern detection uses regex and heuristics (no AST parsing yet)
- Real API integration remains optional
- Focus on actionable insights, not overwhelming data
- Keep UI clean and scannable
