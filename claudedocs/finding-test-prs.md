# Finding Appropriate Test PRs

Guide for selecting PRs that match test criteria for algorithm validation.

## GitHub Search Queries

### Test 1: Real Dependency Update

**Criteria**: Must modify package.json, yarn.lock, requirements.txt, or similar

**Search Queries**:
```
repo:facebook/react is:pr is:closed "package.json" -"devDependencies"
repo:vercel/next.js is:pr is:closed "update dependencies"
repo:microsoft/TypeScript is:pr is:closed "yarn.lock"
```

**How to Verify**:
1. Click "Files changed" tab
2. Confirm package.json or lock file is modified
3. Avoid PRs that only change devDependencies (those are tooling)

---

### Test 2: Pure Test Addition

**Criteria**: ALL changed files must be test files (*.test.js, *.spec.js, __tests__/)

**Search Queries**:
```
repo:facebook/react is:pr is:closed "add test" files:<10
repo:vuejs/vue is:pr is:closed "test coverage"
repo:angular/angular is:pr is:closed "spec" files:<5
```

**How to Verify**:
1. Click "Files changed" tab
2. Verify EVERY file is in test directory or has .test/.spec extension
3. NO production code changes allowed

**Red Flags**:
- ❌ Files in `src/` without `.test` extension
- ❌ Any file without `test`, `spec`, or `__tests__` in path
- ❌ Mixed test + production code changes

---

### Test 3: Large Feature

**Criteria**: High volume (500+ lines), architectural or major functionality

**Search Queries**:
```
repo:facebook/react is:pr is:closed additions:>500 -"test"
repo:vercel/next.js is:pr is:closed "feature" additions:>1000
repo:vuejs/vue is:pr is:closed "implement" additions:>700
```

**Good Examples**:
- New API implementations
- Architectural refactors
- Major component additions
- Framework features

**Avoid**:
- Bulk formatting changes
- Auto-generated code
- Dependency updates with large lock files

---

### Test 4: Small Bug Fix

**Criteria**: <100 lines changed, bug fix or minor improvement

**Search Queries**:
```
repo:facebook/react is:pr is:closed "fix" additions:<100
repo:vercel/next.js is:pr is:closed "bug" files:<5
repo:typescript-eslint/typescript-eslint is:pr is:closed "correct" additions:<50
```

**Good Examples**:
- Typo fixes
- Logic corrections
- Small edge case handling
- Off-by-one errors

**Avoid**:
- Test-only changes (use Test 2 for those)
- Documentation fixes (use Test 5)

---

### Test 5: Documentation Update

**Criteria**: Primarily .md files or documentation comments

**Search Queries**:
```
repo:facebook/react is:pr is:closed "docs" extension:md
repo:vercel/next.js is:pr is:closed "README"
repo:vuejs/vue is:pr is:closed "documentation" files:<10
```

**Good Examples**:
- README updates
- API documentation
- Code comment improvements
- Migration guides

**Acceptable Mixed**:
- Docs + minor code changes (as long as majority is docs)
- JSDoc comments + type definitions

---

## Quick Validation Checklist

Before using a PR for testing:

**For Dependency Updates (Test 1)**:
- [ ] Files changed includes package.json or lock file
- [ ] Not just devDependencies
- [ ] Reasonable size (not 10,000 line lock file)

**For Pure Tests (Test 2)**:
- [ ] ALL files are test files (100% test files)
- [ ] No production code mixed in
- [ ] Clear test additions or modifications

**For Large Features (Test 3)**:
- [ ] 500+ lines of real code (not lock files)
- [ ] Architectural or major feature
- [ ] Not bulk formatting/auto-generated

**For Small Bug Fixes (Test 4)**:
- [ ] <100 lines changed
- [ ] Actual bug fix or small improvement
- [ ] Not test-only or docs-only

**For Documentation (Test 5)**:
- [ ] Majority of changes in .md files or comments
- [ ] Clear documentation purpose
- [ ] Not code refactoring with incidental comments

---

## Alternative Repositories

If React repo doesn't have good examples:

**Enterprise Projects**:
- `microsoft/TypeScript`
- `microsoft/vscode`
- `angular/angular`

**Popular Frameworks**:
- `vercel/next.js`
- `vuejs/vue`
- `sveltejs/svelte`
- `remix-run/remix`

**Utility Libraries** (good for small fixes):
- `lodash/lodash`
- `date-fns/date-fns`
- `axios/axios`

---

## Common Pitfalls

**❌ Don't Use**:
- Dependabot automated PRs (often huge lock file changes)
- Merge commits or auto-generated updates
- PRs with mixed purposes (feature + refactor + tests)
- Very old PRs (pre-2023) - different patterns

**✅ Do Use**:
- Recently merged PRs (2024-2025)
- Clear single-purpose PRs
- PRs with good descriptions
- Medium-activity repos (not too quiet, not too busy)
