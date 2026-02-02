// Service Worker for Tab Scheduler Chrome Extension

// Queue for batching alarms that fire close together
let pendingAlarms = [];
let batchTimeout = null;
const BATCH_DELAY_MS = 2000; // Wait 2 seconds to collect alarms

// On extension install or update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Scheduler installed/updated');
  reconcileAlarmsAndStorage();
});

// On browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, reconciling alarms');
  reconcileAlarmsAndStorage();
});

// Main alarm listener - fires when scheduled time is reached
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm fired:', alarm.name);

  try {
    // Get scheduled tab data from storage
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};
    const tabData = scheduledTabs[alarm.name];

    if (!tabData) {
      console.warn('No tab data found for alarm:', alarm.name);
      return;
    }

    // Add to pending queue
    pendingAlarms.push({ alarmId: alarm.name, tabData });
    console.log(`Added to queue. Total pending: ${pendingAlarms.length}`);

    // Clear existing timeout and set new one
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }

    // Wait for more alarms, then process batch
    batchTimeout = setTimeout(async () => {
      await processPendingAlarms();
    }, BATCH_DELAY_MS);

  } catch (error) {
    console.error('Error handling alarm:', error);

    // Show error notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Tab Scheduler Error',
      message: 'Failed to reopen scheduled tab',
      priority: 2
    });
  }
});

// Process all pending alarms as a batch
async function processPendingAlarms() {
  if (pendingAlarms.length === 0) {
    return;
  }

  console.log(`Processing ${pendingAlarms.length} pending alarms`);

  try {
    // Get current storage
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};

    // Make a copy of pending alarms and clear the queue
    const alarmsToProcess = [...pendingAlarms];
    pendingAlarms = [];
    batchTimeout = null;

    // Process based on count
    if (alarmsToProcess.length === 1) {
      // Single alarm - open in new window
      const { alarmId, tabData } = alarmsToProcess[0];

      await chrome.windows.create({
        url: tabData.tabInfo.url,
        focused: true
      });

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Tab Reopened',
        message: `Reopened: ${tabData.tabInfo.title}`,
        priority: 1
      });

      // Clean up
      delete scheduledTabs[alarmId];

    } else {
      // Multiple alarms - open in one window with group
      console.log(`Opening ${alarmsToProcess.length} tabs in one window with group`);

      const urls = alarmsToProcess.map(a => a.tabData.tabInfo.url);

      // Create window with all URLs
      const window = await chrome.windows.create({
        url: urls,
        focused: true
      });

      // Get all tabs in the new window
      const tabs = await chrome.tabs.query({ windowId: window.id });
      const tabIds = tabs.map(t => t.id);

      // Group all tabs together
      const groupId = await chrome.tabs.group({ tabIds });

      // Set group name and color
      await chrome.tabGroups.update(groupId, {
        title: 'Snoozed',
        color: 'blue'
      });

      // Show notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Tabs Reopened',
        message: `Reopened ${alarmsToProcess.length} tabs in one window`,
        priority: 1
      });

      // Clean up all
      for (const { alarmId } of alarmsToProcess) {
        delete scheduledTabs[alarmId];
      }
    }

    // Save updated storage
    await chrome.storage.local.set({ scheduledTabs });
    console.log('Successfully processed batch');

  } catch (error) {
    console.error('Error processing pending alarms:', error);

    // Fallback: try to open tabs individually
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};

    for (const { alarmId, tabData } of pendingAlarms) {
      try {
        await chrome.windows.create({
          url: tabData.tabInfo.url,
          focused: false
        });
        delete scheduledTabs[alarmId];
      } catch (err) {
        console.error('Error in fallback:', err);
      }
    }

    await chrome.storage.local.set({ scheduledTabs });
    pendingAlarms = [];
  }
}

