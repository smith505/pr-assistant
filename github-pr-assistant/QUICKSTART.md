# Quick Start Guide - GitHub PR Review Assistant

**How to test what we've built so far** 🚀

---

## 🔧 Step 1: Load the Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top right corner)
4. Click **"Load unpacked"**
5. Select the `github-pr-assistant` folder
6. You should see the extension appear in your extensions list!

---

## ✅ Step 2: Verify It's Working

### Check the Extension Icon:
- Look for the extension icon in your Chrome toolbar
- Click it to open the popup
- You should see the "PR Assistant" popup interface

### Test on GitHub:
1. Go to any GitHub pull request, for example:
   - https://github.com/facebook/react/pulls (pick any open PR)
   - https://github.com/microsoft/vscode/pulls (pick any open PR)

2. You should see:
   - A purple "Connect GitHub" prompt at the top of the PR
   - OR (if you click analyze) a panel with the AI assistant interface

---

## 🎨 What Works Right Now (Day 1 Foundation):

✅ **Extension loads in Chrome**
✅ **Popup UI displays correctly**
✅ **Content script detects PR pages**
✅ **UI panel injects on GitHub PR pages**
✅ **Settings are saved locally**
✅ **Basic authentication flow (placeholder)**
✅ **Mock PR analysis (placeholder data)**

---

## 🔨 What Doesn't Work Yet:

❌ **Real GitHub OAuth** (coming in Day 2)
❌ **Real AI summaries** (coming in Day 2)
❌ **Impact scoring** (coming in Day 3)
❌ **Smart highlighting** (coming in Day 3)
❌ **Review analytics** (coming in Day 3)
❌ **Stripe payments** (coming in Day 4)

---

## 🧪 How to Test Current Features:

### Test 1: Extension Popup
1. Click the extension icon in Chrome toolbar
2. Verify the popup shows:
   - "Not connected" status
   - "Connect GitHub" button
   - Subscription section showing "Free Tier"
   - Settings checkboxes

### Test 2: Content Script on GitHub PR
1. Go to any GitHub PR (e.g., https://github.com/facebook/react/pull/30875)
2. Verify you see:
   - Purple "Connect GitHub" card at the top
3. Open Chrome DevTools (F12)
4. Check Console for: `🤖 PR Assistant: Content script loaded`

### Test 3: Mock Analysis
1. On a GitHub PR page, click the "Connect GitHub" button
2. After "connecting", refresh the page
3. Click "Analyze PR" button
4. You should see:
   - Loading spinner
   - Mock AI summary after a moment
   - Mock key changes list
   - Mock impact assessment

### Test 4: Settings Persistence
1. Click extension icon → open popup
2. Toggle "Auto-analyze PRs on page load"
3. Close popup
4. Reopen popup
5. Verify the setting is still checked ✅

---

## 🐛 Troubleshooting

### Extension Won't Load:
- Make sure you're in the correct directory
- Check Chrome DevTools console for errors
- Try reloading the extension from `chrome://extensions/`

### Content Script Not Injecting:
- Make sure you're on a GitHub PR page (URL must match `github.com/*/pull/*`)
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Check if Content Security Policy is blocking it (rare)

### Popup Not Opening:
- Click the extension icon again
- Check if popup.html file exists
- Inspect popup by right-clicking extension icon → "Inspect popup"

---

## 📝 Development Tips

### View Console Logs:

**Content Script logs:**
1. Open any GitHub PR page
2. Press F12 (DevTools)
3. Go to Console tab
4. Look for messages starting with `🤖 PR Assistant:`

**Background Worker logs:**
1. Go to `chrome://extensions/`
2. Find "GitHub PR Review Assistant"
3. Click "service worker" link
4. Console will open showing background logs

**Popup logs:**
1. Click extension icon to open popup
2. Right-click anywhere in popup
3. Select "Inspect"
4. Console will show popup logs

### Make Changes:
1. Edit any file in `src/`
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Hard refresh any GitHub pages you have open

### Test Different Scenarios:
- Test on different GitHub repos
- Test on PRs with many files vs few files
- Test with browser console open to see logs

---

## 🗂️ File Structure Reference

```
github-pr-assistant/
├── manifest.json          ← Extension config
├── src/
│   ├── scripts/
│   │   ├── background.js  ← Handles API calls, runs in background
│   │   └── content.js     ← Runs on GitHub PR pages, injects UI
│   ├── styles/
│   │   └── content.css    ← Styles for injected UI
│   └── popup/
│       ├── popup.html     ← Extension popup UI
│       ├── popup.css      ← Popup styles
│       └── popup.js       ← Popup logic
└── assets/
    └── icons/             ← Extension icons (to be added)
```

---

## 🎯 Next Steps for Tomorrow (Day 2):

1. **Get OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Create new secret key
   - Add to `.env` file

2. **Register GitHub OAuth App**
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in details
   - Get Client ID and Secret

3. **Implement Real AI Integration**
   - Connect OpenAI GPT-4 API
   - Create smart prompts for PR analysis
   - Parse and display real summaries

---

## 💰 Cost Expectations

### Development Phase (MVP):
- **Chrome Web Store**: $5 one-time fee
- **OpenAI API**: ~$0.02-0.05 per PR analysis
- **GitHub API**: Free (5,000 requests/hour)
- **Hosting**: $0 (extension runs locally)

### Testing with 100 PRs:
- OpenAI cost: ~$2-5 total

**Total MVP cost: ~$7-10** 🎉

---

## 📚 Helpful Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [GitHub API Docs](https://docs.github.com/en/rest)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Stripe Docs](https://stripe.com/docs)

---

## 🤝 Need Help?

**Common Issues:**
- Extension not loading → Check manifest.json syntax
- Content script not injecting → Verify URL patterns in manifest
- Popup not opening → Check popup.html path

**Debug Checklist:**
1. ✅ Extension shows in `chrome://extensions/`
2. ✅ All files present in `src/` directory
3. ✅ DevTools shows no errors
4. ✅ Currently on a GitHub PR page

---

## 🎉 You're Ready!

Day 1 foundation is complete and ready for testing. Tomorrow we'll add the AI magic! 🚀

**Current Progress**: 20% complete
**Next Milestone**: Day 2 - AI Integration
**Target**: First paying customer in Week 3

Let's build something amazing! 💪
