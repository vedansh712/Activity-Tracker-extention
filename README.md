# 🕒 Activity Tracker - Browser Extension

A comprehensive browser extension that monitors your web browsing activity and tracks time spent on different websites. The extension intelligently extracts domain information from URLs (e.g., tracks `youtube.com` for all YouTube pages like `youtube.com/watch?v=QtCWDqjK294`) and provides detailed statistics about your browsing habits.

## ✨ Features

- **Smart Domain Tracking**: Automatically extracts main domain from URLs (youtube.com from youtube.com/watch?v=xyz)
- **Advanced Activity Monitoring**: Tracks active tabs with sophisticated presence detection
- **Smart User Presence Detection**: Combines window focus + cursor position + user interactions
- **Video-Optimized Tracking**: Perfect for YouTube/streaming - tracks time even during passive video watching
- **Multi-Factor Activity Detection**: Window focus, cursor presence, document visibility, and user interactions
- **🚀 Automatic URL Redirection**: Set time limits and redirect to productive sites when exceeded
- **⏰ Smart Time Management**: Daily time limits with warning notifications before redirection
- **⚙️ Rule Management**: Easy-to-use settings page for managing multiple redirection rules
- **🔔 Visual Notifications**: In-page warnings and redirection notifications
- **Beautiful UI**: Modern, responsive popup interface with activity statistics
- **Local Data Storage**: All data stored locally in your browser for privacy
- **Detailed Statistics**: Shows total time, visit counts, and last visit times for each domain

## 📁 Project Structure

```
activity-tracker/
├── manifest.json          # Extension configuration and permissions
├── background.js          # Service worker for tab tracking and time measurement
├── content.js            # Content script for page visibility and user activity
├── popup.html            # Extension popup interface
├── popup.css             # Styling for popup interface
├── popup.js              # Popup functionality and data display
├── settings.html         # Settings page for managing redirection rules
├── settings.css          # Styling for settings page
├── settings.js           # Settings page functionality and rule management
├── icons/                # Extension icons directory
│   └── README.md         # Icon requirements and guidelines
└── README.md             # This documentation file
```

## 🔧 Installation

### Development Installation

1. **Clone or Download**: Get the extension files to your local machine
2. **Open Chrome Extensions**: Navigate to `chrome://extensions/` in Chrome
3. **Enable Developer Mode**: Toggle the "Developer mode" switch in the top right
4. **Load Unpacked Extension**: Click "Load unpacked" and select the project folder
5. **Add Icons**: Add PNG icon files (16x16, 32x32, 48x48, 128x128) to the `icons/` directory

### Required Icons

Create or add the following PNG files to the `icons/` directory:

