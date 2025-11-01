# Review Analytics Implementation

**Status**: ✅ Complete
**Feature**: Comprehensive review time tracking and analytics dashboard
**Time Invested**: ~2 hours

---

## What Was Implemented

### 1. Active Time Tracking System

**File**: `src/scripts/content.js` (lines 14-17, 45-46, 633-751)

**Features**:
- Real-time tracking of active time spent on PR pages
- Automatic pause/resume on tab switching and window blur/focus
- Per-PR session tracking with history
- Periodic save (every 30 seconds) and before page unload
- Tracks total active review time across all PRs

**Implementation Details**:
```javascript
// Time tracking variables
let sessionStartTime = null;
let isPageActive = true;
let totalActiveTime = 0;

// Core tracking functions:
- startTimeTracking() - Initialize tracking system
- handleVisibilityChange() - Pause when tab hidden
- handleWindowBlur() - Pause when window loses focus
- handleWindowFocus() - Resume when window focused
- saveActiveTime() - Save accumulated time to storage
```

**Data Storage**:
```javascript
// Stored in chrome.storage.local
{
  analytics: {
    totals: {
      activeReviewTime: 0  // Total seconds across all PRs
    }
  },
  prSessions: {
    "owner/repo#123": {
      totalTime: 0,           // Total seconds for this PR
      sessions: [],           // Array of session entries
      repo: "owner/repo",
      prNumber: 123,
      title: "PR Title",
      firstVisit: "2025-01-01T...",
      lastVisit: "2025-01-01T..."
    }
  }
}
```

**Key Features**:
1. Only tracks time when page is active (not minimized/blurred)
2. Saves every 30 seconds to prevent data loss
3. Cleans old sessions (keeps last 50 PRs)
4. Per-session granularity (tracks individual review sessions)

---

### 2. Analytics Tracking (Already Implemented)

**File**: `src/scripts/background.js` (lines 996-1106)

**Existing Analytics**:
- Total PRs analyzed
- Time saved estimate (15 min/PR)
- Repository statistics
- Impact level distribution
- Pattern detection (security, quality)
- Weekly statistics
- Analysis history (last 100 entries)

**Data Tracked Per PR Analysis**:
```javascript
{
  date: ISO timestamp,
  repo: "owner/repo",
  prNumber: 123,
  impactScore: 0-100,
  impactLevel: "low|medium|high|critical",
  securityPatterns: count,
  qualityPatterns: count,
  filesChanged: count
}
```

---

### 3. Export Functionality

**Files Modified**:
- `src/popup/popup.html` (lines 140-147)
- `src/popup/popup.js` (lines 154-301)
- `src/popup/popup.css` (lines 295-319)

**Export Formats**:

#### CSV Export
- Comprehensive analytics report
- Sections:
  1. Overall Statistics
  2. Impact Distribution
  3. Repository Statistics
  4. Pattern Detection
  5. Analysis History
  6. PR Session Time Tracking
- Filename: `pr-assistant-analytics-YYYY-MM-DD.csv`

#### JSON Export
- Raw data dump of all analytics
- Includes `analytics` and `prSessions` objects
- Filename: `pr-assistant-analytics-YYYY-MM-DD.json`

**UI Implementation**:
```html
<div class="section">
  <h2>📥 Export Data</h2>
  <div class="export-buttons">
    <button id="export-csv">Export CSV</button>
    <button id="export-json">Export JSON</button>
  </div>
</div>
```

---

## Integration Points

### Content Script Integration

**Initialization Flow**:
```
Page Load → isPRPage() → init()
  ↓
startTimeTracking()
  ↓
Setup event listeners:
  - visibilitychange
  - blur/focus
  - setInterval(30s)
  - beforeunload
```

**Time Tracking Flow**:
```
User Active on PR
  ↓
Time accumulates in sessionStartTime
  ↓
Every 30 seconds OR visibility change:
  saveActiveTime()
    ↓
  Calculate elapsed time
    ↓
  Update analytics.totals.activeReviewTime
    ↓
  Update prSessions[prKey]
    ↓
  Save to chrome.storage.local
```

---

## Analytics Dashboard (Popup)

**File**: `src/popup/popup.html`

**Dashboard Sections**:
1. **Overall Statistics**
   - Total PRs Analyzed
   - Time Saved
   - Average Impact
   - High Impact Count

2. **This Week**
   - Analyzed this week
   - High impact this week
   - Security issues this week

3. **Impact Distribution**
   - Visual bars for Critical/High/Medium/Low
   - Count for each level

4. **Top Repository**
   - Most analyzed repository
   - PR count

5. **Pattern Insights**
   - Security issues detected
   - Quality patterns found

6. **Settings**
   - Auto-analyze toggle

7. **Export Data** (NEW)
   - Export CSV button
   - Export JSON button

---

## CSV Export Example

```csv
GitHub PR Review Assistant - Analytics Report
Generated: 2025-01-01T12:00:00.000Z

OVERALL STATISTICS
Metric,Value
Total PRs Analyzed,25
Time Saved (minutes),375
Active Review Time,2h 45m
Last Analysis,2025-01-01T11:45:00.000Z

IMPACT DISTRIBUTION
Level,Count
Critical,2
High,8
Medium,12
Low,3

REPOSITORY STATISTICS
Repository,PR Count,First Analyzed,Last Analyzed
facebook/react,15,2025-01-01T...,2025-01-01T...
vercel/next.js,10,2025-01-01T...,2025-01-01T...

PR SESSION TIME TRACKING
PR,Repository,Title,Total Time (minutes),Sessions Count,First Visit,Last Visit
facebook/react#30684,facebook/react,"Add support for...",45,3,2025-01-01T...,2025-01-01T...
```

