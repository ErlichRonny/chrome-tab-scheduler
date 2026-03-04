// Service Worker for Tab Scheduler Chrome Extension

// Queue for batching alarms that fire close together
let pendingAlarms = [];
let batchTimeout = null;
const BATCH_DELAY_MS = 2000; // Wait 2 seconds to collect alarms

// Update extension badge with count of scheduled tabs
async function updateBadge() {
  try {
    // Check if badge is enabled in settings
    const settingsResult = await chrome.storage.local.get('settings');
    const settings = settingsResult.settings || { badgeEnabled: true };

    if (!settings.badgeEnabled) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }

    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};
    const count = Object.keys(scheduledTabs).length;

    if (count === 0) {
      // Clear badge if no scheduled tabs
      await chrome.action.setBadgeText({ text: '' });
    } else {
      // Show count
      await chrome.action.setBadgeText({ text: count.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#4285f4' }); // Chrome blue
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// On extension install or update
chrome.runtime.onInstalled.addListener(() => {
  reconcileAlarmsAndStorage();
  createContextMenus();
  updateBadge();
});

// On browser startup
chrome.runtime.onStartup.addListener(() => {
  reconcileAlarmsAndStorage();
  updateBadge();
});

// Main alarm listener - fires when scheduled time is reached
chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    // Get scheduled tab data from storage
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};
    const tabData = scheduledTabs[alarm.name];

    if (!tabData) {
      return;
    }

    // Add to pending queue
    pendingAlarms.push({ alarmId: alarm.name, tabData });

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
      const urls = alarmsToProcess.map(a => a.tabData.tabInfo.url);

      // Create window with all URLs
      const window = await chrome.windows.create({
        url: urls,
        focused: true
      });

      // Get all tabs in the new window
      const tabs = await chrome.tabs.query({ windowId: window.id });
      const tabIds = tabs.map(t => t.id);

      // Get settings for group name and color
      const settingsResult = await chrome.storage.local.get('settings');
      const settings = settingsResult.settings || { groupName: 'Snoozed', groupColor: 'blue' };

      // Group all tabs together
      const groupId = await chrome.tabs.group({ tabIds });

      // Set group name and color from settings
      await chrome.tabGroups.update(groupId, {
        title: settings.groupName || 'Snoozed',
        color: settings.groupColor || 'blue'
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

    // Update badge
    await updateBadge();

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
    await updateBadge();
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
          pastDueTabs.push({ alarmId, tabData });
        } else if (tabData.scheduledTime > now + (24 * 60 * 60 * 1000)) {
          // More than 24 hours in future - might be stale, but recreate alarm
          await chrome.alarms.create(alarmId, { when: tabData.scheduledTime });
        } else {
          // Within 24 hours - recreate alarm
          await chrome.alarms.create(alarmId, { when: tabData.scheduledTime });
        }
      }
    }

    // Handle past-due tabs
    if (pastDueTabs.length > 0) {
      await reopenPastDueTabs(pastDueTabs, scheduledTabs);
    }

    // Check for orphaned alarms (alarms without storage entries)
    for (const alarm of alarms) {
      if (alarm.name.startsWith('alarm_') && !scheduledTabs[alarm.name]) {
        await chrome.alarms.clear(alarm.name);
      }
    }

    // Save cleaned storage
    await chrome.storage.local.set({ scheduledTabs });

    // Update badge
    await updateBadge();
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
      const urls = pastDueTabs.map(t => t.tabData.tabInfo.url);

      // Create window with all URLs
      const window = await chrome.windows.create({
        url: urls,
        focused: true
      });

      // Get all tabs in the new window
      const tabs = await chrome.tabs.query({ windowId: window.id });
      const tabIds = tabs.map(t => t.id);

      // Get settings for group name and color
      const settingsResult = await chrome.storage.local.get('settings');
      const settings = settingsResult.settings || { groupName: 'Snoozed', groupColor: 'blue' };

      // Group all tabs together
      const groupId = await chrome.tabs.group({ tabIds });

      // Set group name and color from settings
      await chrome.tabGroups.update(groupId, {
        title: settings.groupName || 'Snoozed',
        color: settings.groupColor || 'blue'
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

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async operations properly
  (async () => {
    try {
      if (message.action === 'getScheduledTabs') {
        const result = await chrome.storage.local.get('scheduledTabs');
        sendResponse({ scheduledTabs: result.scheduledTabs || {} });
        return;
      }

      if (message.action === 'cancelSchedule') {
        const result = await handleCancelSchedule(message.alarmId);
        sendResponse(result);
        return;
      }

      if (message.action === 'editSchedule') {
        const result = await handleEditSchedule(message.oldAlarmId, message.newAlarmId, message.newScheduledTime, message.tabData);
        sendResponse(result);
        return;
      }

      if (message.action === 'scheduleTab') {
        const result = await handleScheduleTab(message.alarmId, message.scheduledTime, message.tabData);
        sendResponse(result);
        return;
      }

      if (message.action === 'updateBadge') {
        await updateBadge();
        sendResponse({ success: true });
        return;
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

// Listen for storage changes to update badge when popup modifies scheduledTabs
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.scheduledTabs) {
    updateBadge();
  }
});

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-schedule-tomorrow') {
    await handleQuickScheduleCommand('tomorrow9am');
  } else if (command === 'quick-schedule-later') {
    await handleQuickScheduleCommand('3hours');
  }
});

// Handle quick schedule keyboard shortcuts
async function handleQuickScheduleCommand(preset) {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      console.error('No active tab found');
      return;
    }

    // Check if URL is valid for scheduling
    if (isInvalidUrlForScheduling(tab.url)) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Cannot Schedule',
        message: 'System tabs cannot be scheduled',
        priority: 1
      });
      return;
    }

    // Calculate scheduled time based on preset
    const scheduledTime = calculatePresetTimeForContextMenu(preset);

    if (!scheduledTime || scheduledTime <= Date.now()) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Cannot Schedule',
        message: 'Invalid time selected',
        priority: 1
      });
      return;
    }

    // Generate unique alarm ID
    const randomId = Math.random().toString(36).substring(2, 8);
    const alarmId = `alarm_${scheduledTime}_${randomId}`;

    // Prepare tab data
    const tabData = {
      alarmId: alarmId,
      scheduledTime: scheduledTime,
      tabInfo: {
        url: tab.url,
        title: tab.title || 'Untitled',
        favIconUrl: tab.favIconUrl || 'icons/icon48.png'
      },
      createdAt: Date.now()
    };

    // Save to storage
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};
    scheduledTabs[alarmId] = tabData;
    await chrome.storage.local.set({ scheduledTabs });

    // Create alarm
    await chrome.alarms.create(alarmId, { when: scheduledTime });

    // Update badge
    await updateBadge();

    // Close tab
    await chrome.tabs.remove(tab.id);

    // Show success notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Tab Scheduled',
      message: `"${tab.title}" will reopen ${formatScheduledTimeForNotification(scheduledTime)}`,
      priority: 1
    });

  } catch (error) {
    console.error('Error in quick schedule command:', error);
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Scheduling Error',
      message: 'Failed to schedule tab',
      priority: 2
    });
  }
}

