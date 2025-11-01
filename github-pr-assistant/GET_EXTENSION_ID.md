# Get Your Chrome Extension ID

## Steps:

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `github-pr-assistant` folder
5. Your extension will appear with an ID like: `abcdefghijklmnopqrstuvwxyz123456`

## Your Extension ID:
```
[COPY IT HERE]
```

## Use This for GitHub OAuth Callback URL:
```
https://[YOUR_EXTENSION_ID].chromiumapp.org/
```

Example:
```
https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/
```

## Next Steps:
1. Copy your extension ID
2. Go to https://github.com/settings/developers
3. Click "New OAuth App"
4. Use the callback URL above
5. Get your Client ID and Client Secret
6. Update `src/config.js`
