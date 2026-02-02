// Popup script for Tab Scheduler Chrome Extension

let currentTab = null;

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentTab();
  await loadScheduledTabs();
  setupEventListeners();
  setMinDateTime();
});

// Get current active tab
async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    // Validate tab URL
    if (isInvalidUrl(tab.url)) {
      showError('Cannot schedule system tabs (chrome://, about:, etc.)');
      document.getElementById('scheduleButton').disabled = true;
      return;
    }

    // Update UI
    document.getElementById('tabFavicon').src = tab.favIconUrl || 'icons/icon48.png';
    document.getElementById('tabTitle').textContent = tab.title || 'Untitled';
    document.getElementById('tabUrl').textContent = new URL(tab.url).hostname;
  } catch (error) {
    console.error('Error loading current tab:', error);
    showError('Failed to load current tab');
  }
}

// Load and display all scheduled tabs
async function loadScheduledTabs() {
  try {
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};
    const listElement = document.getElementById('scheduledList');

    // Clear existing content
    listElement.innerHTML = '';

    const entries = Object.entries(scheduledTabs);

    if (entries.length === 0) {
      listElement.innerHTML = '<div class="empty-state">No scheduled tabs</div>';
      return;
    }

    // Sort by scheduled time (earliest first)
    entries.sort((a, b) => a[1].scheduledTime - b[1].scheduledTime);

    // Create list items
    entries.forEach(([alarmId, tabData]) => {
      const item = createScheduledTabItem(alarmId, tabData);
      listElement.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading scheduled tabs:', error);
  }
}

// Create a scheduled tab list item
function createScheduledTabItem(alarmId, tabData) {
  const item = document.createElement('div');
  item.className = 'scheduled-item';

  const favicon = document.createElement('img');
  favicon.className = 'favicon';
  favicon.src = tabData.tabInfo.favIconUrl || 'icons/icon48.png';
  favicon.alt = '';

  const info = document.createElement('div');
  info.className = 'scheduled-info';

  const title = document.createElement('div');
  title.className = 'scheduled-title';
  title.textContent = tabData.tabInfo.title || 'Untitled';

  const time = document.createElement('div');
  time.className = 'scheduled-time';
  time.textContent = formatScheduledTime(tabData.scheduledTime);

  info.appendChild(title);
  info.appendChild(time);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => cancelScheduledTab(alarmId);

  item.appendChild(favicon);
  item.appendChild(info);
  item.appendChild(cancelBtn);

  return item;
}

// Format scheduled time for display
function formatScheduledTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = timestamp - now.getTime();

  // If in the past
  if (diffMs < 0) {
    return 'Past due';
  }

  // If less than 24 hours away
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

    if (hours === 0) {
      return `In ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `In ${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min`;
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

// Setup event listeners
function setupEventListeners() {
  document.getElementById('scheduleButton').addEventListener('click', scheduleTab);

  // Clear error on input change
  document.getElementById('scheduleTime').addEventListener('change', () => {
    clearError();
  });
}

// Set minimum datetime to current time + 1 minute
function setMinDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);

  // Format for datetime-local input: YYYY-MM-DDTHH:MM
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
  document.getElementById('scheduleTime').min = minDateTime;
}

// Schedule the current tab
async function scheduleTab() {
  try {
    const scheduleInput = document.getElementById('scheduleTime');
    const scheduleValue = scheduleInput.value;

    // Validate input
    if (!scheduleValue) {
      showError('Please select a date and time');
      return;
    }

    const scheduledTime = new Date(scheduleValue).getTime();
    const now = Date.now();

    if (scheduledTime <= now) {
      showError('Please select a future date and time');
      return;
    }

    if (!currentTab) {
      showError('No tab selected');
      return;
    }

    if (isInvalidUrl(currentTab.url)) {
      showError('Cannot schedule system tabs');
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
        url: currentTab.url,
        title: currentTab.title || 'Untitled',
        favIconUrl: currentTab.favIconUrl || 'icons/icon48.png'
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

    // Close current tab
    await chrome.tabs.remove(currentTab.id);

    // Show success notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Tab Scheduled',
      message: `Tab will reopen ${formatScheduledTime(scheduledTime)}`,
      priority: 1
    });

    // Close popup (tab is already closed)
    window.close();
  } catch (error) {
    console.error('Error scheduling tab:', error);
    showError('Failed to schedule tab. Please try again.');
  }
}

// Cancel a scheduled tab
async function cancelScheduledTab(alarmId) {
  try {
    // Clear alarm
    await chrome.alarms.clear(alarmId);

    // Remove from storage
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};
    const tabData = scheduledTabs[alarmId];
    delete scheduledTabs[alarmId];
    await chrome.storage.local.set({ scheduledTabs });

    // Reload list
    await loadScheduledTabs();

    // Show notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Schedule Cancelled',
      message: `Cancelled: ${tabData?.tabInfo?.title || 'Tab'}`,
      priority: 1
    });
  } catch (error) {
    console.error('Error cancelling scheduled tab:', error);
    showError('Failed to cancel scheduled tab');
  }
}

// Check if URL is invalid for scheduling
function isInvalidUrl(url) {
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

// Show error message
function showError(message) {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

// Clear error message
function clearError() {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = '';
  errorElement.style.display = 'none';
}