// Handle cancel schedule request from popup
async function handleCancelSchedule(alarmId) {
  try {
    // Clear alarm
    await chrome.alarms.clear(alarmId);

    // Remove from storage
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};
    const tabData = scheduledTabs[alarmId];

    if (!tabData) {
      return { success: false, error: 'Schedule not found' };
    }

    delete scheduledTabs[alarmId];
    await chrome.storage.local.set({ scheduledTabs });

    // Update badge
    await updateBadge();

    return { success: true, tabData };
  } catch (error) {
    console.error('Error cancelling schedule:', error);
    return { success: false, error: error.message };
  }
}

// Handle edit schedule request from popup
async function handleEditSchedule(oldAlarmId, newAlarmId, newScheduledTime, updatedTabData) {
  try {
    // Load existing scheduled tabs
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};

    // Remove old alarm
    await chrome.alarms.clear(oldAlarmId);
    delete scheduledTabs[oldAlarmId];

    // Add new alarm
    await chrome.alarms.create(newAlarmId, { when: newScheduledTime });
    scheduledTabs[newAlarmId] = updatedTabData;

    // Save to storage
    await chrome.storage.local.set({ scheduledTabs });

    // Update badge
    await updateBadge();

    return { success: true };
  } catch (error) {
    console.error('Error editing schedule:', error);
    return { success: false, error: error.message };
  }
}