// Reconcile alarms and storage on startup/install
async function reconcileAlarmsAndStorage() {
  try {
    const [alarms, storageResult] = await Promise.all([
      chrome.alarms.getAll(),
      chrome.storage.local.get('scheduledTabs')
    ]);

    const scheduledTabs = storageResult.scheduledTabs || {};
    const alarmMap = new Map(alarms.map(a => [a.name, a]));
    const now = Date.now();
    const pastDueTabs = [];

    // Process each stored scheduled tab
    for (const [alarmId, tabData] of Object.entries(scheduledTabs)) {
      const alarm = alarmMap.get(alarmId);

      if (!alarm) {
        // Alarm missing - check if past due
        if (tabData.scheduledTime <= now) {
          // Past due - collect for batch processing
          console.log('Found past-due tab:', tabData.tabInfo.title);
          pastDueTabs.push({ alarmId, tabData });
        } else if (tabData.scheduledTime > now + (24 * 60 * 60 * 1000)) {
          // More than 24 hours in future - might be stale, but recreate alarm
          console.log('Recreating alarm for:', tabData.tabInfo.title);
          await chrome.alarms.create(alarmId, { when: tabData.scheduledTime });
        } else {
          // Within 24 hours - recreate alarm
          console.log('Recreating alarm for:', tabData.tabInfo.title);
          await chrome.alarms.create(alarmId, { when: tabData.scheduledTime });
        }
      } else {
        // Alarm exists - verify it matches storage
        console.log('Alarm verified:', alarmId);
      }
    }

    // Handle past-due tabs
    if (pastDueTabs.length > 0) {
      await reopenPastDueTabs(pastDueTabs, scheduledTabs);
    }

    // Check for orphaned alarms (alarms without storage entries)
    for (const alarm of alarms) {
      if (alarm.name.startsWith('alarm_') && !scheduledTabs[alarm.name]) {
        console.log('Clearing orphaned alarm:', alarm.name);
        await chrome.alarms.clear(alarm.name);
      }
    }

    // Save cleaned storage
    await chrome.storage.local.set({ scheduledTabs });

    console.log('Reconciliation complete. Active schedules:', Object.keys(scheduledTabs).length);
  } catch (error) {
    console.error('Error during reconciliation:', error);
  }
}

// Reopen past-due tabs (either single window or grouped)
async function reopenPastDueTabs(pastDueTabs, scheduledTabs) {
  try {
    if (pastDueTabs.length === 1) {
      // Single past-due tab - open in new window (current behavior)
      const { alarmId, tabData } = pastDueTabs[0];

      console.log('Reopening single past-due tab:', tabData.tabInfo.title);

      await chrome.windows.create({
        url: tabData.tabInfo.url,
        focused: true
      });

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Missed Schedule',
        message: `Reopened missed tab: ${tabData.tabInfo.title}`,
        priority: 1
      });

      // Clean up
      delete scheduledTabs[alarmId];

    } else if (pastDueTabs.length > 1) {
      // Multiple past-due tabs - open in one window with a group
      console.log(`Reopening ${pastDueTabs.length} past-due tabs in one window`);

      const urls = pastDueTabs.map(t => t.tabData.tabInfo.url);

      // Create window with all URLs
      const window = await chrome.windows.create({
        url: urls,
        focused: true
      });

      // Get all tabs in the new window
      const tabs = await chrome.tabs.query({ windowId: window.id });
      const tabIds = tabs.map(t => t.id);

      // Group all tabs together
      const groupId = await chrome.tabs.group({ tabIds });

      // Set group name and color
      await chrome.tabGroups.update(groupId, {
        title: 'Snoozed',
        color: 'blue'
      });

      // Show notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Missed Schedules',
        message: `Reopened ${pastDueTabs.length} missed tabs in one window`,
        priority: 1
      });

      // Clean up all past-due tabs from storage
      for (const { alarmId } of pastDueTabs) {
        delete scheduledTabs[alarmId];
      }
    }
  } catch (error) {
    console.error('Error reopening past-due tabs:', error);

    // Fallback: try to open tabs individually if grouping fails
    for (const { alarmId, tabData } of pastDueTabs) {
      try {
        await chrome.windows.create({
          url: tabData.tabInfo.url,
          focused: false
        });
        delete scheduledTabs[alarmId];
      } catch (err) {
        console.error('Error reopening individual tab:', err);
      }
    }
  }
}

// Handle messages from popup (optional, for future enhancements)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getScheduledTabs') {
    chrome.storage.local.get('scheduledTabs').then(result => {
      sendResponse({ scheduledTabs: result.scheduledTabs || {} });
    });
    return true; // Keep channel open for async response
  }
});
