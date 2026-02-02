# Tab Scheduler Chrome Extension

A Chrome extension that allows you to schedule tabs to reopen at a specific date and time. Schedule a tab, it closes immediately, then reopens as a new window at the scheduled time.

## Features

- 📅 Schedule any tab to reopen at a future date/time
- 🔔 Desktop notifications when tabs are scheduled and reopened
- 📋 View and manage all scheduled tabs
- 💾 Persists across browser restarts
- ⚡ Handles missed schedules (reopens on next browser start)
- 🎯 Clean, modern UI matching Chrome's design language

## Installation

### Load Unpacked (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `/Users/ronnyerlich/src/chrome-extension` directory
6. The extension icon should appear in your toolbar

## Usage

### Schedule a Tab

1. Navigate to any webpage you want to schedule
2. Click the Tab Scheduler icon in your toolbar
3. Select a future date and time using the picker
4. Click "Schedule & Close Tab"
5. The tab closes immediately
6. At the scheduled time, the tab reopens as a new window

### View Scheduled Tabs

1. Click the Tab Scheduler icon
2. Scroll down to see all scheduled tabs
3. Each shows the page title and scheduled time

### Cancel a Scheduled Tab

1. Click the Tab Scheduler icon
2. Find the tab you want to cancel in the list
3. Click the "Cancel" button next to it

## How It Works

### Technical Details

- **Manifest V3**: Uses the latest Chrome extension standard
- **chrome.alarms API**: Reliable scheduling that persists across browser restarts
- **chrome.storage.local**: Stores scheduled tab data locally
- **chrome.windows API**: Creates new windows for reopened tabs
- **Service Worker**: Runs in background to handle alarms

### Data Structure

Scheduled tabs are stored in `chrome.storage.local` under the key `scheduledTabs`:

```json
{
  "alarm_1738453200000_abc123": {
    "alarmId": "alarm_1738453200000_abc123",
    "scheduledTime": 1738453200000,
    "tabInfo": {
      "url": "https://example.com",
      "title": "Example Page",
      "favIconUrl": "https://example.com/favicon.ico"
    },
    "createdAt": 1738366800000
  }
}
```

## Limitations

- Cannot schedule system tabs (`chrome://`, `about:`, etc.)
- Reopened tabs always open in a new window (not original position)
- Requires browser to be running at scheduled time (or next startup)

## Debugging

### View Service Worker Logs

1. Go to `chrome://extensions`
2. Find "Tab Scheduler"
3. Click "service worker" link
4. Opens DevTools with console logs

### View Popup Logs

1. Click extension icon to open popup
2. Right-click on popup → "Inspect"
3. Opens DevTools for popup

### Check Storage

In service worker DevTools console:
```javascript
chrome.storage.local.get('scheduledTabs', (data) => console.log(data))
```

### Check Alarms

In service worker DevTools console:
```javascript
chrome.alarms.getAll((alarms) => console.log(alarms))
```

## File Structure

```
chrome-extension/
├── manifest.json           # Extension configuration
├── background.js           # Service worker (alarm handling)
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic
├── icons/
│   ├── icon16.png         # 16x16 toolbar icon
│   ├── icon48.png         # 48x48 notifications
│   └── icon128.png        # 128x128 store listing
└── README.md              # This file
```

## Permissions

The extension requires these permissions:

- **tabs**: Access to tab information (URL, title, favicon)
- **alarms**: Schedule tab reopening
- **storage**: Persist scheduled tab data
- **notifications**: Show desktop notifications

## Privacy

- All data stored locally in your browser
- No external servers or analytics
- No data collection or tracking
- Open source - audit the code yourself

## Compatibility

- Chrome 88+ (Manifest V3 support)
- Also works on Edge, Brave, and other Chromium-based browsers

## Future Enhancements

Potential features for future versions:

- Recurring schedules (daily/weekly)
- Natural language scheduling ("tomorrow at 9am")
- Bulk scheduling of multiple tabs
- Restore tabs in original position
- Export/import scheduled tabs
- Keyboard shortcuts
- Statistics dashboard

## License

MIT License - feel free to modify and distribute

## Support

For issues or questions, please check the service worker logs and popup console for error messages.

## Version History

### 1.0.0 (Initial Release)
- Schedule tabs with date/time picker
- View scheduled tabs list
- Cancel scheduled tabs
- Desktop notifications
- Persists across browser restarts
- Handles missed schedules
