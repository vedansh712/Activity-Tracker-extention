# 🚀 Quick Installation Guide

## Step 1: Add Extension Icons

Before installing, you need to add icon files to the `icons/` directory:

- Create or download 4 PNG files: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
- You can use any image editing software or online icon generators
- Recommended: Use a stopwatch or clock icon theme

## Step 2: Install in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `activity-tracker` folder
5. The extension should now appear in your extensions list

## Step 3: Start Using

- The extension will automatically start tracking your browsing activity
- Click the extension icon in the toolbar to view your statistics
- Browse normally - the extension works in the background

## Troubleshooting

- **Icons not showing**: Make sure PNG files are in the `icons/` directory
- **Extension not loading**: Check that all files are in the correct locations
- **No data showing**: Browse a few websites first, then click the extension icon

## Features You'll See

- ✅ Total time spent browsing
- ✅ Time per website (grouped by domain)
- ✅ Visit counts and last visit times
- ✅ **NEW**: Automatic URL redirection based on time limits
- ✅ **NEW**: Settings page for managing redirection rules
- ✅ **NEW**: Visual warnings before redirections
- ✅ Beautiful, modern interface
- ✅ Data stored locally for privacy

## 🚀 Testing the Redirection Feature

1. **Open Settings**: Click "⚙️ Settings" in the extension popup
2. **Add Test Rule**:
   - From Domain: `youtube.com`
   - Redirect To: `https://nextjs.org/learn/dashboard-app`
   - Time Limit: `2` minutes (for quick testing)
   - Warning Time: `1` minute
3. **Test It**: Visit YouTube and wait - you'll see a warning at 1 minute, then redirect at 2 minutes!

Enjoy your new productivity-focused browsing experience! 🕒✨