// Handle schedule tab request from popup
async function handleScheduleTab(alarmId, scheduledTime, tabData) {
  try {
    // Load existing scheduled tabs
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};

    // Add to storage
    scheduledTabs[alarmId] = tabData;
    await chrome.storage.local.set({ scheduledTabs });

    // Create alarm
    await chrome.alarms.create(alarmId, { when: scheduledTime });

    // Update badge
    await updateBadge();

    return { success: true };
  } catch (error) {
    console.error('Error scheduling tab:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Context Menu Functions
// ============================================================================

// Create context menu items
function createContextMenus() {
  // Remove all existing menus first
  chrome.contextMenus.removeAll(() => {
    // Create parent menu
    chrome.contextMenus.create({
      id: 'schedule-tab',
      title: 'Schedule Tab',
      contexts: ['page']
    });

    // Add preset submenu items
    const presets = [
      { id: '1hour', title: 'In 1 hour' },
      { id: '3hours', title: 'In 3 hours' },
      { id: 'tomorrow9am', title: 'Tomorrow 9am' },
      { id: 'tomorrow2pm', title: 'Tomorrow 2pm' },
      { id: 'nextMonday9am', title: 'Next Monday 9am' },
      { id: 'nextWeek', title: 'Next week' }
    ];

    presets.forEach(preset => {
      chrome.contextMenus.create({
        id: `schedule-${preset.id}`,
        parentId: 'schedule-tab',
        title: preset.title,
        contexts: ['page']
      });
    });

  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith('schedule-')) {
    const presetId = info.menuItemId.replace('schedule-', '');
    await scheduleTabFromContextMenu(tab, presetId);
  }
});

// Schedule a tab from context menu
async function scheduleTabFromContextMenu(tab, presetId) {
  try {
    // Check if URL is valid
    if (isInvalidUrlForScheduling(tab.url)) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Cannot Schedule',
        message: 'System tabs cannot be scheduled',
        priority: 1
      });
      return;
    }

    // Calculate scheduled time
    const scheduledTime = calculatePresetTimeForContextMenu(presetId);

    if (!scheduledTime) {
      throw new Error('Invalid preset');
    }

    const now = Date.now();

    // Validate time
    if (scheduledTime <= now) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Cannot Schedule',
        message: 'Please select a future time',
        priority: 1
      });
      return;
    }

    // Generate unique alarm ID
    const randomId = Math.random().toString(36).substring(2, 8);
    const alarmId = `alarm_${scheduledTime}_${randomId}`;

    // Prepare tab data
    const tabData = {
      alarmId: alarmId,
      scheduledTime: scheduledTime,
      tabInfo: {
        url: tab.url,
        title: tab.title || 'Untitled',
        favIconUrl: tab.favIconUrl || 'icons/icon48.png'
      },
      createdAt: now
    };

    // Save to storage
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};
    scheduledTabs[alarmId] = tabData;
    await chrome.storage.local.set({ scheduledTabs });

    // Create alarm
    await chrome.alarms.create(alarmId, { when: scheduledTime });

    // Close tab
    await chrome.tabs.remove(tab.id);

    // Show success notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Tab Scheduled',
      message: `"${tab.title}" will reopen ${formatScheduledTimeForNotification(scheduledTime)}`,
      priority: 1
    });

    // Update badge
    await updateBadge();

  } catch (error) {
    console.error('Error scheduling from context menu:', error);
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Scheduling Error',
      message: 'Failed to schedule tab',
      priority: 2
    });
  }
}

// Calculate time for preset (context menu version)
function calculatePresetTimeForContextMenu(presetId) {
  const now = new Date();
  let targetDate = new Date();

  switch (presetId) {
    case '1hour':
      targetDate.setHours(now.getHours() + 1);
      break;

    case '3hours':
      targetDate.setHours(now.getHours() + 3);
      break;

    case 'tomorrow9am':
      targetDate.setDate(now.getDate() + 1);
      targetDate.setHours(9, 0, 0, 0);
      break;

    case 'tomorrow2pm':
      targetDate.setDate(now.getDate() + 1);
      targetDate.setHours(14, 0, 0, 0);
      break;

    case 'nextMonday9am':
      const currentDay = now.getDay();
      const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay);
      targetDate.setDate(now.getDate() + daysUntilMonday);
      targetDate.setHours(9, 0, 0, 0);
      break;

    case 'nextWeek':
      targetDate.setDate(now.getDate() + 7);
      break;

    default:
      return null;
  }

  return targetDate.getTime();
}

// Check if URL is invalid for scheduling
function isInvalidUrlForScheduling(url) {
  if (!url) return true;

  const invalidPrefixes = [
    'chrome://',
    'chrome-extension://',
    'about:',
    'edge://',
    'brave://',
    'file://'
  ];

  return invalidPrefixes.some(prefix => url.startsWith(prefix)) || url === 'about:blank';
}

// Format scheduled time for notification
function formatScheduledTimeForNotification(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = timestamp - now.getTime();

  // If less than 24 hours away
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

    if (hours === 0) {
      return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `in ${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min`;
  }

  // Format as date/time
  const options = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  return date.toLocaleString('en-US', options);
}
