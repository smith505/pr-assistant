# GitHub PR Review Assistant 🤖

AI-powered Chrome extension that enhances GitHub pull request reviews with smart summaries, impact scoring, and analytics.

## Features

- **AI-Powered PR Summaries**: Get instant plain-English explanations of code changes
- **Smart Highlighting**: Auto-highlights security-critical and high-impact changes
- **Impact Scoring**: See which files matter most for review
- **Review Analytics**: Track time spent and review velocity
- **Team Insights**: Shared analytics and custom rules (Pro/Team tier)

## Installation (Development)

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `github-pr-assistant` directory

## Project Structure

```
github-pr-assistant/
├── manifest.json           # Extension manifest (Manifest V3)
├── src/
│   ├── scripts/
│   │   ├── background.js   # Background service worker
│   │   ├── content.js      # Content script for GitHub pages
│   │   └── ai-processor.js # AI/ML processing logic
│   ├── styles/
│   │   └── content.css     # Injected styles for GitHub
│   └── popup/
│       ├── popup.html      # Extension popup UI
│       ├── popup.css       # Popup styles
│       └── popup.js        # Popup logic
├── assets/
│   ├── icons/              # Extension icons
│   └── images/             # UI images
└── README.md
```

## Development Roadmap

See [ROADMAP.md](../../ROADMAP.md) for detailed 5-day build plan and launch strategy.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **AI**: Powered by ChatGPT
- **APIs**: GitHub API, OpenAI API
- **Payments**: Stripe (Checkout + Subscriptions)
- **Storage**: Chrome Storage API

## Environment Variables

Create a `.env` file (not tracked in git) with:

```
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
OPENAI_API_KEY=your_openai_api_key
STRIPE_PUBLIC_KEY=your_stripe_public_key
```

## License

Proprietary - All rights reserved

## Support

- Documentation: https://github-pr-assistant.com/docs
- Support: support@github-pr-assistant.com
- Issues: https://github.com/yourusername/github-pr-assistant/issues
