# Testing Guide for Tab Scheduler

## Installation for Testing

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select this directory: `/Users/ronnyerlich/src/chrome-extension`
5. Verify the extension appears with the Tab Scheduler icon

## Quick Test (1 minute schedule)

This is the fastest way to verify the extension works:

1. Open any regular webpage (e.g., https://google.com)
2. Click the Tab Scheduler extension icon
3. In the popup:
   - Verify current tab info is displayed
   - Set schedule time to 1 minute from now
   - Click "Schedule & Close Tab"
4. Verify:
   - Tab closes immediately
   - Notification appears: "Tab Scheduled"
5. Wait 1 minute
6. Verify:
   - New window opens with the scheduled URL
   - Notification appears: "Tab Reopened"

## Comprehensive Test Checklist

### Basic Functionality

- [ ] **Load Extension**
  - Extension loads without errors
  - Icon appears in toolbar
  - No console errors in service worker

- [ ] **Open Popup**
  - Click extension icon → popup opens
  - Current tab info displays correctly (favicon, title, URL)
  - Date/time picker appears
  - Minimum time is set to current time + 1 minute

- [ ] **Schedule a Tab**
  - Select a time 1 minute in future
  - Click "Schedule & Close Tab"
  - Tab closes immediately
  - Success notification appears
  - Popup closes

- [ ] **Tab Reopens**
  - Wait for scheduled time
  - New window opens with correct URL
  - "Reopened" notification appears
  - Page loads correctly

### Multiple Tabs

- [ ] Schedule 3 different tabs at different times
- [ ] All appear in the scheduled list
- [ ] All reopen at their scheduled times
- [ ] Each gets its own notification

### Scheduled Tabs List

- [ ] Open popup after scheduling tabs
- [ ] All scheduled tabs appear in list
- [ ] List shows: favicon, title, formatted time
- [ ] Times are formatted correctly ("In X minutes", date, etc.)
- [ ] List is sorted by scheduled time (earliest first)
- [ ] Empty state shows when no tabs scheduled

### Cancel Functionality

- [ ] Schedule a tab for 5 minutes from now
- [ ] Open popup
- [ ] Click "Cancel" button on that tab
- [ ] Cancellation notification appears
- [ ] Tab removed from list
- [ ] Alarm is cleared (check DevTools)
- [ ] Tab does NOT reopen at scheduled time

### Browser Restart Persistence

- [ ] Schedule a tab for 5 minutes in future
- [ ] Close Chrome completely (Cmd+Q or quit from menu)
- [ ] Wait 1 minute
- [ ] Reopen Chrome
- [ ] Open extension popup
- [ ] Verify scheduled tab still appears in list
- [ ] Wait for scheduled time
- [ ] Verify tab still reopens correctly

### Past-Due Schedules

- [ ] Schedule a tab for 2 minutes in future
- [ ] Close Chrome completely
- [ ] Wait 3 minutes (past the scheduled time)
- [ ] Reopen Chrome
- [ ] Verify tab reopens immediately
- [ ] Notification shows "Missed Schedule"

### Validation

- [ ] **Past time validation**
  - Try to schedule for past time
  - Error message appears
  - Cannot submit

- [ ] **Empty time validation**
  - Leave datetime field empty
  - Click schedule button
  - Error message appears

- [ ] **System tab validation**
  - Open `chrome://extensions`
  - Click extension icon
  - Verify error message: "Cannot schedule system tabs"
  - Schedule button is disabled

- [ ] **about:blank validation**
  - Open new tab (about:blank)
  - Click extension icon
  - Verify error or disabled state

### Edge Cases

- [ ] Schedule tab, then immediately cancel it
- [ ] Schedule 10+ tabs at once
- [ ] Schedule tab with very long title (>100 chars)
- [ ] Schedule tab with no favicon
- [ ] Schedule tab for 24+ hours in future
- [ ] Disable extension, re-enable, verify schedules persist
- [ ] Update extension (reload), verify schedules persist

## Debugging Commands

### View Storage Contents

Open service worker DevTools (`chrome://extensions` → "service worker"):

```javascript
// View all scheduled tabs
chrome.storage.local.get('scheduledTabs', (data) => {
  console.log('Scheduled Tabs:', data.scheduledTabs);
  console.log('Count:', Object.keys(data.scheduledTabs || {}).length);
});

// Clear all scheduled tabs (for testing)
chrome.storage.local.set({ scheduledTabs: {} });
```

### View Active Alarms

```javascript
// View all alarms
chrome.alarms.getAll((alarms) => {
  console.log('Active Alarms:', alarms);
  console.log('Count:', alarms.length);
  alarms.forEach(a => {
    console.log(`${a.name}: fires at ${new Date(a.scheduledTime)}`);
  });
});

// Clear all alarms (for testing)
chrome.alarms.clearAll();
```

### Manually Trigger Alarm (for testing)

```javascript
// Create test alarm that fires in 10 seconds
chrome.alarms.create('test_alarm', { delayInMinutes: 0.17 });

// Or schedule specific time
const futureTime = Date.now() + (60 * 1000); // 1 minute from now
chrome.alarms.create('alarm_test_123', { when: futureTime });
```

### Check for Errors

1. Service worker console: Look for red errors
2. Popup console: Right-click popup → Inspect → Console tab
3. Check for failed API calls or exceptions

## Performance Testing

### Storage Limits

- Schedule 50 tabs
- Verify performance remains good
- Check storage size: `chrome.storage.local.getBytesInUse()`

### Memory Leaks

- Open/close popup 50 times
- Check Chrome Task Manager (Shift+Esc)
- Verify memory doesn't grow excessively

## Known Limitations to Verify

- [ ] Cannot schedule `chrome://` URLs (expected)
- [ ] Cannot schedule `about:` URLs (expected)
- [ ] Cannot schedule `file://` URLs (expected)
- [ ] Reopened tabs always open in new window (expected)
- [ ] If browser closed, alarm fires on next startup (expected)

## Test Matrix

| Scenario | Expected Result | Status |
|----------|----------------|--------|
| Schedule 1 minute future | Tab closes, reopens in 1 min | ☐ |
| Schedule 1 hour future | Tab closes, reopens in 1 hour | ☐ |
| Browser restart | Schedules persist | ☐ |
| Cancel scheduled tab | Tab doesn't reopen | ☐ |
| System tab (chrome://) | Error shown, disabled | ☐ |
| Past time | Validation error | ☐ |
| Multiple tabs | All reopen correctly | ☐ |
| Past-due after restart | Opens immediately | ☐ |

## Reporting Issues

If you find bugs, check:

1. **Service Worker Console** (`chrome://extensions` → "service worker")
   - Look for errors or warnings
   - Check what alarms are registered

2. **Popup Console** (Right-click popup → Inspect)
   - Look for JavaScript errors
   - Check network requests

3. **Storage State**
   - Run storage commands above
   - Verify data structure matches expected format

4. **Alarm State**
   - Run alarm commands above
   - Verify alarms match storage entries

## Success Criteria

All tests pass if:

✅ Extension loads without errors
✅ Can schedule tabs successfully
✅ Tabs close immediately when scheduled
✅ Tabs reopen at scheduled time
✅ Notifications appear correctly
✅ Schedules persist across browser restarts
✅ Can view all scheduled tabs
✅ Can cancel scheduled tabs
✅ Validation prevents invalid inputs
✅ System tabs are blocked
✅ Past-due schedules handled correctly

## Next Steps

After testing, if all works:

1. Use the extension for your own tabs
2. Consider publishing to Chrome Web Store
3. Gather feedback for improvements
4. Add planned features (recurring schedules, etc.)
