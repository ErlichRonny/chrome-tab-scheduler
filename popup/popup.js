// Popup script for Tab Scheduler Chrome Extension

let currentTab = null;
let allScheduledTabs = {}; // Store all tabs for search/filter
let lastScheduledAction = null; // Store last action for undo
let undoTimeout = null; // Timeout for hiding undo toast

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  await loadTheme();
  await checkFirstTimeUser();
  await loadCurrentTab();
  await loadScheduledTabs();
  await loadCustomPresets();
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
      // Disable all quick schedule buttons
      document.querySelectorAll('.btn-quick').forEach(btn => btn.disabled = true);

      // Update UI to show system tab instead of "Loading..."
      // Use SVG gear icon as data URI for system tabs
      const gearIcon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%235f6368"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';

      document.getElementById('tabFavicon').src = gearIcon;
      document.getElementById('tabTitle').textContent = 'System Tab';
      document.getElementById('tabUrl').textContent = 'Cannot be scheduled';
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

    // Store globally for search
    allScheduledTabs = scheduledTabs;

    const listElement = document.getElementById('scheduledList');
    const searchContainer = document.getElementById('searchContainer');

    // Clear existing content
    listElement.innerHTML = '';

    const entries = Object.entries(scheduledTabs);

    // Show/hide search box based on number of tabs
    if (entries.length >= 3) {
      searchContainer.style.display = 'block';
    } else {
      searchContainer.style.display = 'none';
      document.getElementById('searchInput').value = ''; // Clear search when hidden
    }

    if (entries.length === 0) {
      listElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <div class="empty-state-title">No scheduled tabs yet</div>
          <div class="empty-state-message">
            Schedule a tab to have it reopen at a specific time.<br>
            Use quick buttons above or press <kbd>Ctrl+Shift+S</kbd>
          </div>
        </div>
      `;
      document.getElementById('searchResultsInfo').style.display = 'none';
      return;
    }

    // Sort by scheduled time (earliest first)
    entries.sort((a, b) => a[1].scheduledTime - b[1].scheduledTime);

    // Create list items
    entries.forEach(([alarmId, tabData]) => {
      const item = createScheduledTabItem(alarmId, tabData);
      listElement.appendChild(item);
    });

    // Update search results if there's an active search
    const searchValue = document.getElementById('searchInput').value;
    if (searchValue.trim()) {
      handleSearch();
    }
  } catch (error) {
    console.error('Error loading scheduled tabs:', error);
  }
}

// Create a scheduled tab list item
function createScheduledTabItem(alarmId, tabData) {
  const item = document.createElement('div');
  item.className = 'scheduled-item';
  item.setAttribute('data-alarm-id', alarmId);

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
  const recurBadge = tabData.recurrence ? '<span class="recurrence-badge">🔁</span>' : '';
  time.innerHTML = formatScheduledTime(tabData.scheduledTime) + recurBadge;

  info.appendChild(title);
  info.appendChild(time);

  const actions = document.createElement('div');
  actions.className = 'scheduled-item-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-edit';
  editBtn.textContent = 'Edit';
  editBtn.onclick = () => editScheduledTab(alarmId, tabData);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => cancelScheduledTab(alarmId);

  actions.appendChild(editBtn);
  actions.appendChild(cancelBtn);

  item.appendChild(favicon);
  item.appendChild(info);
  item.appendChild(actions);

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

  // Quick schedule buttons
  document.querySelectorAll('.btn-quick').forEach(button => {
    button.addEventListener('click', () => {
      const preset = button.getAttribute('data-preset');
      handleQuickSchedule(preset);
    });
  });

  // Custom preset buttons
  document.getElementById('addPresetBtn').addEventListener('click', showPresetForm);
  document.getElementById('cancelPresetBtn').addEventListener('click', hidePresetForm);
  document.getElementById('presetForm').addEventListener('submit', saveCustomPreset);

  // Delete modal buttons
  document.getElementById('cancelDeleteBtn').addEventListener('click', hideDeleteModal);
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

  // Edit modal buttons
  document.getElementById('cancelEditBtn').addEventListener('click', hideEditModal);
  document.getElementById('editScheduleForm').addEventListener('submit', confirmEdit);

  // Search functionality
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);

  // Keyboard shortcuts help
  document.getElementById('keyboardHelpBtn').addEventListener('click', showKeyboardHelp);
  document.getElementById('closeKeyboardHelpBtn').addEventListener('click', hideKeyboardHelp);

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', openSettings);

  // Onboarding
  document.getElementById('onboardingNext').addEventListener('click', nextOnboardingSlide);
  document.getElementById('onboardingSkip').addEventListener('click', skipOnboarding);
  document.getElementById('onboardingDone').addEventListener('click', finishOnboarding);

  // Onboarding dots
  document.querySelectorAll('.onboarding-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const slideNum = parseInt(dot.getAttribute('data-dot'));
      goToOnboardingSlide(slideNum);
    });
  });

  // Undo button
  document.getElementById('undoButton').addEventListener('click', undoSchedule);

  setupRecurrenceListeners();
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

// Handle quick schedule preset
async function handleQuickSchedule(preset) {
  const scheduledTime = calculatePresetTime(preset);

  if (!scheduledTime) {
    showError('Invalid preset');
    return;
  }

  await scheduleTabWithTime(scheduledTime);
}

// Calculate timestamp for preset
function calculatePresetTime(preset) {
  const now = new Date();
  let targetDate = new Date();

  switch (preset) {
    case '1hour':
      targetDate.setHours(now.getHours() + 1);
      break;

    case '3hours':
      targetDate.setHours(now.getHours() + 3);
      break;

    case 'tomorrow9am':
      targetDate.setDate(now.getDate() + 1);
      targetDate.setHours(9, 0, 0, 0);
      // If it's already past 9am today, this will be tomorrow at 9am
      break;

    case 'tomorrow2pm':
      targetDate.setDate(now.getDate() + 1);
      targetDate.setHours(14, 0, 0, 0);
      break;

    case 'nextMonday9am':
      // Calculate days until next Monday
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay);
      targetDate.setDate(now.getDate() + daysUntilMonday);
      targetDate.setHours(9, 0, 0, 0);
      break;

    case 'nextWeek':
      targetDate.setDate(now.getDate() + 7);
      // Keep same time as now
      break;

    default:
      return null;
  }

  return targetDate.getTime();
}

// Schedule the current tab (from manual input)
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

    await scheduleTabWithTime(scheduledTime);
  } catch (error) {
    console.error('Error scheduling tab:', error);
    showError('Failed to schedule tab. Please try again.');
  }
}

// Core scheduling logic (used by both manual and quick schedule)
async function scheduleTabWithTime(scheduledTime) {
  try {
    const now = Date.now();

    // Validate time
    if (scheduledTime <= now) {
      showError('Please select a future date and time');
      return;
    }

    // Validate current tab
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
    const recurrence = getRecurrenceData(scheduledTime);
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
    if (recurrence) tabData.recurrence = recurrence;

    // Send message to background script to schedule
    chrome.runtime.sendMessage({
      action: 'scheduleTab',
      alarmId: alarmId,
      scheduledTime: scheduledTime,
      tabData: tabData
    }, async (response) => {
      // Check for Chrome runtime errors
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        showError('Failed to schedule: ' + chrome.runtime.lastError.message);
        return;
      }

      try {
        if (!response || !response.success) {
          throw new Error(response?.error || 'Failed to schedule tab');
        }

        // Store info for undo
        lastScheduledAction = {
          alarmId: alarmId,
          tabData: tabData,
          tabId: currentTab.id
        };

        // Close current tab
        await chrome.tabs.remove(currentTab.id);

        // Show undo toast
        showUndoToast(`Tab scheduled for ${formatScheduledTime(scheduledTime)}`);

        // Close popup after 5 seconds (giving time to undo)
        setTimeout(() => {
          window.close();
        }, 5000);

      } catch (error) {
        console.error('Error scheduling tab:', error);
        console.error('Error stack:', error.stack);
        showError('Failed to schedule tab: ' + error.message);
      }
    });
  } catch (error) {
    console.error('Error scheduling tab:', error);
    showError('Failed to schedule tab. Please try again.');
  }
}

// Cancel a scheduled tab
function cancelScheduledTab(alarmId) {
  // Send message to background script to cancel
  chrome.runtime.sendMessage({
    action: 'cancelSchedule',
    alarmId: alarmId
  }, async (response) => {
    // Check for Chrome runtime errors
    if (chrome.runtime.lastError) {
      console.error('Runtime error:', chrome.runtime.lastError);
      showError('Failed to cancel: ' + chrome.runtime.lastError.message);
      return;
    }

    try {
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to cancel schedule');
      }

      // Reload list
      await loadScheduledTabs();

      // Show notification (non-blocking, don't fail if this errors)
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Schedule Cancelled',
        message: `Cancelled: ${response.tabData?.tabInfo?.title || 'Tab'}`,
        priority: 1
      }).catch(() => {});
    } catch (error) {
      console.error('Error cancelling scheduled tab:', error);
      console.error('Error stack:', error.stack);
      showError('Failed to cancel scheduled tab: ' + error.message);
    }
  });
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

// ============================================================================
// Custom Presets Functions
// ============================================================================

// Load and display custom presets
async function loadCustomPresets() {
  try {
    const result = await chrome.storage.local.get('customPresets');
    const customPresets = result.customPresets || [];

    const grid = document.getElementById('customPresetsGrid');

    // Clear existing buttons
    grid.innerHTML = '';

    if (customPresets.length === 0) {
      // Show empty state message
      grid.innerHTML = '<div class="empty-state-presets">Click + to add your first preset</div>';
      return;
    }

    // Add preset buttons
    customPresets.forEach(preset => {
      const button = createCustomPresetButton(preset);
      grid.appendChild(button);
    });
  } catch (error) {
    console.error('Error loading custom presets:', error);
  }
}

// Create a custom preset button element
function createCustomPresetButton(preset) {
  const button = document.createElement('button');
  button.className = 'btn-custom-preset';
  button.textContent = preset.name;
  button.setAttribute('data-preset-id', preset.id);

  // Add click handler for scheduling
  button.addEventListener('click', () => {
    handleCustomPresetClick(preset);
  });

  // Add delete button
  const deleteBtn = document.createElement('span');
  deleteBtn.className = 'delete-preset';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteCustomPreset(preset.id);
  });

  button.appendChild(deleteBtn);
  return button;
}

// Handle custom preset button click
async function handleCustomPresetClick(preset) {
  const scheduledTime = calculateCustomPresetTime(preset);
  await scheduleTabWithTime(scheduledTime);
}

// Calculate scheduled time from custom preset
function calculateCustomPresetTime(preset) {
  const now = new Date();
  const targetDate = new Date(now);

  // Add days ahead
  targetDate.setDate(now.getDate() + preset.daysAhead);

  // Set the time
  targetDate.setHours(preset.hour, preset.minute, 0, 0);

  // If the time has already passed today and daysAhead is 0, move to tomorrow
  if (preset.daysAhead === 0 && targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return targetDate.getTime();
}

// Show the preset form
function showPresetForm() {
  document.getElementById('presetFormSection').style.display = 'block';
  document.getElementById('presetName').focus();
}

// Hide the preset form
function hidePresetForm() {
  document.getElementById('presetFormSection').style.display = 'none';
  document.getElementById('presetForm').reset();
}

// Save a new custom preset
async function saveCustomPreset(e) {
  e.preventDefault();

  try {
    const name = document.getElementById('presetName').value.trim();
    const time = document.getElementById('presetTime').value;
    const daysAhead = parseInt(document.getElementById('presetDays').value);

    if (!name || !time) {
      showError('Please fill in all fields');
      return;
    }

    // Parse time
    const [hour, minute] = time.split(':').map(Number);

    // Create preset object
    const preset = {
      id: `preset_${Date.now()}`,
      name: name,
      hour: hour,
      minute: minute,
      daysAhead: daysAhead,
      createdAt: Date.now()
    };

    // Load existing presets
    const result = await chrome.storage.local.get('customPresets');
    const customPresets = result.customPresets || [];

    // Add new preset
    customPresets.push(preset);

    // Save to storage
    await chrome.storage.local.set({ customPresets });

    // Reload display
    await loadCustomPresets();

    // Hide form
    hidePresetForm();

  } catch (error) {
    console.error('Error saving custom preset:', error);
    showError('Failed to save preset');
  }
}

// Store preset ID for deletion
let presetToDelete = null;

// Delete a custom preset (shows confirmation modal)
async function deleteCustomPreset(presetId) {
  try {
    // Load existing presets to get the name
    const result = await chrome.storage.local.get('customPresets');
    const customPresets = result.customPresets || [];
    const preset = customPresets.find(p => p.id === presetId);

    if (!preset) {
      return;
    }

    // Store the preset ID for confirmation
    presetToDelete = presetId;

    // Show modal with preset name
    document.getElementById('presetNameToDelete').textContent = preset.name;
    showDeleteModal();
  } catch (error) {
    console.error('Error deleting custom preset:', error);
    showError('Failed to delete preset');
  }
}

// Show delete confirmation modal
function showDeleteModal() {
  document.getElementById('deleteModal').style.display = 'flex';
}

// Hide delete confirmation modal
function hideDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  presetToDelete = null;
}

// Confirm deletion (called when user clicks "Delete" in modal)
async function confirmDelete() {
  if (!presetToDelete) {
    return;
  }

  try {
    // Load existing presets
    const result = await chrome.storage.local.get('customPresets');
    const customPresets = result.customPresets || [];

    // Remove the preset
    const updatedPresets = customPresets.filter(p => p.id !== presetToDelete);

    // Save to storage
    await chrome.storage.local.set({ customPresets: updatedPresets });

    // Reload display
    await loadCustomPresets();

    // Hide modal
    hideDeleteModal();

  } catch (error) {
    console.error('Error confirming deletion:', error);
    showError('Failed to delete preset');
  }
}

// ============================================================================
// Edit Scheduled Tab Functions
// ============================================================================

// Store alarm ID and tab data for editing
let tabToEdit = null;

// Edit a scheduled tab (shows edit modal)
function editScheduledTab(alarmId, tabData) {
  try {
    // Store the tab to edit
    tabToEdit = { alarmId, tabData };

    // Populate modal with current info
    document.getElementById('editTabTitle').textContent = tabData.tabInfo.title || 'Untitled';

    // Set current scheduled time as default value
    const currentDate = new Date(tabData.scheduledTime);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    document.getElementById('editScheduleTime').value = currentDateTime;

    // Set minimum datetime to current time + 1 minute
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const minYear = now.getFullYear();
    const minMonth = String(now.getMonth() + 1).padStart(2, '0');
    const minDay = String(now.getDate()).padStart(2, '0');
    const minHours = String(now.getHours()).padStart(2, '0');
    const minMinutes = String(now.getMinutes()).padStart(2, '0');
    const minDateTime = `${minYear}-${minMonth}-${minDay}T${minHours}:${minMinutes}`;
    document.getElementById('editScheduleTime').min = minDateTime;

    // Clear any previous errors
    clearEditError();

    // Show modal
    showEditModal();
  } catch (error) {
    console.error('Error opening edit modal:', error);
    showError('Failed to open edit dialog');
  }
}

// Show edit modal
function showEditModal() {
  document.getElementById('editModal').style.display = 'flex';
}

// Hide edit modal
function hideEditModal() {
  document.getElementById('editModal').style.display = 'none';
  tabToEdit = null;
  clearEditError();
}

// Clear edit error message
function clearEditError() {
  const errorElement = document.getElementById('editErrorMessage');
  errorElement.textContent = '';
  errorElement.style.display = 'none';
}

// Show edit error message
function showEditError(message) {
  const errorElement = document.getElementById('editErrorMessage');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

// Confirm edit (called when user submits the edit form)
function confirmEdit(e) {
  e.preventDefault();

  if (!tabToEdit) {
    return;
  }

  const newTimeValue = document.getElementById('editScheduleTime').value;

  if (!newTimeValue) {
    showEditError('Please select a date and time');
    return;
  }

  const newScheduledTime = new Date(newTimeValue).getTime();
  const now = Date.now();

  // Validate time
  if (newScheduledTime <= now) {
    showEditError('Please select a future date and time');
    return;
  }

  const { alarmId: oldAlarmId, tabData } = tabToEdit;

  // Generate new alarm ID with new timestamp
  const randomId = Math.random().toString(36).substring(2, 8);
  const newAlarmId = `alarm_${newScheduledTime}_${randomId}`;

  // Update tab data with new scheduled time and alarm ID
  const updatedTabData = {
    ...tabData,
    alarmId: newAlarmId,
    scheduledTime: newScheduledTime
  };

  // Send message to background script to edit schedule
  chrome.runtime.sendMessage({
    action: 'editSchedule',
    oldAlarmId: oldAlarmId,
    newAlarmId: newAlarmId,
    newScheduledTime: newScheduledTime,
    tabData: updatedTabData
  }, async (response) => {
    // Check for Chrome runtime errors
    if (chrome.runtime.lastError) {
      console.error('Runtime error:', chrome.runtime.lastError);
      showEditError('Failed to update schedule: ' + chrome.runtime.lastError.message);
      return;
    }

    try {
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to update schedule');
      }

      // Reload scheduled tabs list
      await loadScheduledTabs();

      // Hide modal
      hideEditModal();

      // Show notification (non-blocking, don't fail if this errors)
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Schedule Updated',
        message: `"${tabData.tabInfo.title}" will now reopen ${formatScheduledTime(newScheduledTime)}`,
        priority: 1
      }).catch(() => {});
    } catch (error) {
      console.error('Error updating schedule:', error);
      console.error('Error stack:', error.stack);
      showEditError('Failed to update schedule: ' + error.message);
    }
  });
}

// ============================================================================
// Search/Filter Functions
// ============================================================================

// Handle search input
function handleSearch() {
  const searchValue = document.getElementById('searchInput').value.toLowerCase().trim();
  const listElement = document.getElementById('scheduledList');
  const resultsInfo = document.getElementById('searchResultsInfo');

  // If search is empty, show all tabs
  if (!searchValue) {
    const allItems = listElement.querySelectorAll('.scheduled-item');
    allItems.forEach(item => {
      item.style.display = 'flex';
    });
    resultsInfo.style.display = 'none';
    return;
  }

  // Filter tabs
  const entries = Object.entries(allScheduledTabs);
  let visibleCount = 0;

  entries.forEach(([alarmId, tabData]) => {
    const item = listElement.querySelector(`[data-alarm-id="${alarmId}"]`);
    if (!item) return;

    const title = (tabData.tabInfo.title || '').toLowerCase();
    const url = (tabData.tabInfo.url || '').toLowerCase();

    // Check if search term matches title or URL
    if (title.includes(searchValue) || url.includes(searchValue)) {
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });

  // Show results info
  const totalCount = entries.length;
  if (visibleCount === 0) {
    resultsInfo.textContent = 'No tabs found';
    resultsInfo.style.display = 'block';
  } else if (visibleCount < totalCount) {
    resultsInfo.textContent = `Showing ${visibleCount} of ${totalCount} tabs`;
    resultsInfo.style.display = 'block';
  } else {
    resultsInfo.style.display = 'none';
  }
}

// Clear search
function clearSearch() {
  document.getElementById('searchInput').value = '';
  handleSearch();
  document.getElementById('searchInput').focus();
}

// ============================================================================
// Keyboard Shortcuts Help
// ============================================================================

// Show keyboard shortcuts help modal
function showKeyboardHelp() {
  document.getElementById('keyboardHelpModal').style.display = 'flex';
}

// Hide keyboard shortcuts help modal
function hideKeyboardHelp() {
  document.getElementById('keyboardHelpModal').style.display = 'none';
}

// Open settings page
function openSettings() {
  chrome.tabs.create({ url: 'settings.html' });
}

// Load and apply theme from settings
async function loadTheme() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || { theme: 'auto' };
    applyTheme(settings.theme);
  } catch (error) {
    console.error('Error loading theme:', error);
  }
}

// Apply theme to popup
function applyTheme(theme) {
  const html = document.documentElement;
  
  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.removeAttribute('data-theme');
  }
}

// ============================================================================
// Onboarding Functions
// ============================================================================

let currentOnboardingSlide = 1;
const totalOnboardingSlides = 4;

// Check if this is the first time the user is opening the popup
async function checkFirstTimeUser() {
  try {
    const result = await chrome.storage.local.get('hasSeenOnboarding');
    if (!result.hasSeenOnboarding) {
      showOnboarding();
    }
  } catch (error) {
    console.error('Error checking first time user:', error);
  }
}

// Show onboarding modal
function showOnboarding() {
  currentOnboardingSlide = 1;
  document.getElementById('onboardingModal').style.display = 'flex';
  goToOnboardingSlide(1);
}

// Navigate to specific slide
function goToOnboardingSlide(slideNum) {
  currentOnboardingSlide = slideNum;

  // Hide all slides
  document.querySelectorAll('.onboarding-slide').forEach(slide => {
    slide.style.display = 'none';
  });

  // Show current slide
  const currentSlide = document.querySelector(`.onboarding-slide[data-slide="${slideNum}"]`);
  if (currentSlide) {
    currentSlide.style.display = 'block';
  }

  // Update dots
  document.querySelectorAll('.onboarding-dot').forEach(dot => {
    dot.classList.remove('active');
    if (parseInt(dot.getAttribute('data-dot')) === slideNum) {
      dot.classList.add('active');
    }
  });

  // Update buttons
  if (slideNum === totalOnboardingSlides) {
    document.getElementById('onboardingNext').style.display = 'none';
    document.getElementById('onboardingDone').style.display = 'block';
  } else {
    document.getElementById('onboardingNext').style.display = 'block';
    document.getElementById('onboardingDone').style.display = 'none';
  }
}

// Next slide
function nextOnboardingSlide() {
  if (currentOnboardingSlide < totalOnboardingSlides) {
    goToOnboardingSlide(currentOnboardingSlide + 1);
  }
}

// Skip onboarding
async function skipOnboarding() {
  await finishOnboarding();
}

// Finish onboarding
async function finishOnboarding() {
  try {
    await chrome.storage.local.set({ hasSeenOnboarding: true });
    document.getElementById('onboardingModal').style.display = 'none';
  } catch (error) {
    console.error('Error finishing onboarding:', error);
  }
}

// ============================================================================
// Undo Functionality
// ============================================================================

// Show undo toast notification
function showUndoToast(message) {
  const toast = document.getElementById('undoToast');
  const messageEl = document.getElementById('undoToastMessage');
  const progressEl = document.getElementById('undoProgress');

  messageEl.textContent = message;
  toast.style.display = 'block';

  // Reset progress bar animation
  progressEl.style.animation = 'none';
  setTimeout(() => {
    progressEl.style.animation = 'progressBar 5s linear';
  }, 10);

  // Clear existing timeout
  if (undoTimeout) {
    clearTimeout(undoTimeout);
  }

  // Hide toast after 5 seconds
  undoTimeout = setTimeout(() => {
    hideUndoToast();
    lastScheduledAction = null; // Clear after timeout
  }, 5000);
}

// Hide undo toast
function hideUndoToast() {
  document.getElementById('undoToast').style.display = 'none';
}

// Undo the last scheduling action
async function undoSchedule() {
  if (!lastScheduledAction) {
    return;
  }

  try {
    const { alarmId, tabData } = lastScheduledAction;

    // Send message to background to cancel the schedule
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'cancelSchedule',
        alarmId: alarmId
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to undo');
    }

    // Reopen the tab
    await chrome.tabs.create({
      url: tabData.tabInfo.url,
      active: true
    });

    // Hide toast
    hideUndoToast();
    clearTimeout(undoTimeout);

    // Clear the action
    lastScheduledAction = null;

    // Show success message
    const messageEl = document.getElementById('undoToastMessage');
    messageEl.textContent = 'Schedule cancelled, tab reopened';
    document.getElementById('undoToast').style.display = 'block';

    setTimeout(() => {
      hideUndoToast();
      window.close();
    }, 2000);

  } catch (error) {
    console.error('Error undoing schedule:', error);
    showError('Failed to undo: ' + error.message);
  }
}

// ============================================================
// Recurrence Panel Logic
// ============================================================

function setupRecurrenceListeners() {
  const toggle = document.getElementById('recurrenceToggle');
  const panel = document.getElementById('recurrencePanel');
  const daysRow = document.getElementById('recurrenceDaysRow');
  const endDateInput = document.getElementById('recurrenceEndDate');

  // Show/hide panel when toggle changes
  toggle.addEventListener('change', () => {
    panel.style.display = toggle.checked ? 'flex' : 'none';
  });

  // Show/hide custom days row based on pattern selection
  document.querySelectorAll('input[name="recurrencePattern"]').forEach(radio => {
    radio.addEventListener('change', () => {
      daysRow.style.display = radio.value === 'custom' ? 'flex' : 'none';
    });
  });

  // Toggle day pill selection
  document.querySelectorAll('.day-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('selected');
    });
  });

  // Show/hide end date input based on end selection
  document.querySelectorAll('input[name="recurrenceEnd"]').forEach(radio => {
    radio.addEventListener('change', () => {
      endDateInput.style.display = radio.value === 'date' ? 'inline-block' : 'none';
    });
  });
}

// Read recurrence fields from panel; returns null if toggle is off
function getRecurrenceData(scheduledTime) {
  const toggle = document.getElementById('recurrenceToggle');
  if (!toggle.checked) return null;

  const pattern = document.querySelector('input[name="recurrencePattern"]:checked').value;

  // Collect selected days for custom pattern
  let days = [];
  if (pattern === 'custom') {
    document.querySelectorAll('.day-pill.selected').forEach(pill => {
      days.push(parseInt(pill.dataset.day));
    });
    if (days.length === 0) {
      // Default to the day of the scheduled date if nothing selected
      days = [new Date(scheduledTime).getDay()];
    }
  } else if (pattern === 'weekly') {
    // For weekly, store the day of week derived from the scheduled date
    days = [new Date(scheduledTime).getDay()];
  }

  // End date
  const endRadio = document.querySelector('input[name="recurrenceEnd"]:checked').value;
  let endDate = null;
  if (endRadio === 'date') {
    const dateVal = document.getElementById('recurrenceEndDate').value;
    if (dateVal) {
      endDate = new Date(dateVal + 'T23:59:59').getTime();
    }
  }

  // Extract time as HH:MM from the scheduled timestamp
  const d = new Date(scheduledTime);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return { pattern, days, time, endDate };
}
