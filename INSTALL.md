# Installation Instructions

## Quick Start

Follow these steps to install and test the Tab Scheduler extension:

### Step 1: Open Chrome Extensions

1. Open Google Chrome
2. Navigate to `chrome://extensions` (paste in address bar)
3. Or: Menu (⋮) → Extensions → Manage Extensions

### Step 2: Enable Developer Mode

1. Look for "Developer mode" toggle in the top-right corner
2. Click to enable it
3. New buttons will appear: "Load unpacked", "Pack extension", "Update"

### Step 3: Load the Extension

1. Click the "Load unpacked" button
2. Navigate to: the extension directory
3. Click "Select" or "Open"

### Step 4: Verify Installation

You should see:
- ✅ "Tab Scheduler" appears in the extensions list
- ✅ Version: 1.11.0
- ✅ Status: Enabled (blue toggle)
- ✅ No errors shown
- ✅ Extension icon appears in toolbar (may need to pin it)

### Step 5: Pin the Extension (Optional)

1. Click the puzzle piece icon in Chrome toolbar
2. Find "Tab Scheduler" in the list
3. Click the pin icon to keep it visible in toolbar

## First Test

### 1-Minute Test

Try this quick test to make sure everything works:

1. Open any regular webpage (e.g., `https://google.com`)
2. Click the Tab Scheduler icon in toolbar
3. Popup opens showing current tab
4. Set schedule time to **1 minute from now**
5. Click "Schedule & Close Tab"
6. Tab closes immediately ✓
7. Notification: "Tab Scheduled" ✓
8. **Wait 1 minute**
9. New window opens with your page ✓
10. Notification: "Tab Reopened" ✓

**If all of the above works, the extension is installed correctly!**

## Troubleshooting

### Extension Won't Load

**Problem**: Error when clicking "Load unpacked"

**Solutions**:
- Verify you selected the correct directory: the extension directory
- Check that `manifest.json` exists in that directory
- Look for error messages and check manifest.json syntax

### No Icon in Toolbar

**Problem**: Extension loaded but no icon visible

**Solutions**:
- Click the puzzle piece icon in toolbar
- Find "Tab Scheduler" and pin it
- Or: The icon is there but hard to see - look for clock symbol

### Tab Doesn't Reopen

**Problem**: Tab closes but doesn't reopen at scheduled time

**Solutions**:
1. Check service worker console:
   - Go to `chrome://extensions`
   - Find "Tab Scheduler"
   - Click "service worker" link
   - Look for errors in console

2. Check alarms:
   ```javascript
   chrome.alarms.getAll((alarms) => console.log(alarms))
   ```

3. Check storage:
   ```javascript
   chrome.storage.local.get('scheduledTabs', (data) => console.log(data))
   ```

### Permission Errors

**Problem**: Console shows permission errors

**Solutions**:
- Verify manifest.json includes all required permissions
- Reload the extension (trash icon then reload)
- Restart Chrome

### "Service worker (Inactive)" shown

**Problem**: Service worker shows as inactive

**Solutions**:
- This is normal! Service workers sleep when idle
- They wake up when alarms fire or popup opens
- Click "service worker" link to activate it
- No action needed if everything works

## Checking Installation

### Verify Files

Run this command to check all files exist:

```bash
ls -la
```

You should see:
- `manifest.json` - Extension config
- `background.js` - Service worker
- `README.md` - Documentation
- `popup/` directory with popup.html, popup.js, popup.css
- `icons/` directory with icon16.png, icon48.png, icon128.png

### Verify Manifest

Check manifest.json is valid:

```bash
cat manifest.json
```

Should show proper JSON with:
- `manifest_version: 3`
- Permissions: tabs, alarms, storage, notifications
- Background service_worker: background.js
- Action popup: popup/popup.html

### Check Service Worker

1. Go to `chrome://extensions`
2. Find "Tab Scheduler"
3. Click "service worker" (or "Inspect views: service worker")
4. Console opens
5. Should show: "Tab Scheduler installed/updated"
6. No red errors

### Check Icons

Verify icons were created:

```bash
ls -lh icons/
```

Should show three PNG files:
- icon16.png
- icon48.png
- icon128.png

## Updating the Extension

If you make changes to the code:

1. Go to `chrome://extensions`
2. Find "Tab Scheduler"
3. Click the refresh/reload icon (↻)
4. Or: Remove and re-add the extension

**Note**: Scheduled tabs persist across updates!

## Uninstalling

To remove the extension:

1. Go to `chrome://extensions`
2. Find "Tab Scheduler"
3. Click "Remove"
4. Confirm removal

**Warning**: This will clear all scheduled tabs!

## Next Steps

Once installed successfully:

1. Read [README.md](README.md) for usage instructions
2. Read [TESTING.md](TESTING.md) for comprehensive testing
3. Start scheduling tabs!

## Getting Help

If you encounter issues:

1. Check service worker console for errors
2. Check popup console (right-click popup → Inspect)
3. Verify all files are present
4. Try reloading the extension
5. Try restarting Chrome

## System Requirements

- **Browser**: Chrome 88 or later (Manifest V3 support)
- **Also compatible with**: Edge, Brave, other Chromium browsers
- **OS**: Windows, macOS, Linux, ChromeOS
- **Permissions**: Must allow notifications (check browser settings)

## Privacy & Security

- ✅ All data stored locally in your browser
- ✅ No external servers or network requests
- ✅ No data collection or tracking
- ✅ Open source - audit the code yourself
- ✅ Only accesses tabs when you click the extension icon

## Success!

If you made it here and the 1-minute test worked, congratulations! 🎉

The Tab Scheduler extension is now installed and ready to use.

Try scheduling some tabs and enjoy your organized browsing!