- `icon16.png` (16x16 pixels)
- `icon32.png` (32x32 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

## 📋 File Documentation

### `manifest.json`

**Purpose**: Extension configuration file that defines permissions, scripts, and metadata
**Key Features**:

- Manifest V3 compliance
- Permissions for tabs, storage, and background processing
- Service worker and content script registration
- Popup and icon definitions

### `background.js`

**Purpose**: Service worker that handles core activity tracking logic
**Key Features**:

- Tab activation and URL change monitoring
- Domain extraction from URLs (removes www, extracts main domain)
- Time calculation and storage management
- Window focus/blur detection
- Periodic data saving (every 10 seconds)
- Message handling from content scripts

**Functions**:

- `extractDomain(url)`: Extracts main domain from full URL
- `saveTimeSpent()`: Saves accumulated time to storage
- `startTracking(tab)`: Begins tracking new tab/URL
- `initializeStorage()`: Sets up initial storage structure

### `content.js`

**Purpose**: Injected script that monitors page-level user activity
**Key Features**:

- Page visibility change detection
- User activity tracking (mouse, keyboard, scroll events)
- Inactive user detection (30-second threshold)
- Communication with background script

**Functions**:

- `updatePageVisibility()`: Detects when page becomes visible/hidden
- `trackUserActivity()`: Records user interaction timestamps
- Periodic activity checks to pause tracking during inactivity

### `popup.html`

**Purpose**: Extension popup interface structure
**Key Features**:

- Modern, responsive design
- Statistics overview section
- Website activity list
- Control buttons (refresh, clear data)
- Loading and empty states

### `popup.css`

**Purpose**: Styling for the popup interface
**Key Features**:

- Gradient backgrounds and modern design
- Responsive layout with flexbox
- Hover effects and smooth transitions
- Custom scrollbar styling
- Card-based layout for activity items

### `popup.js`

**Purpose**: Popup functionality and user interaction handling
**Key Features**:

- Data loading and display formatting
- Time formatting (milliseconds to human-readable)
- Favicon loading for websites
- Data clearing functionality
- Real-time statistics calculation

**Functions**:

- `loadActivityData()`: Fetches and displays activity data
- `formatTime(milliseconds)`: Converts time to readable format
- `createActivityItem(domain, data)`: Creates UI elements for each website
- `clearAllData()`: Removes all stored activity data

## 🎯 How It Works

### Domain Extraction Logic

The extension uses intelligent domain extraction:

```javascript
// Input: https://www.youtube.com/watch?v=QtCWDqjK294
// Output: youtube.com

// Input: https://github.com/user/repository/issues
// Output: github.com
```

### Enhanced Time Tracking Process

1. **Tab Activation**: When you switch to a tab, tracking starts
2. **URL Changes**: Navigation within the same tab updates tracking
3. **Multi-Factor Activity Detection**:
   - **Window Focus**: Tracks when browser window has focus
   - **Cursor Presence**: Detects if cursor is within the browser window
   - **Document Visibility**: Monitors if tab is visible (not minimized/hidden)
   - **User Interactions**: Mouse, keyboard, scroll, and video events
4. **Video-Optimized Tracking**: Special handling for video sites:
   - Tracks video play/pause/seek events
   - Extends inactivity timeout to 60 seconds (perfect for watching videos)
   - Considers video watching as active time
5. **Smart Pause/Resume**: Only pauses when ALL conditions are false:
   - Window loses focus AND cursor leaves window AND no recent activity
6. **Periodic Saves**: Data saved every 10 seconds with enhanced accuracy checks

### Data Storage Structure

```javascript
{
  "activityData": {
    "youtube.com": {
      "totalTime": 1800000,    // milliseconds
      "visits": 15,            // number of visits
      "lastVisit": 1640995200000, // timestamp
      "favicon": "https://..."  // cached favicon URL
    }
  }
}
```

## 🔒 Privacy & Security

- **Local Storage Only**: All data stored locally in your browser
- **No External Servers**: No data transmitted to external services
- **User Control**: Complete control over data with clear functionality
- **Minimal Permissions**: Only requests necessary browser permissions

## 🚀 Usage

### Basic Activity Tracking

1. **Install Extension**: Follow installation steps above
2. **Browse Normally**: Extension automatically tracks your activity
3. **View Statistics**: Click extension icon to see activity data
4. **Manage Data**: Use refresh and clear buttons as needed

### 🎯 URL Redirection Feature

**Perfect for productivity and time management!**

#### Setting Up Redirection Rules

1. **Open Settings**: Click the "⚙️ Settings" button in the popup or right-click extension → Options
2. **Add Rule**: Fill out the form with:
   - **From Domain**: `youtube.com` (the site you want to limit)
   - **Redirect To**: `https://nextjs.org/learn/dashboard-app` (productive alternative)
   - **Time Limit**: `60` minutes (daily limit)
   - **Warning Time**: `5` minutes (warning before redirect)
3. **Save Rule**: Click "Add Rule" to activate

#### How Redirection Works

1. **Daily Tracking**: Extension tracks time spent on each domain daily
2. **Warning Phase**: At 55 minutes on YouTube, you'll see a warning notification
3. **Automatic Redirect**: At 60 minutes, the tab automatically redirects to Next.js learning
4. **Prevention**: Any new attempts to visit YouTube will redirect until the next day

#### Example Use Cases

- **YouTube** → **Online Learning Platform** (limit entertainment)
- **Social Media** → **Productivity Tools** (focus on work)
- **Gaming Sites** → **Educational Content** (study time)
- **News Sites** → **Skill Building** (avoid news rabbit holes)

#### Managing Rules

- **Enable/Disable**: Toggle rules on/off without deleting
- **Edit Rules**: Delete and recreate with new settings
- **View Progress**: See daily time usage and remaining limits
- **Clear Rules**: Remove all rules at once if needed

## 📊 Statistics Displayed

- **Total Sites Visited**: Number of unique domains tracked
- **Total Time**: Cumulative time across all websites
- **Per-Site Statistics**:
  - Time spent on each domain
  - Number of visits
  - Last visit timestamp
  - Website favicon

## 🛠️ Development & Customization

### Modifying Tracking Behavior

- Adjust inactive threshold in `content.js` (currently 30 seconds)
- Change save interval in `background.js` (currently 10 seconds)
- Modify domain extraction logic in `extractDomain()` function

### UI Customization

- Edit `popup.css` for styling changes
- Modify `popup.html` for layout adjustments
- Update `popup.js` for functionality changes

### Adding Features

- Extend storage schema for new data points
- Add new message types for background-content communication
- Implement additional UI components in popup

## 📝 Changelog

### Version 1.2 (Enhanced Tracking & CSP Fixes)

- ✅ **IMPROVED**: Advanced activity detection for video watching scenarios
- ✅ **IMPROVED**: Multi-factor presence detection (focus + cursor + visibility)
- ✅ **IMPROVED**: Video-optimized tracking with play/pause/seek events
- ✅ **IMPROVED**: Extended inactivity timeout (60s) for passive video consumption
- ✅ **FIXED**: Content Security Policy violations in settings page
- ✅ **FIXED**: Data consistency between popup (total time) and settings (daily time)
- ✅ **IMPROVED**: Popup now shows both today's time and total time
- ✅ **IMPROVED**: More accurate tracking for YouTube and streaming platforms

### Version 1.1 (Redirection Feature Update)

- ✅ **NEW**: Automatic URL redirection based on time limits
- ✅ **NEW**: Daily time tracking with reset at midnight
- ✅ **NEW**: Settings page for managing redirection rules
- ✅ **NEW**: Visual warning notifications before redirections
- ✅ **NEW**: In-page redirection notifications
- ✅ **NEW**: Rule management (add, edit, delete, toggle)
- ✅ **NEW**: Daily usage statistics with progress bars
- ✅ **IMPROVED**: Enhanced popup with settings button

### Version 1.0 (Initial Release)

- ✅ Core time tracking functionality
- ✅ Domain extraction and URL processing
- ✅ User activity detection
- ✅ Modern popup interface
- ✅ Local data storage
- ✅ Tab and window focus handling
- ✅ Periodic data persistence
- ✅ Statistics display and management

## 🤝 Contributing

Feel free to contribute improvements, bug fixes, or new features. The codebase is well-documented and modular for easy modification.

## 📄 License

This project is open source and available under standard open source licensing terms.
#   A c t i v i t y - T r a c k e r - e x t e n t i o n 
 
 "# Activity-Tracker-extention" 
