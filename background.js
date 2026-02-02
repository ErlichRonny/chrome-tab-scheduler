// Service Worker for Tab Scheduler Chrome Extension

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

    // Create new window with the scheduled tab
    await chrome.windows.create({
      url: tabData.tabInfo.url,
      focused: true
    });

    // Show success notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Tab Reopened',
      message: `Reopened: ${tabData.tabInfo.title}`,
      priority: 1
    });

    // Clean up storage
    delete scheduledTabs[alarm.name];
    await chrome.storage.local.set({ scheduledTabs });

    console.log('Successfully reopened tab:', tabData.tabInfo.title);
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

    // Process each stored scheduled tab
    for (const [alarmId, tabData] of Object.entries(scheduledTabs)) {
      const alarm = alarmMap.get(alarmId);

      if (!alarm) {
        // Alarm missing - check if past due
        if (tabData.scheduledTime <= now) {
          // Past due - reopen immediately
          console.log('Reopening past-due tab:', tabData.tabInfo.title);

          try {
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
          } catch (error) {
            console.error('Error reopening past-due tab:', error);
          }

          // Clean up
          delete scheduledTabs[alarmId];
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

// Handle messages from popup (optional, for future enhancements)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getScheduledTabs') {
    chrome.storage.local.get('scheduledTabs').then(result => {
      sendResponse({ scheduledTabs: result.scheduledTabs || {} });
    });
    return true; // Keep channel open for async response
  }
});