---

## Data Retention & Cleanup

### Analytics History
- Keeps last 100 PR analyses
- Automatically prunes older entries

### Weekly Statistics
- Keeps last 8 weeks
- Automatically removes older weeks

### PR Sessions
- Keeps last 50 most recent PRs
- Sorts by `lastVisit` date
- Automatically prunes older sessions

### Session Entries Per PR
- Keeps last 10 sessions per PR
- Only saves sessions >= 10 seconds

---

## Performance Considerations

### Optimization Strategies

1. **Debounced Saves**: 30-second intervals prevent excessive writes
2. **Conditional Tracking**: Only tracks when page is active
3. **Efficient Storage**: Prunes old data automatically
4. **Batch Updates**: Single storage write per checkpoint

### Storage Impact
- Analytics: ~5-10KB for 100 entries
- PR Sessions: ~2-3KB for 50 PRs
- Total: ~10-15KB typical usage
- No impact on extension performance

---

## Testing Instructions

### Manual Test - Time Tracking

1. **Open PR Page**:
   ```
   https://github.com/facebook/react/pull/30684
   ```

2. **Verify Tracking Starts**:
   - Check console: "⏱️ Started time tracking for PR session"
   - Stay on page for 1 minute

3. **Test Pause/Resume**:
   - Switch tabs → Check console: "⏸️ Page hidden - pausing"
   - Return to tab → Check console: "▶️ Page visible - resuming"

4. **Check Data Saved**:
   - Wait 30 seconds for auto-save
   - Check console: "⏱️ Saved XXs of active time"

5. **Verify Storage**:
   - Open DevTools → Application → Storage → Local Storage
   - Find `chrome-extension://[id]`
   - Check `prSessions` key for your PR data

### Manual Test - Export

1. **Generate Some Analytics**:
   - Analyze 2-3 different PRs
   - Spend time on each PR page

2. **Open Popup**:
   - Click extension icon
   - Scroll to "Export Data" section

3. **Test CSV Export**:
   - Click "Export CSV"
   - Verify file downloads
   - Open in Excel/Google Sheets
   - Confirm data is readable

4. **Test JSON Export**:
   - Click "Export JSON"
   - Verify file downloads
   - Open in text editor
   - Confirm valid JSON structure

---

## Known Limitations

1. **Time Tracking Accuracy**
   - Granularity: 30-second checkpoints (not real-time)
   - Active detection: Based on visibility API (may not catch all scenarios)
   - Data loss: If browser crashes between checkpoints (max 30s lost)

2. **Storage Constraints**
   - Chrome storage quota: 5MB (unlikely to hit)
   - Automatic pruning prevents overflow

3. **Privacy**
   - All data stored locally (no server transmission)
   - Cleared on extension uninstall

---

## Future Enhancements (Not Implemented)

1. **Advanced Analytics**
   - Charts/graphs for time trends
   - Review velocity metrics
   - Team analytics aggregation

2. **Smart Insights**
   - "You spend most time on security PRs"
   - "Your average review time is 15 minutes"
   - Productivity recommendations

3. **Export Options**
   - PDF reports
   - Excel with formulas
   - Direct integration (Jira, Slack)

4. **Time Goals**
   - Set review time targets
   - Notifications when exceeding
   - Productivity streaks

---

## Completion Checklist

- ✅ Time tracking system implemented
- ✅ Active time detection (visibility/focus)
- ✅ Per-PR session tracking
- ✅ Periodic saves (30s)
- ✅ Analytics dashboard (already existed)
- ✅ CSV export functionality
- ✅ JSON export functionality
- ✅ Storage cleanup/pruning
- ✅ Integration with existing analytics
- ⏳ Manual testing on real PRs

---

## Files Created/Modified

### Modified Files:
- ✅ `src/scripts/content.js` (added time tracking - 118 lines)
- ✅ `src/popup/popup.html` (added export section - 8 lines)
- ✅ `src/popup/popup.js` (added export functions - 147 lines)
- ✅ `src/popup/popup.css` (added export styling - 25 lines)

### New Files:
- ✅ `claudedocs/analytics-implementation.md` (this file)

---

## Status

✅ **Complete and ready for testing**

**Next Step**: Test time tracking and export functionality on real GitHub PRs

---

## Example Usage

**Scenario**: Developer reviews 5 PRs over a week

1. **Monday**:
   - Review `react#30684` - 20 minutes
   - Review `next.js#12345` - 15 minutes

2. **Wednesday**:
   - Review `react#30684` again - 10 minutes
   - Review `vue#9876` - 25 minutes

3. **Friday**:
   - Review `angular#5432` - 18 minutes

4. **End of Week**:
   - Open popup → See "88 minutes saved this week"
   - Click "Export CSV" → Get detailed report
   - Review shows:
     - 5 PRs analyzed
     - 2h active review time
     - Most time: `vue#9876` (25 min)
     - Most visited: `react#30684` (2 sessions, 30 min total)
