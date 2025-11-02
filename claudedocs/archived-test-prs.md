# Archived Test PRs

These test PRs were used during v2.1 and v2.2 development but did not match the intended test criteria.

## ❌ Why These Were Retired

The original test PRs didn't actually match the test categories:
- **Test 1 (#31035)**: Was test fixtures, NOT a package.json dependency update
- **Test 2 (#30969)**: Was production code for error logging, NOT pure test files
- **Test 4 (#30832)**: Was DevTools emoji changes (now useful for v2.3 visual testing)
- **Test 5 (#30289)**: Was DevTools component stack logging

## Original Test Suite (v2.1/v2.2)

### Test 1: #31035 (Test Fixtures - NOT Dependency Update)
- **URL**: https://github.com/facebook/react/pull/31035
- **Actual Type**: Test fixtures for dependency merging logic
- **v2.2 Score**: 37 MEDIUM
- **Issue**: Not a real dependency update

### Test 2: #30969 (Error Logging - NOT Pure Tests)
- **URL**: https://github.com/facebook/react/pull/30969
- **Actual Type**: DevTools error object naming
- **v2.2 Score**: 25 LOW
- **Issue**: Production code changes, not pure test files

### Test 3: #30684 (Server Components - KEPT)
- **URL**: https://github.com/facebook/react/pull/30684
- **Actual Type**: Large architectural feature ✅
- **v2.2 Score**: 50 MEDIUM (v2.3 should fix to 60 HIGH)
- **Status**: Still valid test case

### Test 4: #30832 (Emoji Change)
- **URL**: https://github.com/facebook/react/pull/30832
- **Actual Type**: Visual/cosmetic change (emoji symbol)
- **v2.2 Score**: 36 MEDIUM
- **Note**: Could be useful for visual change testing

### Test 5: #30289 (Component Stacks)
- **URL**: https://github.com/facebook/react/pull/30289
- **Actual Type**: DevTools stack logging
- **v2.2 Score**: 47 MEDIUM
- **Status**: Valid DevTools test case

## Lessons Learned

1. **Read PR descriptions carefully** - Don't assume from PR numbers
2. **Verify file changes match test criteria** - Check actual files modified
3. **DevTools PRs are common in React** - Need to filter for production code changes
4. **Test fixtures ≠ Production tests** - Compiler test fixtures aren't the same as unit tests

## New Test Requirements

Going forward, test PRs must match these strict criteria:

- **Dependency**: Must modify package.json, yarn.lock, or similar dependency files
- **Pure Tests**: ALL changed files must be in test directories or test files
- **Large Feature**: High volume (500+ lines) with architectural changes
- **Small Bug Fix**: <100 lines, bug fix or small improvement
- **Documentation**: Primarily .md files or documentation comments
